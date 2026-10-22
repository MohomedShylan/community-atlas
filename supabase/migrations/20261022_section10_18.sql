
-- ==================================================
-- COMMUNITY ATLAS
-- SECTIONS 10 TO 18 - CORRECTED MIGRATION
--
-- Section 10: Government Pensioners
-- Section 11: Security Personnel
-- Section 12: Overseas Members
-- Section 13: Disability Information
-- Section 14: Family Businesses
-- Section 15: Self-employment
-- Section 16: Vehicles
-- Section 17: Livestock
-- Section 18: Vocational Training / Job Seekers
--
-- Supports 0 to 50 entries per section.
-- No existing household data is deleted.
--
-- Prerequisites:
-- public.register_household_with_subsidies()
-- private.can_edit()
-- private.is_admin()
-- ==================================================

BEGIN;

-- ==================================================
-- 1. CREATE SECTION RECORDS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS
public.family_extended_sections (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),

  family_id uuid NOT NULL
    REFERENCES public.families(id)
    ON DELETE CASCADE,

  section_number smallint NOT NULL
    CHECK (section_number BETWEEN 10 AND 18),

  entry_number smallint NOT NULL
    CHECK (entry_number BETWEEN 1 AND 50),

  details jsonb NOT NULL
    CHECK (jsonb_typeof(details) = 'object'),

  created_at timestamptz NOT NULL
    DEFAULT now(),

  CONSTRAINT family_extended_sections_unique_entry
    UNIQUE (
      family_id,
      section_number,
      entry_number
    )
);

CREATE INDEX IF NOT EXISTS
idx_family_extended_sections_family
ON public.family_extended_sections (
  family_id,
  section_number
);

-- ==================================================
-- 2. SECURITY AND PERMISSIONS
-- ==================================================

ALTER TABLE public.family_extended_sections
ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.family_extended_sections
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT
ON public.family_extended_sections
TO authenticated;

-- Administrator-only reading

DROP POLICY IF EXISTS
ca_extended_sections_read
ON public.family_extended_sections;

CREATE POLICY ca_extended_sections_read
ON public.family_extended_sections
FOR SELECT
TO authenticated
USING (
  (SELECT private.is_admin())
);

-- Authorized staff may insert records

DROP POLICY IF EXISTS
ca_extended_sections_insert
ON public.family_extended_sections;

CREATE POLICY ca_extended_sections_insert
ON public.family_extended_sections
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT private.can_edit())
);

