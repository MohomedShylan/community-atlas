
-- ============================================
-- COMMUNITY ATLAS
-- SECTION 6.12 - MEMBER GENDER
--
-- Uses the existing individuals.gender column.
-- Does not delete or overwrite existing records.
-- Preserves Sections 1-18.
-- ============================================

BEGIN;

-- ============================================
-- 1. CHECK DATABASE REQUIREMENTS
-- ============================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'individuals'
      AND column_name = 'gender'
  ) THEN

    RAISE EXCEPTION
      'The individuals.gender column is missing. Apply individual registration migration 006 first.';

  END IF;

  IF to_regprocedure(
    'public.register_household_with_extended_sections(text,jsonb,uuid,text,text,text,numeric,numeric,text,jsonb,jsonb,jsonb,jsonb,jsonb)'
  ) IS NULL THEN

    RAISE EXCEPTION
      'The Sections 10-18 registration function is missing.';

  END IF;

END;
$$;

-- ============================================
-- 2. CREATE GENDER-AWARE REGISTRATION
-- ============================================

CREATE OR REPLACE FUNCTION
public.register_household_with_gender(
  p_family_name text,
  p_members jsonb,
  p_existing_location_id uuid,
  p_address_line text,
  p_village text,
  p_district text,
  p_latitude numeric,
  p_longitude numeric,
  p_contact_phone text,
  p_family_sheet jsonb,
  p_housing_sheet jsonb,
  p_lands jsonb,
  p_subsidies jsonb,
  p_extended_sections jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$

DECLARE

  v_result jsonb;
  v_family_id uuid;

  v_member jsonb;
  v_gender text;

  v_index integer := 0;
  v_updated integer;

BEGIN

  -- ==========================================
  -- 1. CHECK PERMISSION
  -- ==========================================

  IF NOT (SELECT private.can_edit()) THEN

    RAISE EXCEPTION
      'You do not have permission to register households.'
    USING ERRCODE = '42501';

  END IF;

  -- ==========================================
  -- 2. VALIDATE MEMBERS
  -- ==========================================

  IF p_members IS NULL
    OR jsonb_typeof(p_members) <> 'array'
  THEN

    RAISE EXCEPTION
      'Family members must be an array.';

  END IF;

  -- ==========================================
  -- 3. VALIDATE GENDER OPTIONS
  -- ==========================================

  FOR v_member IN
    SELECT value
    FROM jsonb_array_elements(p_members)
  LOOP

    IF jsonb_typeof(v_member) <> 'object' THEN

      RAISE EXCEPTION
        'Invalid family member information.';

    END IF;

    v_gender := NULLIF(
      lower(
        btrim(
          COALESCE(
            v_member ->> 'gender',
            ''
          )
        )
      ),
      ''
    );

    IF v_gender IS NOT NULL
      AND v_gender NOT IN (
        'female',
        'male',
        'other'
      )
    THEN

      RAISE EXCEPTION
        'Invalid gender. Select Female, Male or Other.';

    END IF;

  END LOOP;

  -- ==========================================
  -- 4. REGISTER HOUSEHOLD
  --
  -- Reuses the complete previous workflow.
  -- The database transaction remains atomic.
  -- ==========================================

  SELECT
    public.register_household_with_extended_sections(
      p_family_name,
      p_members,
      p_existing_location_id,
      p_address_line,
      p_village,
      p_district,
      p_latitude,
      p_longitude,
      p_contact_phone,
      p_family_sheet,
      p_housing_sheet,
      p_lands,
      p_subsidies,
      p_extended_sections
    )
  INTO v_result;

  v_family_id :=
    (v_result ->> 'family_id')::uuid;

  IF v_family_id IS NULL THEN

    RAISE EXCEPTION
      'Household registration did not return a family ID.';

  END IF;

  -- ==========================================
  -- 5. SAVE EACH MEMBER'S GENDER
  --
  -- Member order matches the existing
  -- Section 6 registration function.
  -- ==========================================

  FOR v_member IN
    SELECT value
    FROM jsonb_array_elements(p_members)
  LOOP

    v_gender := NULLIF(
      lower(
        btrim(
          COALESCE(
            v_member ->> 'gender',
            ''
          )
        )
      ),
      ''
    );

    -- Skip the update when no gender
    -- was selected, keeping NULL.

    IF v_gender IS NOT NULL THEN

      UPDATE public.individuals
      SET gender = v_gender
      WHERE id = (
        SELECT i.id
        FROM public.individuals i
        WHERE i.family_id = v_family_id
        ORDER BY i.person_code
        OFFSET v_index
        LIMIT 1
      );

      GET DIAGNOSTICS
        v_updated = ROW_COUNT;

      IF v_updated <> 1 THEN

        RAISE EXCEPTION
          'Could not save gender for family member %.',
          v_index + 1;

      END IF;

    END IF;

    v_index := v_index + 1;

  END LOOP;

  RETURN v_result;

END;
$function$;

-- ============================================
-- 3. RESTRICT FUNCTION PERMISSIONS
-- ============================================

REVOKE ALL ON FUNCTION
public.register_household_with_gender(
  text,
  jsonb,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.register_household_with_gender(
  text,
  jsonb,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
)
TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
