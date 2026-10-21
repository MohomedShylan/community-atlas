
-- ============================================
-- COMMUNITY ATLAS
-- SECTION 08 - LAND INFORMATION
--
-- Supports:
-- - Multiple lands per registered family
-- - Multiple lands with the same landowner
-- - Government/private land ownership
-- - Deed/permit numbers for government lands
-- - Highland/paddy land
-- - Freehold/lease/joint/litigation
-- - Main crop cultivation
--
-- Prerequisite:
-- public.register_household_with_housing()
--
-- This migration does not change existing
-- registered families or their saved data.
-- ============================================

BEGIN;

-- ============================================
-- 1. ENSURE FAMILY SHEET COLUMN EXISTS
-- ============================================

ALTER TABLE public.families
ADD COLUMN IF NOT EXISTS
  family_information_sheet jsonb
  NOT NULL
  DEFAULT '{}'::jsonb;

-- ============================================
-- 2. CREATE REGISTRATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION
public.register_household_with_lands(
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
  p_lands jsonb
)
RETURNS jsonb

LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''

AS $$
DECLARE
  v_result jsonb;
  v_family_id uuid;

  v_land jsonb;
  v_normalized_land jsonb;

  v_normalized_lands jsonb :=
    '[]'::jsonb;

  v_owner_name text;
  v_land_name text;
  v_land_size text;
  v_land_type text;
  v_ownership text;
  v_deed_permit text;
  v_tenure text;
  v_main_crops text;

  v_land_number integer := 0;

