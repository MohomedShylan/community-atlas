
-- ============================================
-- COMMUNITY ATLAS
-- SECTION 09 - FAMILY MEMBER SUBSIDIES
--
-- One family may have multiple subsidies.
-- The same recipient may appear multiple times.
--
-- Sensitive account details are stored
-- separately from family_information_sheet.
--
-- Requires:
-- - public.register_household_with_lands()
-- - public.families
-- - private.can_edit()
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE SUBSIDY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS
public.family_subsidies (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),

  family_id uuid NOT NULL
    REFERENCES public.families(id),

  entry_number integer NOT NULL
    CHECK (
      entry_number BETWEEN 1 AND 50
    ),

  recipient_name text NOT NULL,

  assistance_type text NOT NULL
    CHECK (
      assistance_type IN (
        'samurdhi',
        'elderly',
        'disability_public',
        'cancer_tuberculosis',
        'special_government',
        'scholarship_mahapola'
      )
    ),

  amount_text text,

  card_or_account_number text,

  start_date_text text,

  institution text,

  representative_name text,

  other_information text,

  created_at timestamptz NOT NULL
    DEFAULT now(),

  UNIQUE (family_id, entry_number)
);

COMMENT ON TABLE
  public.family_subsidies
IS
  'Section 9 subsidy information. Contains '
  'sensitive assistance and financial information.';

CREATE INDEX IF NOT EXISTS
  idx_family_subsidies_family_id
ON public.family_subsidies (family_id);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.family_subsidies
ENABLE ROW LEVEL SECURITY;

-- Do not expose this table to anonymous
-- users or to ordinary public access.

REVOKE ALL ON public.family_subsidies
FROM PUBLIC, anon, authenticated;

-- Application writes happen through the
-- new SECURITY INVOKER function.
--
-- Authenticated users still need table
-- privileges. RLS restricts these to
-- authorized Administrators and Editors.

GRANT SELECT, INSERT
ON public.family_subsidies
TO authenticated;

-- ============================================
-- 3. SELECT POLICY
-- ============================================

DROP POLICY IF EXISTS
  ca_subsidies_select
ON public.family_subsidies;

CREATE POLICY ca_subsidies_select
ON public.family_subsidies
FOR SELECT
TO authenticated
USING (
  (SELECT private.can_edit())
  AND EXISTS (
    SELECT 1
    FROM public.families f
    WHERE f.id = family_subsidies.family_id
      AND f.is_archived = false
  )
);

-- ============================================
-- 4. INSERT POLICY
-- ============================================

DROP POLICY IF EXISTS
  ca_subsidies_insert
ON public.family_subsidies;

CREATE POLICY ca_subsidies_insert
ON public.family_subsidies
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT private.can_edit())
  AND EXISTS (
    SELECT 1
    FROM public.families f
    WHERE f.id = family_subsidies.family_id
      AND f.is_archived = false
  )
);

-- ============================================
-- 5. REGISTER HOUSEHOLD WITH SUBSIDIES
--
-- Registers Sections 1, 6, 7 and 8
-- through the existing function, then
-- saves Section 9 in the same transaction.
-- ============================================

CREATE OR REPLACE FUNCTION
public.register_household_with_subsidies(
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
  p_subsidies jsonb
)
RETURNS jsonb

LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''