-- ==================================================
-- 3. REGISTRATION FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION
public.register_household_with_extended_sections(
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

  v_section integer;
  v_section_key text;

  v_entries jsonb;
  v_entry jsonb;

  v_entry_number integer;

  v_allowed_fields text[];
  v_required_field text;

  v_field_key text;
  v_field_value jsonb;
  v_field_text text;
  v_max_length integer;

BEGIN

  -- ==============================================
  -- 1. VERIFY USER PERMISSIONS
  -- ==============================================

  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'Permission denied: cannot register household.'
    USING ERRCODE = '42501';
  END IF;

  -- ==============================================
  -- 2. VALIDATE JSON ROOT
  -- ==============================================

  IF p_extended_sections IS NULL
     OR jsonb_typeof(p_extended_sections) <> 'object'
  THEN
    RAISE EXCEPTION
      'Extended sections must be a JSON object.';
  END IF;

  -- Allow only Section 10 through Section 18

  FOR v_section_key IN
    SELECT jsonb_object_keys(p_extended_sections)
  LOOP

    IF v_section_key NOT IN (
      'section_10',
      'section_11',
      'section_12',
      'section_13',
      'section_14',
      'section_15',
      'section_16',
      'section_17',
      'section_18'
    ) THEN

      RAISE EXCEPTION
        'Unknown section: %',
        v_section_key;

    END IF;

  END LOOP;

  -- ==============================================
  -- 3. VALIDATE SECTIONS 10 THROUGH 18
  -- ==============================================

  FOR v_section IN
    SELECT generate_series(10, 18)
  LOOP

    v_section_key :=
      'section_' || v_section::text;

    v_entries := COALESCE(
      p_extended_sections -> v_section_key,
      '[]'::jsonb
    );

    IF jsonb_typeof(v_entries) <> 'array' THEN
      RAISE EXCEPTION
        'Section % must contain an array.',
        v_section;
    END IF;

    IF jsonb_array_length(v_entries) > 50 THEN
      RAISE EXCEPTION
        'Section % allows a maximum of 50 entries.',
        v_section;
    END IF;

    -- ============================================
    -- 4. DEFINE FIELDS FOR EACH SECTION
    -- ============================================

    CASE v_section

      WHEN 10 THEN
        v_required_field := 'retiree_name';

        v_allowed_fields := ARRAY[
          'retiree_name',
          'served_institution',
          'held_position',
          'pension_number',
          'retirement_year',
          'service_duration',
          'pension_type',
          'other'
        ];

      WHEN 11 THEN
        v_required_field := 'person_name';

        v_allowed_fields := ARRAY[
          'person_name',
          'security_branch',
          'service_address',
          'position',
          'service_duration',
          'current_status',
          'other'
        ];

      WHEN 12 THEN
        v_required_field := 'person_name';

        v_allowed_fields := ARRAY[
          'person_name',
          'country',
          'passport_number',
          'travel_reason',
          'departure_date',
          'return_date',
          'other'
        ];

      WHEN 13 THEN
        v_required_field := 'person_name';

        v_allowed_fields := ARRAY[
          'person_name',
          'disability_type',
          'disability_cause',
          'employment_status',
          'special_abilities',
          'assistance_amount'
        ];

      WHEN 14 THEN
        v_required_field := 'business_person_name';

        v_allowed_fields := ARRAY[
          'business_person_name',
          'business_nature',
          'business_name',
          'business_address',
          'registration_number'
        ];

      WHEN 15 THEN
        v_required_field := 'person_name';

        v_allowed_fields := ARRAY[
          'person_name',
          'self_employment'
        ];

      WHEN 16 THEN
        v_required_field := 'vehicle_type';

        v_allowed_fields := ARRAY[
          'vehicle_type',
          'owner_name',
          'vehicle_number'
        ];

      WHEN 17 THEN
        v_required_field := 'animal_type';

        v_allowed_fields := ARRAY[
          'animal_type',
          'quantity',
          'products'
        ];

      WHEN 18 THEN
        v_required_field := 'person_name';

        v_allowed_fields := ARRAY[
          'person_name',
          'training_received',
          'training_institution',
          'other_qualifications'
        ];

    END CASE;

    -- ============================================
    -- 5. VALIDATE EVERY RECORD
    -- ============================================

    FOR v_entry IN
      SELECT value
      FROM jsonb_array_elements(v_entries)
    LOOP

      IF jsonb_typeof(v_entry) <> 'object' THEN
        RAISE EXCEPTION
          'Section % contains an invalid record.',
          v_section;
      END IF;

      -- Each record needs one identifying field.

      IF char_length(
        btrim(
          coalesce(
            v_entry ->> v_required_field,
            ''
          )
        )
      ) < 2 THEN

        RAISE EXCEPTION
          'Section % requires a valid %.',
          v_section,
          v_required_field;

      END IF;

      -- ==========================================
      -- 6. VALIDATE FIELDS AND LENGTHS
      -- ==========================================

      FOR v_field_key, v_field_value IN
        SELECT key, value
        FROM jsonb_each(v_entry)
      LOOP

        -- Reject unrecognized field names.

        IF NOT (
          v_field_key = ANY(v_allowed_fields)
        ) THEN
          RAISE EXCEPTION
            'Invalid field % in Section %.',
            v_field_key,
            v_section;
        END IF;

        -- Fields must contain strings or null.

        IF jsonb_typeof(v_field_value)
           NOT IN ('string', 'null')
        THEN
          RAISE EXCEPTION
            'Section % field % must be text.',
            v_section,
            v_field_key;
        END IF;

        v_field_text := COALESCE(
          v_entry ->> v_field_key,
          ''
        );

        -- Simple length validation.
        -- This replaces the previous nested
        -- CASE expression near LINE 530.

        v_max_length := 300;

        IF v_field_key IN (
          'other',
          'other_qualifications'
        ) THEN
          v_max_length := 1000;
        END IF;

        IF char_length(v_field_text) > v_max_length
        THEN
          RAISE EXCEPTION
            'Section % field % exceeds % characters.',
            v_section,
            v_field_key,
            v_max_length;
        END IF;

      END LOOP;

      -- ==========================================
      -- 7. VALIDATE DROPDOWN VALUES
      -- ==========================================

      -- SECTION 10: PENSION

      IF v_section = 10 THEN

        IF COALESCE(
          v_entry ->> 'pension_type', ''
        ) NOT IN (
          '',
          'civil',
          'widow_orphan',
          'military_dependent',
          'other'
        ) THEN

          RAISE EXCEPTION
            'Section 10: invalid pension type.';

        END IF;

      END IF;

      -- SECTION 11: SECURITY

      IF v_section = 11 THEN

        IF COALESCE(
          v_entry ->> 'security_branch', ''
        ) NOT IN (
          '',
          'army',
          'air_force',
          'navy',
          'police',
          'vip_security'
        ) THEN

          RAISE EXCEPTION
            'Section 11: invalid security branch.';

        END IF;

        IF COALESCE(
          v_entry ->> 'current_status', ''
        ) NOT IN (
          '',
          'disabled',
          'deceased'
        ) THEN

          RAISE EXCEPTION
            'Section 11: invalid current status.';

        END IF;

      END IF;

      -- SECTION 12: OVERSEAS TRAVEL

      IF v_section = 12 THEN

        IF COALESCE(
          v_entry ->> 'travel_reason', ''
        ) NOT IN (
          '',
          'employment',
          'education'
        ) THEN

          RAISE EXCEPTION
            'Section 12: invalid travel reason.';

        END IF;

      END IF;

      -- SECTION 13: DISABILITY

      IF v_section = 13 THEN

        IF COALESCE(
          v_entry ->> 'disability_type', ''
        ) NOT IN (
          '',
          'mental',
          'physical',
          'physical_impairment'
        ) THEN

          RAISE EXCEPTION
            'Section 13: invalid disability type.';

        END IF;

        IF COALESCE(
          v_entry ->> 'disability_cause', ''
        ) NOT IN (
          '',
          'from_birth',
          'accident',
          'other'
        ) THEN

          RAISE EXCEPTION
            'Section 13: invalid disability cause.';

        END IF;

        IF COALESCE(
          v_entry ->> 'employment_status', ''
        ) NOT IN (
          '',
          'employed',
          'not_employed'
        ) THEN

          RAISE EXCEPTION
            'Section 13: invalid employment status.';

        END IF;

      END IF;

      -- SECTION 17: LIVESTOCK

      IF v_section = 17 THEN

        IF COALESCE(
          v_entry ->> 'products', ''
        ) NOT IN (
          '',
          'meat',
          'eggs',
          'milk'
        ) THEN

          RAISE EXCEPTION
            'Section 17: invalid livestock product.';

        END IF;

      END IF;

    END LOOP;

  END LOOP;

  -- ==============================================
  -- 8. REGISTER EXISTING SECTIONS 1–9
  -- ==============================================

  SELECT public.register_household_with_subsidies(
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
    p_subsidies
  )
  INTO v_result;

  -- ==============================================
  -- 9. GET THE NEW FAMILY ID
  -- ==============================================

  IF v_result IS NULL
     OR jsonb_typeof(v_result) <> 'object'
  THEN
    RAISE EXCEPTION
      'Household registration returned an invalid result.';
  END IF;

  v_family_id := NULLIF(
    v_result ->> 'family_id',
    ''
  )::uuid;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION
      'Household registration did not return family_id.';
  END IF;

  -- ==============================================
  -- 10. SAVE SECTION 10–18 ENTRIES
  -- ==============================================

  FOR v_section IN
    SELECT generate_series(10, 18)
  LOOP

    v_section_key :=
      'section_' || v_section::text;

    v_entries := COALESCE(
      p_extended_sections -> v_section_key,
      '[]'::jsonb
    );

    v_entry_number := 0;

    FOR v_entry IN
      SELECT value
      FROM jsonb_array_elements(v_entries)
    LOOP

      v_entry_number := v_entry_number + 1;

      INSERT INTO public.family_extended_sections (
        family_id,
        section_number,
        entry_number,
        details
      )
      VALUES (
        v_family_id,
        v_section,
        v_entry_number,
        v_entry
      );

    END LOOP;

  END LOOP;

  -- ==============================================
  -- 11. RETURN HOUSEHOLD REGISTRATION RESULT
  -- ==============================================

  RETURN v_result;

END;

$function$;

-- ==================================================
-- 4. RESTRICT FUNCTION EXECUTION
-- ==================================================

REVOKE ALL ON FUNCTION
public.register_household_with_extended_sections(
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
public.register_household_with_extended_sections(
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

-- ==================================================
-- 5. REFRESH SUPABASE API CACHE
-- ==================================================

NOTIFY pgrst, 'reload schema';
