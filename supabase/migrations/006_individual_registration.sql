
-- =============================================
-- COMMUNITY ATLAS
-- STEP 8.1 - INDIVIDUAL REGISTRATION
-- Depends on migrations 001 through 005
-- =============================================

BEGIN;

-- ---------------------------------------------
-- 1. OPTIONAL GENDER FIELD
-- ---------------------------------------------

ALTER TABLE public.individuals
ADD COLUMN IF NOT EXISTS gender text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.individuals'::regclass
      AND conname = 'individuals_gender_check'
  ) THEN
    ALTER TABLE public.individuals
    ADD CONSTRAINT individuals_gender_check
    CHECK (
      gender IS NULL
      OR gender IN (
        'male',
        'female',
        'other',
        'prefer_not_to_say'
      )
    );
  END IF;
END;
$$;


-- ---------------------------------------------
-- 2. ENSURE PERSON SEQUENCE EXISTS
-- ---------------------------------------------

DO $$
BEGIN
  IF to_regclass(
    'public.community_person_seq'
  ) IS NULL THEN
    RAISE EXCEPTION
      'Migration 004 is required before 006';
  END IF;
END;
$$;

-- Align the sequence with any existing numeric
-- codes inserted manually before Step 8.
-- Run migrations while application writes are
-- paused to avoid concurrent code creation.

DO $$
DECLARE
  v_highest bigint;
  v_last bigint;
  v_called boolean;
BEGIN
  SELECT COALESCE(
    MAX(
      substring(
        person_code FROM '^P-([0-9]+)$'
      )::bigint
    ),
    0
  )
  INTO v_highest
  FROM public.individuals
  WHERE person_code ~ '^P-[0-9]+$';

  SELECT last_value, is_called
  INTO v_last, v_called
  FROM public.community_person_seq;

  IF v_highest > v_last
     OR (
       v_highest = v_last
       AND NOT v_called
     ) THEN
    PERFORM setval(
      'public.community_person_seq'::regclass,
      v_highest,
      true
    );
  END IF;
END;
$$;

GRANT USAGE ON SEQUENCE
  public.community_person_seq
TO authenticated;


-- ---------------------------------------------
-- 3. DATABASE INDEX
-- ---------------------------------------------

CREATE INDEX IF NOT EXISTS
  idx_individuals_active_family
ON public.individuals (family_id)
WHERE is_archived = false;


-- ---------------------------------------------
-- 4. ADDITIONAL INSERT PROTECTION
-- ---------------------------------------------

-- This RESTRICTIVE RLS policy is combined
-- with existing permissive INSERT policies.
-- An authenticated user must be approved,
-- have editing permission and choose an
-- active family at an active location.

ALTER TABLE public.individuals
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  individuals_insert_active_family_guard
ON public.individuals;

CREATE POLICY
  individuals_insert_active_family_guard
ON public.individuals
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT private.can_edit())
  AND EXISTS (
    SELECT 1
    FROM public.families f
    JOIN public.locations l
      ON l.id = f.location_id
    WHERE f.id = family_id
      AND f.is_archived = false
      AND l.is_archived = false
  )
);


-- ---------------------------------------------
-- 5. REGISTER INDIVIDUAL FUNCTION
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION
public.register_individual(
  p_family_id uuid,
  p_full_name text,
  p_date_of_birth date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_relationship_to_head text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_head boolean DEFAULT false
)

RETURNS jsonb

LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''

AS $$
DECLARE
  v_family_id uuid;
  v_family_code text;
  v_family_name text;

  v_person_id uuid;
  v_person_code text;

  v_full_name text;
  v_relationship text;
  v_gender text;

  v_member_count integer;
  v_head_count integer;

  v_make_head boolean;
