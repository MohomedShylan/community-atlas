
-- ================================================
-- COMMUNITY ATLAS
-- STEP 11.3 - OFFLINE INDIVIDUAL EDIT SYNC
--
-- Requires:
-- profiles approval_status from Step 10
-- individuals from Step 8
-- private schema
--
-- Run in staging first.
-- ================================================

BEGIN;

-- ================================================
-- 1. RECORD VERSIONING
-- ================================================

ALTER TABLE public.individuals
ADD COLUMN IF NOT EXISTS
  offline_version bigint NOT NULL DEFAULT 1;

-- Increment on every individual UPDATE,
-- including online edits, transfers, and
-- lifecycle changes.
--
-- This ensures offline edits detect changes
-- made through earlier Community Atlas RPCs.

CREATE OR REPLACE FUNCTION
private.bump_individual_offline_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.offline_version :=
    OLD.offline_version + 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_015_individual_version
ON public.individuals;

CREATE TRIGGER trg_015_individual_version
BEFORE UPDATE ON public.individuals
FOR EACH ROW
EXECUTE FUNCTION
  private.bump_individual_offline_version();

REVOKE ALL ON FUNCTION
private.bump_individual_offline_version()
FROM PUBLIC, anon, authenticated;


-- ================================================
-- 2. PRIVATE OPERATION RECEIPTS
-- ================================================

-- Receipts prevent a successful operation
-- from being applied twice after retries.
--
-- No names, phone numbers, notes or full
-- edit payloads are stored here.

