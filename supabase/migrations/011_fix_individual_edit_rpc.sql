
-- ============================================
-- COMMUNITY ATLAS
-- FIX: INDIVIDUAL EDIT RPC
--
-- Run only after verifying that
-- update_individual_details does not exist.
-- Requires private.can_edit() from
-- earlier migrations.
-- ============================================

BEGIN;

CREATE FUNCTION public.update_individual_details(
  p_person_id uuid,
  p_full_name text,
  p_date_of_birth date,
  p_gender text,
  p_relationship_to_head text,
  p_phone text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_full_name text;
  v_gender text;
  v_relationship text;
BEGIN

  -- ----------------------------------------
  -- 1. CHECK PERMISSIONS
  -- ----------------------------------------

  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'Only Administrators and Editors can edit individuals'
      USING ERRCODE = '42501';
  END IF;

  -- ----------------------------------------
  -- 2. NORMALIZE INPUT
  -- ----------------------------------------

  v_full_name :=
    btrim(coalesce(p_full_name, ''));

  v_gender :=
    nullif(
      lower(btrim(coalesce(p_gender, ''))),
      ''
    );

  v_relationship :=
    nullif(
      btrim(coalesce(p_relationship_to_head, '')),
      ''
    );

  -- ----------------------------------------
  -- 3. VALIDATE INPUT
  -- ----------------------------------------

  IF char_length(v_full_name) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION
      'Full name must contain 2 to 150 characters';
  END IF;

  IF p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION
      'Date of birth cannot be in the future';
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

  IF char_length(
    coalesce(v_relationship, '')
  ) > 100 THEN
    RAISE EXCEPTION
      'Relationship cannot exceed 100 characters';
  END IF;

  IF char_length(
    coalesce(p_phone, '')
  ) > 30 THEN
    RAISE EXCEPTION
      'Phone number cannot exceed 30 characters';
  END IF;

  IF char_length(
    coalesce(p_notes, '')
  ) > 2000 THEN
    RAISE EXCEPTION
      'Notes cannot exceed 2000 characters';
  END IF;

  -- ----------------------------------------
  -- 4. FIND ACTIVE INDIVIDUAL
  -- ----------------------------------------

  SELECT i.family_id
  INTO v_family_id
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

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION
      'Individual not found or is archived';
  END IF;

  -- ----------------------------------------
  -- 5. UPDATE PERSONAL INFORMATION
  -- ----------------------------------------

  UPDATE public.individuals
  SET
    full_name = v_full_name,

    date_of_birth = p_date_of_birth,

    gender = v_gender,

    relationship_to_head =
      v_relationship,

    phone = nullif(
      btrim(coalesce(p_phone, '')),
      ''
    ),

    notes = nullif(
      btrim(coalesce(p_notes, '')),
      ''
    )

  WHERE id = p_person_id;

  -- ----------------------------------------
  -- 6. RETURN RESULT
  -- ----------------------------------------

  RETURN jsonb_build_object(
    'success', true,
    'person_id', p_person_id,
    'family_id', v_family_id,
    'message',
      'Individual updated successfully'
  );

END;
$$;

-- ------------------------------------------
-- 7. SECURE FUNCTION ACCESS
-- ------------------------------------------

REVOKE ALL ON FUNCTION
  public.update_individual_details(
    uuid,
    text,
    date,
    text,
    text,
    text,
    text
  )
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.update_individual_details(
    uuid,
    text,
    date,
    text,
    text,
    text,
    text
  )
TO authenticated;

COMMIT;

-- ------------------------------------------
-- 8. RELOAD SUPABASE SCHEMA CACHE
-- ------------------------------------------

NOTIFY pgrst, 'reload schema';
