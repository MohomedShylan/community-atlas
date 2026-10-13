
-- ============================================
-- COMMUNITY ATLAS
-- FIX: MISSING ARCHIVE INDIVIDUAL FUNCTION
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION
public.archive_individual(
  p_person_id uuid,
  p_confirm_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_person record;
  v_updated_count integer;
BEGIN

  -- ========================================
  -- 1. CHECK ADMINISTRATOR PERMISSION
  -- ========================================

  IF NOT COALESCE(
    (SELECT private.is_admin()),
    false
  ) THEN
    RAISE EXCEPTION
      'Only Administrators can remove individuals'
      USING ERRCODE = '42501';
  END IF;

  -- ========================================
  -- 2. VALIDATE INDIVIDUAL ID
  -- ========================================

  IF p_person_id IS NULL THEN
    RAISE EXCEPTION
      'Individual ID is required';
  END IF;

  -- ========================================
  -- 3. FIND AND LOCK ACTIVE INDIVIDUAL
  -- ========================================

  SELECT
    i.id,
    i.person_code,
    i.full_name,
    i.family_id,
    i.is_head
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
      'Active individual not found or access denied';
  END IF;

  -- ========================================
  -- 4. VERIFY PERSON CODE
  -- ========================================

  IF v_person.person_code
     IS DISTINCT FROM p_confirm_code THEN

    RAISE EXCEPTION
      'Person code confirmation does not match';

  END IF;

  -- ========================================
  -- 5. PROTECT HEAD OF FAMILY
  -- ========================================

  IF v_person.is_head THEN

    RAISE EXCEPTION
      'Cannot remove the current head of family. Assign another family head first';

  END IF;

  -- ========================================
  -- 6. ARCHIVE INDIVIDUAL
  -- ========================================

  UPDATE public.individuals
  SET
    is_archived = true
  WHERE id = p_person_id
    AND is_archived = false
    AND is_head = false;

  GET DIAGNOSTICS
    v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION
      'Individual could not be archived. Check RLS permissions.';
  END IF;

  -- ========================================
  -- 7. RETURN SUCCESS RESPONSE
  -- ========================================

  RETURN jsonb_build_object(
    'success', true,
    'archived', true,
    'person_id', p_person_id,
    'person_code', v_person.person_code,
    'message',
      'Individual archived successfully'
  );

END;
$$;

-- ============================================
-- 8. SECURE FUNCTION ACCESS
-- ============================================

REVOKE ALL ON FUNCTION
  public.archive_individual(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.archive_individual(uuid, text)
TO authenticated;

COMMIT;

-- ============================================
-- 9. REFRESH SUPABASE SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';