BEGIN

  -- ==========================================
  -- 1. VERIFY PERMISSIONS
  -- ==========================================

  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'Only approved Administrators and Editors can register individuals'
      USING ERRCODE = '42501';
  END IF;


  -- ==========================================
  -- 2. VALIDATE PERSONAL INFORMATION
  -- ==========================================

  v_full_name :=
    btrim(coalesce(p_full_name, ''));

  IF char_length(v_full_name) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION
      'Full name must contain 2 to 150 characters';
  END IF;

  v_make_head := coalesce(p_is_head, false);

  v_relationship :=
    NULLIF(
      btrim(
        coalesce(p_relationship_to_head, '')
      ),
      ''
    );

  IF v_make_head AND v_relationship IS NULL THEN
    v_relationship := 'Head';
  END IF;

  IF char_length(
    coalesce(v_relationship, '')
  ) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION
      'Relationship must contain 2 to 100 characters';
  END IF;

  IF p_date_of_birth IS NOT NULL
     AND p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION
      'Date of birth cannot be in the future';
  END IF;

  IF char_length(coalesce(p_phone, '')) > 30 THEN
    RAISE EXCEPTION
      'Phone number cannot exceed 30 characters';
  END IF;

  IF char_length(coalesce(p_notes, '')) > 2000 THEN
    RAISE EXCEPTION
      'Notes cannot exceed 2000 characters';
  END IF;

  v_gender :=
    NULLIF(
      lower(btrim(coalesce(p_gender, ''))),
      ''
    );

  IF v_gender IS NOT NULL
     AND v_gender NOT IN (
       'male',
       'female',
       'other',
       'prefer_not_to_say'
     ) THEN
    RAISE EXCEPTION 'Invalid gender option';
  END IF;


  -- ==========================================
  -- 3. VALIDATE THE SELECTED FAMILY
  -- ==========================================

  -- Lock the family for the duration of
  -- registration. This protects concurrent
  -- registrations within this workflow.

  SELECT
    f.id,
    f.family_code,
    f.family_name
  INTO
    v_family_id,
    v_family_code,
    v_family_name
  FROM public.families f
  JOIN public.locations l
    ON l.id = f.location_id
  WHERE f.id = p_family_id
    AND f.is_archived = false
    AND l.is_archived = false
  FOR UPDATE OF f;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION
      'The selected family is unavailable or archived';
  END IF;


  -- ==========================================
  -- 4. VALIDATE FAMILY MEMBERSHIP
  -- ==========================================

  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE is_head = true
    )::integer
  INTO
    v_member_count,
    v_head_count
  FROM public.individuals
  WHERE family_id = v_family_id
    AND is_archived = false;

  IF v_member_count >= 25 THEN
    RAISE EXCEPTION
      'This family already has 25 active members';
  END IF;

  IF v_head_count > 1 THEN
    RAISE EXCEPTION
      'Family has multiple active heads. Correct the existing records first';
  END IF;

  IF v_head_count > 0 AND v_make_head THEN
    RAISE EXCEPTION
      'This family already has a head of family';
  END IF;

  IF v_head_count = 0 AND NOT v_make_head THEN
    RAISE EXCEPTION
      'No family head exists. Select this person as head of family';
  END IF;


  -- ==========================================
  -- 5. GENERATE PERSON CODE
  -- ==========================================

  v_person_code :=
    'P-' || lpad(
      nextval(
        'public.community_person_seq'::regclass
      )::text,
      6,
      '0'
    );


  -- ==========================================
  -- 6. SAVE INDIVIDUAL
  -- ==========================================

  INSERT INTO public.individuals (
    person_code,
    family_id,
    full_name,
    date_of_birth,
    gender,
    relationship_to_head,
    is_head,
    phone,
    notes,
    is_archived
  )
  VALUES (
    v_person_code,
    v_family_id,
    v_full_name,
    p_date_of_birth,
    v_gender,
    v_relationship,
    v_make_head,
    NULLIF(btrim(coalesce(p_phone, '')), ''),
    NULLIF(btrim(coalesce(p_notes, '')), ''),
    false
  )
  RETURNING id INTO v_person_id;


  -- ==========================================
  -- 7. RETURN SUCCESS DATA
  -- ==========================================

  RETURN jsonb_build_object(
    'person_id', v_person_id,
    'person_code', v_person_code,
    'full_name', v_full_name,
    'family_id', v_family_id,
    'family_code', v_family_code,
    'family_name', v_family_name,
    'is_head', v_make_head
  );

END;
$$;


-- ---------------------------------------------
-- 6. API EXECUTION PERMISSIONS
-- ---------------------------------------------

REVOKE ALL ON FUNCTION
public.register_individual(
  uuid, text, date, text,
  text, text, text, boolean
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.register_individual(
  uuid, text, date, text,
  text, text, text, boolean
)
TO authenticated;

COMMIT;
