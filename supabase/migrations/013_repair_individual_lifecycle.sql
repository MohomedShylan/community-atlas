
-- ============================================
-- COMMUNITY ATLAS
-- MIGRATION 013
-- Repair missing Step 8.3 functions
--
-- Requires:
-- private.can_edit()
-- private.is_admin()
-- Existing families, locations,
-- individuals tables.
--
-- Run on a backed-up database.
-- ============================================

BEGIN;

-- ============================================
-- 1. PRESERVE HOUSEHOLD LINK PROTECTION
--    WHILE ALLOWING ADMIN TRANSFERS
-- ============================================

CREATE OR REPLACE FUNCTION
private.protect_household_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_family_count integer;
  v_member_count integer;
BEGIN

  -- Record IDs cannot be changed.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION
      'Record ID cannot be changed';
  END IF;

  -- ----------------------------------------
  -- LOCATIONS
  -- ----------------------------------------

  IF TG_TABLE_NAME = 'locations' THEN

    IF NEW.location_code IS DISTINCT FROM
       OLD.location_code THEN
      RAISE EXCEPTION
        'Location code cannot be changed';
    END IF;

    IF NEW.is_archived
       AND NOT OLD.is_archived
       AND EXISTS (
         SELECT 1
         FROM public.families f
         WHERE f.location_id = OLD.id
           AND f.is_archived = false
       ) THEN

      RAISE EXCEPTION
        'Cannot archive a location with active families';

    END IF;

  -- ----------------------------------------
  -- FAMILIES
  -- ----------------------------------------

  ELSIF TG_TABLE_NAME = 'families' THEN

    IF NEW.family_code IS DISTINCT FROM
       OLD.family_code
       OR NEW.location_id IS DISTINCT FROM
       OLD.location_id THEN

      RAISE EXCEPTION
        'Family code and location link cannot be reassigned';

    END IF;

  -- ----------------------------------------
  -- INDIVIDUALS
  -- ----------------------------------------

  ELSIF TG_TABLE_NAME = 'individuals' THEN

    -- Preserve the permanent person code.
    IF NEW.person_code IS DISTINCT FROM
       OLD.person_code THEN

      RAISE EXCEPTION
        'Person code cannot be changed';

    END IF;

    -- Only Administrators can change a
    -- person's active/archive status.
    IF NEW.is_archived IS DISTINCT FROM
       OLD.is_archived THEN

      IF NOT COALESCE(
        (SELECT private.is_admin()),
        false
      ) THEN

        RAISE EXCEPTION
          'Only Administrators can archive or restore individuals'
          USING ERRCODE = '42501';

      END IF;

    END IF;

    -- Archived individuals cannot be heads.
    IF NEW.is_archived AND NEW.is_head THEN
      RAISE EXCEPTION
        'An archived individual cannot be a family head';
    END IF;

    -- --------------------------------------
    -- FAMILY TRANSFER
    -- --------------------------------------

    IF NEW.family_id IS DISTINCT FROM
       OLD.family_id THEN

      IF NOT COALESCE(
        (SELECT private.is_admin()),
        false
      ) THEN

        RAISE EXCEPTION
          'Only Administrators can transfer individuals'
          USING ERRCODE = '42501';

      END IF;

      -- An active head must remain in
      -- their current family until replaced.
      IF OLD.is_head OR NEW.is_head THEN
        RAISE EXCEPTION
          'Change the family head before transferring this person';
      END IF;

      IF OLD.is_archived OR NEW.is_archived THEN
        RAISE EXCEPTION
          'Archived individuals cannot be transferred';
      END IF;

      -- Both families and their locations
      -- must remain active.
      SELECT count(*)::integer
      INTO v_family_count
      FROM public.families f
      JOIN public.locations l
        ON l.id = f.location_id
      WHERE f.id IN (
        OLD.family_id,
        NEW.family_id
      )
        AND f.is_archived = false
        AND l.is_archived = false;

      IF v_family_count <> 2 THEN
        RAISE EXCEPTION
          'Source and destination families must both be active';
      END IF;

      SELECT count(*)::integer
      INTO v_member_count
      FROM public.individuals
      WHERE family_id = NEW.family_id
        AND is_archived = false;

      IF v_member_count >= 25 THEN
        RAISE EXCEPTION
          'Destination family already has 25 active members';
      END IF;

    END IF;

    -- --------------------------------------
    -- RESTORATION SAFETY
    -- --------------------------------------

    IF OLD.is_archived
       AND NOT NEW.is_archived THEN

      IF NOT EXISTS (
        SELECT 1
        FROM public.families f
        JOIN public.locations l
          ON l.id = f.location_id
        WHERE f.id = NEW.family_id
          AND f.is_archived = false
          AND l.is_archived = false
      ) THEN

        RAISE EXCEPTION
          'Restore the household before restoring its members';

      END IF;

      SELECT count(*)::integer
      INTO v_member_count
      FROM public.individuals
      WHERE family_id = NEW.family_id
        AND is_archived = false;

      IF v_member_count >= 25 THEN
        RAISE EXCEPTION
          'Family already contains 25 active members';
      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;
