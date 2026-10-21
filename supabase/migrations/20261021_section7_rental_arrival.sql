
-- ============================================
-- COMMUNITY ATLAS
-- SECTION 7.1 - RENTAL ARRIVAL YEAR
--
-- Change:
-- The approximate arrival year is required
-- for BOTH Temporary and Rental residences.
--
-- Permanent residence has no arrival year.
--
-- Existing family records remain unchanged.
-- ============================================

BEGIN;

CREATE OR REPLACE FUNCTION
public.register_household_with_housing(
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
  p_housing_sheet jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_family_id uuid;

  v_residency text;
  v_arrival_year text;

  v_house_type text;
  v_house_material text;
  v_roof text;
  v_floors text;

  v_electricity text;
  v_water text;
  v_water_source text;
  v_water_without text;
  v_toilet text;
BEGIN

  -- ==========================================
  -- 1. PERMISSION CHECK
  -- ==========================================

  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'You do not have permission to register households.'
    USING ERRCODE = '42501';
  END IF;

  -- ==========================================
  -- 2. VALIDATE HOUSING DATA
  -- ==========================================

  IF p_housing_sheet IS NULL
    OR jsonb_typeof(p_housing_sheet) <> 'object'
  THEN
    RAISE EXCEPTION
      'Section 7 housing information must be an object.';
  END IF;

  -- ==========================================
  -- 3. NORMALIZE VALUES
  -- ==========================================

  v_residency := nullif(btrim(coalesce(
    p_housing_sheet->>'residency_type',
    ''
  )), '');

  v_arrival_year := nullif(btrim(coalesce(
    p_housing_sheet->>'temporary_arrival_year',
    ''
  )), '');

  v_house_type := nullif(btrim(coalesce(
    p_housing_sheet->>'house_type',
    ''
  )), '');

  v_house_material := nullif(btrim(coalesce(
    p_housing_sheet->>'temporary_house_material',
    ''
  )), '');

  v_roof := nullif(btrim(coalesce(
    p_housing_sheet->>'roof_type',
    ''
  )), '');

  v_floors := nullif(btrim(coalesce(
    p_housing_sheet->>'floor_count',
    ''
  )), '');

  v_electricity := nullif(btrim(coalesce(
    p_housing_sheet->>'electricity_available',
    ''
  )), '');

  v_water := nullif(btrim(coalesce(
    p_housing_sheet->>'water_available',
    ''
  )), '');

  v_water_source := nullif(btrim(coalesce(
    p_housing_sheet->>'water_source',
    ''
  )), '');

  v_water_without := nullif(btrim(coalesce(
    p_housing_sheet->>'water_source_without_facility',
    ''
  )), '');

  v_toilet := nullif(btrim(coalesce(
    p_housing_sheet->>'toilet_facility',
    ''
  )), '');

  -- ==========================================
  -- 4. VALIDATE 7.1 - RESIDENCE TYPE
  -- ==========================================

  IF v_residency IS NOT NULL
    AND v_residency NOT IN (
      'permanent',
      'temporary',
      'rental'
    )
  THEN
    RAISE EXCEPTION
      'Invalid residency type.';
  END IF;

  -- ==========================================
  -- UPDATED LOGIC
  --
  -- Arrival year is required when:
  -- residency_type = 'temporary'
  -- OR residency_type = 'rental'
  --
  -- Permanent residents do not need it.
  -- ==========================================

  IF v_residency IN (
    'temporary',
    'rental'
  ) THEN

    IF v_arrival_year IS NULL
      OR v_arrival_year !~ '^[0-9]{4}$'
    THEN
      RAISE EXCEPTION
        'A four-digit approximate arrival year is required for Temporary or Rental residence.';
    END IF;

    IF v_arrival_year::integer < 1800
      OR v_arrival_year::integer >
        EXTRACT(YEAR FROM CURRENT_DATE)::integer
    THEN
      RAISE EXCEPTION
        'Approximate arrival year is out of range.';
    END IF;

  ELSE
    v_arrival_year := NULL;
  END IF;

  -- ==========================================
  -- 5. VALIDATE 7.2 - HOUSE TYPE
  -- ==========================================

  IF v_house_type IS NOT NULL
    AND v_house_type NOT IN (
      'permanent',
      'semi_permanent',
      'temporary'
    )
  THEN
    RAISE EXCEPTION
      'Invalid house type.';
  END IF;

  IF v_house_type = 'temporary' THEN

    IF v_house_material IS NULL
      OR v_house_material NOT IN (
        'mud',
        'straw',
        'coconut_leaves',
        'other'
      )
    THEN
      RAISE EXCEPTION
        'Select the temporary house material.';
    END IF;

  ELSE
    v_house_material := NULL;
  END IF;

  -- ==========================================
  -- 6. VALIDATE 7.3 - ROOF
  -- ==========================================

  IF v_roof IS NOT NULL
    AND v_roof NOT IN (
      'tiles',
      'asbestos',
      'other'
    )
  THEN
    RAISE EXCEPTION
      'Invalid roof type.';
  END IF;

  -- ==========================================
  -- 7. VALIDATE 7.4 - FLOORS
  -- ==========================================

  IF v_floors IS NOT NULL
    AND v_floors NOT IN (
      'one',
      'two',
      'three'
    )
  THEN
    RAISE EXCEPTION
      'Invalid number of floors.';
  END IF;

  -- ==========================================
  -- 8. VALIDATE 7.5 - ELECTRICITY
  -- ==========================================

  IF v_electricity IS NOT NULL
    AND v_electricity NOT IN (
      'yes',
      'no'
    )
  THEN
    RAISE EXCEPTION
      'Invalid electricity availability.';
  END IF;

  -- ==========================================
  -- 9. VALIDATE 7.6 - WATER
  -- ==========================================

  IF v_water IS NOT NULL
    AND v_water NOT IN (
      'yes',
      'no'
    )
  THEN
    RAISE EXCEPTION
      'Invalid water availability.';
  END IF;

  IF v_water = 'yes' THEN

    IF v_water_source IS NULL
      OR v_water_source NOT IN (
        'protected_well',
        'piped_water',
        'tube_well',
        'other'
      )
    THEN
      RAISE EXCEPTION
        'Select a valid source of water.';
    END IF;

    v_water_without := NULL;

  ELSIF v_water = 'no' THEN

    IF v_water_without IS NULL
      OR char_length(v_water_without) > 300
    THEN
      RAISE EXCEPTION
        'Describe how water is obtained (maximum 300 characters).';
    END IF;

    v_water_source := NULL;

  ELSE
    v_water_source := NULL;
    v_water_without := NULL;
  END IF;

  -- ==========================================
  -- 10. VALIDATE 7.7 - TOILET
  -- ==========================================

  IF v_toilet IS NOT NULL
    AND v_toilet NOT IN (
      'water_sealed',
      'pit',
      'commode',
      'none'
    )
  THEN
    RAISE EXCEPTION
      'Invalid toilet facility.';
  END IF;

  -- ==========================================
  -- 11. REGISTER SECTIONS 1 AND 6
  --
  -- Existing function remains responsible
  -- for members, private document references,
  -- family and location registration.
  -- ==========================================

  SELECT public.register_household_with_sheet(
    p_family_name,
    p_members,
    p_existing_location_id,
    p_address_line,
    p_village,
    p_district,
    p_latitude,
    p_longitude,
    p_contact_phone,
    p_family_sheet
  )
  INTO v_result;

  v_family_id :=
    (v_result->>'family_id')::uuid;

  -- ==========================================
  -- 12. SAVE SECTION 7
  --
  -- The existing key is retained for
  -- backward compatibility:
  --
  -- temporary_arrival_year
  --
  -- It can now hold the arrival year for
  -- either Temporary or Rental residence.
  -- ==========================================

  UPDATE public.families
  SET family_information_sheet =
    jsonb_set(
      coalesce(
        family_information_sheet,
        '{}'::jsonb
      ),
      '{section_7}',
      jsonb_build_object(
        'residency_type',
          v_residency,

        'temporary_arrival_year',
          v_arrival_year,

        'house_type',
          v_house_type,

        'temporary_house_material',
          v_house_material,

        'roof_type',
          v_roof,

        'floor_count',
          v_floors,

        'electricity_available',
          v_electricity,

        'water_available',
          v_water,

        'water_source',
          v_water_source,

        'water_source_without_facility',
          v_water_without,

        'toilet_facility',
          v_toilet
      ),
      true
    )
  WHERE id = v_family_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Could not save Section 7 housing information.';
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- FUNCTION PERMISSIONS
-- ============================================

REVOKE ALL ON FUNCTION
public.register_household_with_housing(
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
  jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.register_household_with_housing(
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
  jsonb
)
TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