CREATE TABLE IF NOT EXISTS
private.offline_person_receipts (
  operation_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  person_id uuid NOT NULL,
  result_version bigint NOT NULL,
  response jsonb NOT NULL,
  processed_at timestamptz NOT NULL
    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
idx_015_offline_receipts_actor
ON private.offline_person_receipts (
  actor_id,
  processed_at DESC
);

ALTER TABLE private.offline_person_receipts
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
private.offline_person_receipts
FROM PUBLIC, anon, authenticated;


-- ================================================
-- 3. PRIVATE AUTHORIZED SYNC IMPLEMENTATION
-- ================================================

CREATE OR REPLACE FUNCTION
private.sync_offline_person_edit_impl(
  p_operation_id uuid,
  p_person_id uuid,
  p_expected_version bigint,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_existing record;
  v_person public.individuals%ROWTYPE;

  v_name text;
  v_date_of_birth date;
  v_gender text;
  v_relationship text;
  v_phone text;
  v_notes text;

  v_new_version bigint;
  v_result jsonb;
BEGIN

  -- ============================================
  -- AUTHENTICATION / CURRENT ROLE
  -- ============================================

  v_actor := (SELECT auth.uid());

  IF v_actor IS NULL THEN
    RAISE EXCEPTION
      'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Hold a shared lock on the profile during
  -- this transaction so a simultaneous role
  -- change/suspension cannot proceed midway.

  PERFORM 1
  FROM public.profiles p
  WHERE p.id = v_actor
    AND p.is_active = true
    AND p.approval_status = 'approved'
    AND p.role::text IN ('admin', 'editor')
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Active Administrator or Editor permission required'
      USING ERRCODE = '42501';
  END IF;

  -- ============================================
  -- REQUEST VALIDATION
  -- ============================================

  IF p_operation_id IS NULL
     OR p_person_id IS NULL
     OR p_expected_version IS NULL
     OR p_expected_version < 1 THEN

    RAISE EXCEPTION
      'Invalid offline synchronization request';
  END IF;

  IF p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION
      'Offline payload must be an object';
  END IF;

  IF NOT (
    p_payload ?& ARRAY[
      'full_name',
      'date_of_birth',
      'gender',
      'relationship_to_head',
      'phone',
      'notes'
    ]
  ) THEN
    RAISE EXCEPTION
      'Offline payload is missing required fields';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_payload) AS x(k)
    WHERE x.k NOT IN (
      'full_name',
      'date_of_birth',
      'gender',
      'relationship_to_head',
      'phone',
      'notes'
    )
  ) THEN
    RAISE EXCEPTION
      'Offline payload contains unsupported fields';
  END IF;

  -- Serialize retries of the same operation.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_operation_id::text,
      0
    )
  );

  -- Check receipt after acquiring the lock.
  SELECT
    r.actor_id,
    r.person_id,
    r.response
  INTO v_existing
  FROM private.offline_person_receipts r
  WHERE r.operation_id = p_operation_id;

  IF FOUND THEN

    IF v_existing.actor_id <> v_actor
       OR v_existing.person_id <> p_person_id THEN
      RAISE EXCEPTION
        'Operation ID belongs to another request'
        USING ERRCODE = '42501';
    END IF;

    RETURN v_existing.response ||
      jsonb_build_object(
        'status', 'duplicate'
      );
  END IF;

  -- ============================================
  -- VALIDATE PERSON VALUES
  -- ============================================

  v_name := btrim(
    coalesce(p_payload->>'full_name', '')
  );

  v_gender := nullif(
    lower(btrim(
      coalesce(p_payload->>'gender', '')
    )),
    ''
  );

  v_relationship := nullif(
    btrim(coalesce(
      p_payload->>'relationship_to_head',
      ''
    )),
    ''
  );

  v_phone := nullif(
    btrim(coalesce(p_payload->>'phone', '')),
    ''
  );

  v_notes := nullif(
    btrim(coalesce(p_payload->>'notes', '')),
    ''
  );

  IF char_length(v_name) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION
      'Full name must contain 2 to 150 characters';
  END IF;

  IF char_length(
    coalesce(v_relationship, '')
  ) > 100 THEN
    RAISE EXCEPTION
      'Relationship is too long';
  END IF;

  IF char_length(
    coalesce(v_phone, '')
  ) > 30 THEN
    RAISE EXCEPTION
      'Phone number is too long';
  END IF;

  IF char_length(
    coalesce(v_notes, '')
  ) > 2000 THEN
    RAISE EXCEPTION
      'Notes are too long';
  END IF;

  IF v_gender IS NOT NULL
     AND v_gender NOT IN (
       'male',
       'female',
       'other',
       'prefer_not_to_say'
     ) THEN
    RAISE EXCEPTION
      'Invalid gender value';
  END IF;

  v_date_of_birth := nullif(
    p_payload->>'date_of_birth',
    ''
  )::date;

  IF v_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION
      'Date of birth cannot be in the future';
  END IF;

  -- ============================================
  -- LOCK THE INDIVIDUAL
  -- ============================================

  SELECT i.*
  INTO v_person
  FROM public.individuals i
  JOIN public.families f
    ON f.id = i.family_id
  JOIN public.locations l
    ON l.id = f.location_id

  WHERE i.id = p_person_id
    AND i.is_archived = false
    AND f.is_archived = false
    AND l.is_archived = false

  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Individual or household is no longer active';
  END IF;

  -- ============================================
  -- OPTIMISTIC CONFLICT DETECTION
  -- ============================================

  IF v_person.offline_version
     <> p_expected_version THEN

    RETURN jsonb_build_object(
      'status', 'conflict',
      'person_id', p_person_id,
      'server_version',
        v_person.offline_version,
      'expected_version',
        p_expected_version
    );

  END IF;

  -- ============================================
  -- PERFORM AUTHORIZED UPDATE
  -- ============================================

  UPDATE public.individuals
  SET
    full_name = v_name,

    date_of_birth = v_date_of_birth,

    gender = v_gender,

    relationship_to_head =
      CASE
        WHEN v_person.is_head
          THEN v_person.relationship_to_head
        ELSE v_relationship
      END,

    phone = v_phone,
    notes = v_notes

  WHERE id = p_person_id

  RETURNING offline_version
  INTO v_new_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Offline edit could not be applied';
  END IF;

  v_result := jsonb_build_object(
    'status', 'applied',
    'person_id', p_person_id,
    'new_version', v_new_version,
    'operation_id', p_operation_id
  );

  -- Persist receipt atomically with the edit.
  INSERT INTO private.offline_person_receipts (
    operation_id,
    actor_id,
    person_id,
    result_version,
    response
  )
  VALUES (
    p_operation_id,
    v_actor,
    p_person_id,
    v_new_version,
    v_result
  );

  RETURN v_result;

END;
$$;


-- ================================================
-- 4. PUBLIC SECURITY-INVOKER WRAPPER
-- ================================================

CREATE OR REPLACE FUNCTION
public.sync_offline_person_edit(
  p_operation_id uuid,
  p_person_id uuid,
  p_expected_version bigint,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.sync_offline_person_edit_impl(
    p_operation_id,
    p_person_id,
    p_expected_version,
    p_payload
  );
$$;


-- ================================================
-- 5. EXECUTION PRIVILEGES
-- ================================================

-- The private schema must NOT be exposed
-- in Supabase Data API settings.

GRANT USAGE ON SCHEMA private
TO authenticated;

REVOKE ALL ON FUNCTION
private.sync_offline_person_edit_impl(
  uuid, uuid, bigint, jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
private.sync_offline_person_edit_impl(
  uuid, uuid, bigint, jsonb
)
TO authenticated;

REVOKE ALL ON FUNCTION
public.sync_offline_person_edit(
  uuid, uuid, bigint, jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.sync_offline_person_edit(
  uuid, uuid, bigint, jsonb
)
TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