$$;


-- ============================================
-- 2. ENSURE ONE ACTIVE FAMILY HEAD
-- ============================================

-- The unique index prevents two active heads.
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_013_one_active_family_head
ON public.individuals (family_id)
WHERE is_head = true
  AND is_archived = false;


-- This deferred constraint prevents zero
-- active heads after the transaction completes.
--
-- It permits temporarily clearing a head
-- inside an atomic head-change operation.

CREATE OR REPLACE FUNCTION
private.assert_active_family_head()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_old_family_id uuid;
  v_new_family_id uuid;
  v_family_id uuid;
  v_head_count integer;
BEGIN

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_family_id := OLD.family_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_family_id := NEW.family_id;
  END IF;

  FOR v_family_id IN

    SELECT DISTINCT x.family_id
    FROM (
      VALUES
        (v_old_family_id),
        (v_new_family_id)
    ) AS x(family_id)
    WHERE x.family_id IS NOT NULL

  LOOP

    IF EXISTS (
      SELECT 1
      FROM public.families f
      WHERE f.id = v_family_id
        AND f.is_archived = false
    ) THEN

      SELECT count(*)::integer
      INTO v_head_count
      FROM public.individuals
      WHERE family_id = v_family_id
        AND is_archived = false
        AND is_head = true;

      IF v_head_count <> 1 THEN

        RAISE EXCEPTION
          'Active family % must have exactly one active head',
          v_family_id;

      END IF;

    END IF;

  END LOOP;

  RETURN NULL;

END;
$$;

DROP TRIGGER IF EXISTS
  trg_013_family_head_check
ON public.individuals;

CREATE CONSTRAINT TRIGGER
  trg_013_family_head_check
AFTER INSERT OR UPDATE OR DELETE
ON public.individuals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION
  private.assert_active_family_head();


-- ============================================
-- 3. SET FAMILY HEAD
-- ============================================

CREATE OR REPLACE FUNCTION
public.set_family_head(
  p_family_id uuid,
  p_new_head_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_head_count integer;
BEGIN

  -- PERMISSIONS
  IF NOT COALESCE(
    (SELECT private.can_edit()),
    false
  ) THEN

    RAISE EXCEPTION
      'Only Administrators and Editors can change the family head'
      USING ERRCODE = '42501';

  END IF;

  -- LOCK ACTIVE FAMILY
  PERFORM 1
  FROM public.families f
  JOIN public.locations l
    ON l.id = f.location_id
  WHERE f.id = p_family_id
    AND f.is_archived = false
    AND l.is_archived = false
  FOR UPDATE OF f;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Active family not found';
  END IF;

  -- VERIFY NEW HEAD
  PERFORM 1
  FROM public.individuals i
  WHERE i.id = p_new_head_id
    AND i.family_id = p_family_id
    AND i.is_archived = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Select an active member of this family';
  END IF;

  -- CLEAR THE EXISTING HEAD
  UPDATE public.individuals
  SET
    is_head = false,

    relationship_to_head =
      CASE
        WHEN lower(
          btrim(
            coalesce(relationship_to_head, '')
          )
        ) IN (
          'head',
          'family head',
          'head of family'
        )
        THEN 'Member'
        ELSE relationship_to_head
      END

  WHERE family_id = p_family_id
    AND is_archived = false
    AND is_head = true
    AND id <> p_new_head_id;

  -- ASSIGN THE NEW HEAD
  UPDATE public.individuals
  SET
    is_head = true,
    relationship_to_head = 'Head'
  WHERE id = p_new_head_id
    AND family_id = p_family_id
    AND is_archived = false;

  -- VERIFY FINAL STATE
  SELECT count(*)::integer
  INTO v_head_count
  FROM public.individuals
  WHERE family_id = p_family_id
    AND is_archived = false
    AND is_head = true;

  IF v_head_count <> 1 THEN
    RAISE EXCEPTION
      'Family must have exactly one active head';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'family_id', p_family_id,
    'new_head_id', p_new_head_id
  );