BEGIN

  -- ==========================================
  -- 1. CHECK PERMISSIONS
  -- ==========================================

  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'You do not have permission to register households.'
    USING ERRCODE = '42501';
  END IF;

  -- ==========================================
  -- 2. VALIDATE LANDS ARRAY
  -- ==========================================

  IF p_lands IS NULL
    OR jsonb_typeof(p_lands) <> 'array'
  THEN
    RAISE EXCEPTION
      'Land information must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_lands) > 25 THEN
    RAISE EXCEPTION
      'You can register a maximum of 25 lands.';
  END IF;

  -- Zero lands are allowed.
  -- An empty array means no land was added.

  -- ==========================================
  -- 3. VALIDATE EACH LAND
  -- ==========================================

  FOR v_land IN
    SELECT value
    FROM jsonb_array_elements(p_lands)
  LOOP

    v_land_number := v_land_number + 1;

    IF jsonb_typeof(v_land) <> 'object' THEN
      RAISE EXCEPTION
        'Land % must contain valid information.',
        v_land_number;
    END IF;

    -- Normalize submitted values.

    v_owner_name := nullif(
      btrim(coalesce(
        v_land->>'owner_name', ''
      )),
      ''
    );

    v_land_name := nullif(
      btrim(coalesce(
        v_land->>'land_name', ''
      )),
      ''
    );

    v_land_size := nullif(
      btrim(coalesce(
        v_land->>'land_size', ''
      )),
      ''
    );

    v_land_type := nullif(
      btrim(coalesce(
        v_land->>'land_type', ''
      )),
      ''
    );

    v_ownership := nullif(
      btrim(coalesce(
        v_land->>'ownership_category', ''
      )),
      ''
    );

    v_deed_permit := nullif(
      btrim(coalesce(
        v_land->>'deed_permit_number', ''
      )),
      ''
    );

    v_tenure := nullif(
      btrim(coalesce(
        v_land->>'tenure_type', ''
      )),
      ''
    );

    v_main_crops := nullif(
      btrim(coalesce(
        v_land->>'main_crops', ''
      )),
      ''
    );

    -- ========================================
    -- 4. VALIDATE LAND IDENTIFICATION
    -- ========================================

    IF v_owner_name IS NULL
      AND v_land_name IS NULL
    THEN
      RAISE EXCEPTION
        'Land % requires a landowner name or land name.',
        v_land_number;
    END IF;

    -- ========================================
    -- 5. VALIDATE TEXT FIELD LENGTHS
    -- ========================================

    IF char_length(
      coalesce(v_owner_name, '')
    ) > 150
    THEN
      RAISE EXCEPTION
        'Land %: Landowner name is too long.',
        v_land_number;
    END IF;

    IF char_length(
      coalesce(v_land_name, '')
    ) > 200
    THEN
      RAISE EXCEPTION
        'Land %: Land name is too long.',
        v_land_number;
    END IF;

    IF char_length(
      coalesce(v_land_size, '')
    ) > 100
    THEN
      RAISE EXCEPTION
        'Land %: Land size is too long.',
        v_land_number;
    END IF;

    IF char_length(
      coalesce(v_deed_permit, '')
    ) > 100
    THEN
      RAISE EXCEPTION
        'Land %: Deed/permit number is too long.',
        v_land_number;
    END IF;

    IF char_length(
      coalesce(v_main_crops, '')
    ) > 300
    THEN
      RAISE EXCEPTION
        'Land %: Main crops field is too long.',
        v_land_number;
    END IF;

    -- ========================================
    -- 6. VALIDATE HIGHLAND / PADDY
    -- ========================================

    IF v_land_type IS NOT NULL
      AND v_land_type NOT IN (
        'highland',
        'paddy'
      )
    THEN
      RAISE EXCEPTION
        'Land %: Invalid land type.',
        v_land_number;
    END IF;

    -- ========================================
    -- 7. VALIDATE OWNERSHIP CATEGORY
    -- ========================================

    IF v_ownership IS NOT NULL
      AND v_ownership NOT IN (
        'government',
        'private'
      )
    THEN
      RAISE EXCEPTION
        'Land %: Invalid ownership category.',
        v_land_number;
    END IF;

    -- Preserve deed/permit number only for
    -- government-owned land.

    IF v_ownership IS DISTINCT FROM 'government'
    THEN
      v_deed_permit := NULL;
    END IF;

    -- ========================================
    -- 8. VALIDATE TENURE TYPE
    -- ========================================

    IF v_tenure IS NOT NULL
      AND v_tenure NOT IN (
        'freehold',
        'lease',
        'joint',
        'litigation'
      )
    THEN
      RAISE EXCEPTION
        'Land %: Invalid tenure type.',
        v_land_number;
    END IF;

    -- ========================================
    -- 9. NORMALIZE LAND RECORD
    -- ========================================

    v_normalized_land :=
      jsonb_build_object(
        'owner_name',
          v_owner_name,

        'land_name',
          v_land_name,

        'land_size',
          v_land_size,

        'land_type',
          v_land_type,

        'ownership_category',
          v_ownership,

        'deed_permit_number',
          v_deed_permit,

        'tenure_type',
          v_tenure,

        'main_crops',
          v_main_crops
      );

    -- Append this land without replacing
    -- any previously validated land.

    v_normalized_lands :=
      v_normalized_lands ||
      jsonb_build_array(v_normalized_land);

  END LOOP;

  -- ==========================================
  -- 10. REGISTER THE FAMILY
  --
  -- Existing function already saves:
  -- Section 1 - Family Information
  -- Section 6 - Members and document paths
  -- Section 7 - Housing Information
  --
  -- The same transaction is used.
  -- ==========================================

  SELECT public.register_household_with_housing(
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
    p_housing_sheet
  )
  INTO v_result;

  -- ==========================================
  -- 11. GET THE REGISTERED FAMILY ID
  -- ==========================================

  v_family_id :=
    (v_result->>'family_id')::uuid;

  -- ==========================================
  -- 12. SAVE SECTION 8
  --
  -- section_8 is an ARRAY of land records.
  -- It is not limited to a single owner.
  --
  -- jsonb_set preserves other sections.
  -- ==========================================

  UPDATE public.families
  SET family_information_sheet =
    jsonb_set(
      coalesce(
        family_information_sheet,
        '{}'::jsonb
      ),
      '{section_8}',
      v_normalized_lands,
      true
    )
  WHERE id = v_family_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Could not save Section 8 land information.';
  END IF;

  -- ==========================================
  -- 13. RETURN ORIGINAL REGISTRATION RESULT
  -- ==========================================

  RETURN v_result;

END;
$$;

-- ============================================
-- 3. FUNCTION PERMISSIONS
-- ============================================

REVOKE ALL ON FUNCTION
public.register_household_with_lands(
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
  jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.register_household_with_lands(
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
  jsonb
)
TO authenticated;

COMMIT;

-- Refresh the Supabase API schema cache.

NOTIFY pgrst, 'reload schema';