AS $$
DECLARE
  v_result jsonb;
  v_family_id uuid;

  v_item jsonb;
  v_entry_number integer := 0;

  v_recipient_name text;
  v_assistance_type text;

  v_amount text;
  v_account text;
  v_start_date text;
  v_institution text;
  v_representative text;
  v_other text;

  v_valid_recipient boolean;

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
  -- 2. VALIDATE SECTION 9 ARRAY
  -- ==========================================

  IF p_subsidies IS NULL
    OR jsonb_typeof(p_subsidies) <> 'array'
  THEN
    RAISE EXCEPTION
      'Section 9 subsidies must be an array.';
  END IF;

  IF jsonb_array_length(p_subsidies) > 50
  THEN
    RAISE EXCEPTION
      'A maximum of 50 subsidy entries is allowed.';
  END IF;

  -- Subsidies may be empty if the family
  -- receives no assistance.

  IF p_members IS NULL
    OR jsonb_typeof(p_members) <> 'array'
  THEN
    RAISE EXCEPTION
      'Family member information is invalid.';
  END IF;

  -- ==========================================
  -- 3. VALIDATE EVERY SUBSIDY ENTRY
  -- ==========================================

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_subsidies)
  LOOP

    v_entry_number := v_entry_number + 1;

    IF jsonb_typeof(v_item) <> 'object'
    THEN
      RAISE EXCEPTION
        'Subsidy % must be an object.',
        v_entry_number;
    END IF;

    -- Recipient name

    v_recipient_name := nullif(
      btrim(
        coalesce(
          v_item->>'recipient_name',
          ''
        )
      ),
      ''
    );

    IF v_recipient_name IS NULL
      OR char_length(v_recipient_name) > 150
    THEN
      RAISE EXCEPTION
        'Subsidy % requires a valid recipient name.',
        v_entry_number;
    END IF;

    -- Recipient must be listed among
    -- the family members being registered.

    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_members)
        AS person(value)
      WHERE lower(
        btrim(
          coalesce(
            person.value->>'full_name',
            ''
          )
        )
      ) = lower(v_recipient_name)
    )
    INTO v_valid_recipient;

    IF NOT v_valid_recipient THEN
      RAISE EXCEPTION
        'Subsidy % recipient must match a registered family member.',
        v_entry_number;
    END IF;

    -- Subsidy type

    v_assistance_type := nullif(
      btrim(
        coalesce(
          v_item->>'assistance_type',
          ''
        )
      ),
      ''
    );

    IF v_assistance_type IS NULL
      OR v_assistance_type NOT IN (
        'samurdhi',
        'elderly',
        'disability_public',
        'cancer_tuberculosis',
        'special_government',
        'scholarship_mahapola'
      )
    THEN
      RAISE EXCEPTION
        'Subsidy % has an invalid assistance type.',
        v_entry_number;
    END IF;

    -- Amount (free-text response)

    v_amount := nullif(
      btrim(
        coalesce(
          v_item->>'amount_text',
          ''
        )
      ),
      ''
    );

    -- Card or account number
    -- Stored as text to preserve leading zeros.

    v_account := nullif(
      btrim(
        coalesce(
          v_item->>'card_or_account_number',
          ''
        )
      ),
      ''
    );

    -- Started date as supplied in the form.

    v_start_date := nullif(
      btrim(
        coalesce(
          v_item->>'start_date_text',
          ''
        )
      ),
      ''
    );

    -- Bank or post office

    v_institution := nullif(
      btrim(
        coalesce(
          v_item->>'institution',
          ''
        )
      ),
      ''
    );

    -- Appointed representative

    v_representative := nullif(
      btrim(
        coalesce(
          v_item->>'representative_name',
          ''
        )
      ),
      ''
    );

    -- Additional information

    v_other := nullif(
      btrim(
        coalesce(
          v_item->>'other_information',
          ''
        )
      ),
      ''
    );

    -- ========================================
    -- 4. VALIDATE FIELD LENGTHS
    -- ========================================

    IF char_length(
      coalesce(v_amount, '')
    ) > 50
    THEN
      RAISE EXCEPTION
        'Subsidy % amount is too long.',
        v_entry_number;
    END IF;

    IF char_length(
      coalesce(v_account, '')
    ) > 100
    THEN
      RAISE EXCEPTION
        'Subsidy % card/account number is too long.',
        v_entry_number;
    END IF;

    IF char_length(
      coalesce(v_start_date, '')
    ) > 100
    THEN
      RAISE EXCEPTION
        'Subsidy % start date is too long.',
        v_entry_number;
    END IF;

    IF char_length(
      coalesce(v_institution, '')
    ) > 200
    THEN
      RAISE EXCEPTION
        'Subsidy % bank/post office name is too long.',
        v_entry_number;
    END IF;

    IF char_length(
      coalesce(v_representative, '')
    ) > 150
    THEN
      RAISE EXCEPTION
        'Subsidy % representative name is too long.',
        v_entry_number;
    END IF;

    IF char_length(
      coalesce(v_other, '')
    ) > 1000
    THEN
      RAISE EXCEPTION
        'Subsidy % other information is too long.',
        v_entry_number;
    END IF;

  END LOOP;

  -- ==========================================
  -- 5. REGISTER SECTIONS 1, 6, 7 AND 8
  --
  -- Existing function handles:
  --
  -- - Location
  -- - Family
  -- - Member records
  -- - Private document paths
  -- - Family Information Sheet
  -- - Housing information
  -- - Multiple lands
  -- ==========================================

  SELECT public.register_household_with_lands(
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
    p_lands
  )
  INTO v_result;

  -- ==========================================
  -- 6. GET THE NEW FAMILY ID
  -- ==========================================

  v_family_id :=
    (v_result->>'family_id')::uuid;

  -- ==========================================
  -- 7. SAVE ALL SUBSIDIES
  -- ==========================================

  v_entry_number := 0;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_subsidies)
  LOOP

    v_entry_number := v_entry_number + 1;

    INSERT INTO public.family_subsidies (
      family_id,
      entry_number,
      recipient_name,
      assistance_type,
      amount_text,
      card_or_account_number,
      start_date_text,
      institution,
      representative_name,
      other_information
    )
    VALUES (
      v_family_id,

      v_entry_number,

      nullif(
        btrim(
          coalesce(
            v_item->>'recipient_name',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'assistance_type',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'amount_text',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'card_or_account_number',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'start_date_text',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'institution',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'representative_name',
            ''
          )
        ),
        ''
      ),

      nullif(
        btrim(
          coalesce(
            v_item->>'other_information',
            ''
          )
        ),
        ''
      )
    );

  END LOOP;

  -- ==========================================
  -- 8. RETURN REGISTRATION RESULT
  -- ==========================================

  RETURN v_result;

END;
$$;

-- ============================================
-- 6. RESTRICT RPC EXECUTION
-- ============================================

REVOKE ALL ON FUNCTION
public.register_household_with_subsidies(
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
  jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.register_household_with_subsidies(
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
  jsonb
)
TO authenticated;

COMMIT;

-- ============================================
-- 7. REFRESH API SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';