END;
$$;


-- ============================================
-- 4. TRANSFER INDIVIDUAL
-- ============================================

CREATE OR REPLACE FUNCTION
public.transfer_individual(
  p_person_id uuid,
  p_target_family_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_old_family_id uuid;
  v_locked_family_id uuid;
  v_person record;
  v_member_count integer;
  v_head_count integer;
  v_updated_count integer;
BEGIN

  -- ADMINISTRATORS ONLY
  IF NOT COALESCE(
    (SELECT private.is_admin()),
    false
  ) THEN

    RAISE EXCEPTION
      'Only Administrators can transfer individuals'
      USING ERRCODE = '42501';

  END IF;

  IF p_person_id IS NULL
     OR p_target_family_id IS NULL THEN

    RAISE EXCEPTION
      'Individual and destination family are required';

  END IF;

  -- READ THE SOURCE FAMILY
  SELECT family_id
  INTO v_old_family_id
  FROM public.individuals
  WHERE id = p_person_id
    AND is_archived = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Active individual not found';
  END IF;

  IF v_old_family_id = p_target_family_id THEN
    RAISE EXCEPTION
      'Select a different destination family';
  END IF;

  -- LOCK BOTH FAMILIES IN A STABLE ORDER.
  -- This serializes concurrent transfers
  -- using this RPC.
  FOR v_locked_family_id IN
    SELECT id
    FROM public.families
    WHERE id IN (
      v_old_family_id,
      p_target_family_id
    )
    ORDER BY id
    FOR UPDATE
  LOOP
    NULL;
  END LOOP;

  -- RECHECK THE INDIVIDUAL AFTER LOCKING
  SELECT
    i.id,
    i.family_id,
    i.is_head,
    i.is_archived
  INTO v_person
  FROM public.individuals i
  WHERE i.id = p_person_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Individual not found';
  END IF;

  IF v_person.is_archived
     OR v_person.family_id <> v_old_family_id THEN

    RAISE EXCEPTION
      'Individual changed. Refresh and try again';

  END IF;

  IF v_person.is_head THEN
    RAISE EXCEPTION
      'Assign another family head before transferring this person';
  END IF;

  -- SOURCE FAMILY MUST BE ACTIVE
  PERFORM 1
  FROM public.families f
  JOIN public.locations l
    ON l.id = f.location_id
  WHERE f.id = v_old_family_id
    AND f.is_archived = false
    AND l.is_archived = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Source family is not active';
  END IF;

  -- DESTINATION FAMILY MUST BE ACTIVE
  PERFORM 1
  FROM public.families f
  JOIN public.locations l
    ON l.id = f.location_id
  WHERE f.id = p_target_family_id
    AND f.is_archived = false
    AND l.is_archived = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Destination family is not active';
  END IF;

  -- MEMBER LIMIT
  SELECT count(*)::integer
  INTO v_member_count
  FROM public.individuals
  WHERE family_id = p_target_family_id
    AND is_archived = false;

  IF v_member_count >= 25 THEN
    RAISE EXCEPTION
      'Destination family already has 25 active members';
  END IF;

  -- DESTINATION MUST HAVE ONE HEAD
  SELECT count(*)::integer
  INTO v_head_count
  FROM public.individuals
  WHERE family_id = p_target_family_id
    AND is_archived = false
    AND is_head = true;

  IF v_head_count <> 1 THEN
    RAISE EXCEPTION
      'Destination family must have one active head';
  END IF;

  -- PERFORM TRANSFER
  UPDATE public.individuals
  SET
    family_id = p_target_family_id,
    relationship_to_head = 'Member'
  WHERE id = p_person_id
    AND is_archived = false
    AND is_head = false;

  GET DIAGNOSTICS
    v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION
      'Transfer could not be completed';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'person_id', p_person_id,
    'old_family_id', v_old_family_id,
    'new_family_id', p_target_family_id
  );

END;
$$;


-- ============================================
-- 5. RESTORE ARCHIVED INDIVIDUAL
-- ============================================

CREATE OR REPLACE FUNCTION
public.restore_individual(
  p_person_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_person record;
  v_member_count integer;
  v_head_count integer;
  v_updated_count integer;
BEGIN

  -- ADMINISTRATORS ONLY
  IF NOT COALESCE(
    (SELECT private.is_admin()),
    false
  ) THEN

    RAISE EXCEPTION
      'Only Administrators can restore individuals'
      USING ERRCODE = '42501';

  END IF;

  IF p_person_id IS NULL THEN
    RAISE EXCEPTION
      'Individual ID is required';
  END IF;

  -- FIND ARCHIVED RECORD
  SELECT family_id
  INTO v_family_id
  FROM public.individuals
  WHERE id = p_person_id
    AND is_archived = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Archived individual not found';
  END IF;

  -- LOCK AND VALIDATE FAMILY
  PERFORM 1
  FROM public.families f
  JOIN public.locations l
    ON l.id = f.location_id
  WHERE f.id = v_family_id
    AND f.is_archived = false
    AND l.is_archived = false
  FOR UPDATE OF f;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Restore the household before restoring this person';
  END IF;

  -- RECHECK THE ARCHIVED INDIVIDUAL
  SELECT
    id,
    family_id,
    is_archived
  INTO v_person
  FROM public.individuals
  WHERE id = p_person_id
  FOR UPDATE;

  IF NOT FOUND
     OR NOT v_person.is_archived
     OR v_person.family_id <> v_family_id THEN

    RAISE EXCEPTION
      'Individual changed. Refresh and try again';

  END IF;

  -- LIMIT ACTIVE MEMBERS
  SELECT count(*)::integer
  INTO v_member_count
  FROM public.individuals
  WHERE family_id = v_family_id
    AND is_archived = false;

  IF v_member_count >= 25 THEN
    RAISE EXCEPTION
      'Family already has 25 active members';
  END IF;

  -- EXISTING FAMILY MUST HAVE A HEAD
  SELECT count(*)::integer
  INTO v_head_count
  FROM public.individuals
  WHERE family_id = v_family_id
    AND is_archived = false
    AND is_head = true;

  IF v_head_count <> 1 THEN
    RAISE EXCEPTION
      'Family must have one active head before restoration';
  END IF;

  -- RESTORE AS AN ORDINARY MEMBER
  UPDATE public.individuals
  SET
    is_archived = false,
    is_head = false,

    relationship_to_head =
      CASE
        WHEN lower(
          btrim(
            coalesce(relationship_to_head, '')
          )
        ) IN (
          'head',
          'family head',
          'head of family'
        )
        THEN 'Member'
        ELSE relationship_to_head
      END

  WHERE id = p_person_id
    AND is_archived = true;

  GET DIAGNOSTICS
    v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION
      'Individual could not be restored';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'restored', true,
    'person_id', p_person_id,
    'family_id', v_family_id
  );

END;
$$;


-- ============================================
-- 6. RPC EXECUTION PERMISSIONS
-- ============================================

REVOKE ALL ON FUNCTION
  public.set_family_head(uuid, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.transfer_individual(uuid, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.restore_individual(uuid)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION
  public.set_family_head(uuid, uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.transfer_individual(uuid, uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.restore_individual(uuid)
TO authenticated;


COMMIT;

-- ============================================
-- 7. REFRESH POSTGREST SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';
