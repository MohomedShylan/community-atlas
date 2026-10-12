
-- =============================================
-- COMMUNITY ATLAS
-- MIGRATION 009 - REPORTS AND ANALYTICS
-- Requires migrations 001 through 008
-- =============================================

BEGIN;

-- ---------------------------------------------
-- 1. PERFORMANCE INDEXES
-- ---------------------------------------------

CREATE INDEX IF NOT EXISTS
  idx_009_families_active_location
ON public.families (location_id, id)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS
  idx_009_individuals_active_family
ON public.individuals (family_id)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS
  idx_009_locations_active_district_village
ON public.locations (district, village)
WHERE is_archived = false;


-- ---------------------------------------------
-- 2. COMMUNITY REPORT FUNCTION
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION
public.get_community_report(
  p_district text DEFAULT NULL,
  p_village text DEFAULT NULL,
  p_for_export boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_district text;
  v_village text;
  v_result jsonb;
BEGIN

  -- ===========================================
  -- AUTHORIZATION
  -- ===========================================

  IF NOT (SELECT private.is_approved()) THEN
    RAISE EXCEPTION
      'An approved account is required'
      USING ERRCODE = '42501';
  END IF;

  IF coalesce(p_for_export, false)
     AND NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION
      'Report export requires Administrator or Editor permission'
      USING ERRCODE = '42501';
  END IF;


  -- ===========================================
  -- FILTER VALIDATION
  -- ===========================================

  v_district :=
    nullif(btrim(coalesce(p_district, '')), '');

  v_village :=
    nullif(btrim(coalesce(p_village, '')), '');

  IF char_length(coalesce(v_district, '')) > 150
     OR char_length(coalesce(v_village, '')) > 150 THEN
    RAISE EXCEPTION
      'District or village filter is too long';
  END IF;


  -- ===========================================
  -- DATA COLLECTION
  -- ===========================================

  WITH

  -- All active families and their active
  -- household locations. This unfiltered set
  -- also supplies dropdown choices.
  all_families AS MATERIALIZED (
    SELECT
      f.id,
      f.location_id,

      coalesce(
        nullif(btrim(l.district), ''),
        'Unspecified'
      ) AS district,

      coalesce(
        nullif(btrim(l.village), ''),
        'Unspecified'
      ) AS village,

      (
        l.latitude IS NOT NULL
        AND l.longitude IS NOT NULL
        AND l.latitude BETWEEN -90 AND 90
        AND l.longitude BETWEEN -180 AND 180
      ) AS is_mapped

    FROM public.families f

    JOIN public.locations l
      ON l.id = f.location_id

    WHERE f.is_archived = false
      AND l.is_archived = false
  ),

  -- Apply selected district/village filters
  -- before calculating aggregates.
  selected_families AS MATERIALIZED (
    SELECT *
    FROM all_families f
    WHERE (
      v_district IS NULL
      OR f.district = v_district
    )
    AND (
      v_village IS NULL
      OR f.village = v_village
    )
  ),

  -- Only active individual records belonging
  -- to selected active families.
  active_people AS MATERIALIZED (
    SELECT
      i.id,
      i.family_id,

      CASE
        WHEN i.date_of_birth IS NULL
          OR i.date_of_birth > CURRENT_DATE
        THEN NULL

        ELSE extract(
          year FROM age(
            CURRENT_DATE,
            i.date_of_birth
          )
        )::integer
      END AS age_years,

      CASE
        WHEN i.gender IN (
          'male', 'female', 'other',
          'prefer_not_to_say'
        )
        THEN i.gender
        ELSE 'not_recorded'
      END AS gender_code

    FROM public.individuals i

    JOIN selected_families f
      ON f.id = i.family_id

    WHERE i.is_archived = false
  ),

  -- One row per family. Count people separately
  -- to avoid duplicating household totals.
  family_sizes AS MATERIALIZED (
    SELECT
      f.id,
      f.location_id,
      f.district,
      f.village,
      f.is_mapped,

      count(p.id)::integer AS member_count

    FROM selected_families f

    LEFT JOIN active_people p
      ON p.family_id = f.id

    GROUP BY
      f.id,
      f.location_id,
      f.district,
      f.village,
      f.is_mapped
  ),

  -- Geographic breakdown by district.
  district_stats AS (
    SELECT
      district,
      count(*)::integer AS families,

      coalesce(
        sum(member_count), 0
      )::bigint AS people,

      count(*) FILTER (
        WHERE is_mapped
      )::integer AS mapped_families

    FROM family_sizes
    GROUP BY district
  ),

  -- Geographic breakdown by village.
  village_stats AS (
    SELECT
      district,
      village,
      count(*)::integer AS families,

      coalesce(
        sum(member_count), 0
      )::bigint AS people

    FROM family_sizes
    GROUP BY district, village
  ),

  -- Age group assignments.
  age_totals AS (
    SELECT
      CASE
        WHEN age_years IS NULL
          THEN 'Unknown'
        WHEN age_years BETWEEN 0 AND 17
          THEN 'Children (0-17)'
        WHEN age_years BETWEEN 18 AND 59
          THEN 'Adults (18-59)'
        ELSE 'Seniors (60+)'
      END AS bucket,

      count(*)::integer AS people

    FROM active_people
    GROUP BY 1
  ),

  age_labels AS (
    SELECT *
    FROM (
      VALUES
        (1, 'Children (0-17)'),
        (2, 'Adults (18-59)'),
        (3, 'Seniors (60+)'),
        (4, 'Unknown')
    ) AS x(sort_order, bucket)
  ),

  -- Recorded gender is optional.
  gender_totals AS (
    SELECT
      gender_code,
      count(*)::integer AS people
    FROM active_people
    GROUP BY gender_code
  ),

  gender_labels AS (
    SELECT *
    FROM (
      VALUES
        (1, 'male', 'Male'),
        (2, 'female', 'Female'),
        (3, 'other', 'Other'),
        (
          4,
          'prefer_not_to_say',
          'Prefer not to say'
        ),
        (5, 'not_recorded', 'Not recorded')
    ) AS x(sort_order, code, label)
  ),

  -- Distribution of active family sizes.
  size_totals AS (
    SELECT
      CASE
        WHEN member_count = 0 THEN '0'
        WHEN member_count = 1 THEN '1'
        WHEN member_count BETWEEN 2 AND 3
          THEN '2-3'
        WHEN member_count BETWEEN 4 AND 5
          THEN '4-5'
        ELSE '6+'
      END AS bucket,

      count(*)::integer AS families

    FROM family_sizes
    GROUP BY 1
  ),

  size_labels AS (
    SELECT *
    FROM (
      VALUES
        (1, '0'),
        (2, '1'),
        (3, '2-3'),
        (4, '4-5'),
        (5, '6+')
    ) AS x(sort_order, bucket)
  )

  -- ===========================================
  -- BUILD JSON REPORT
  -- ===========================================

  SELECT jsonb_build_object(

    'generated_at',
    to_char(
      CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),

    'selected_filters',
    jsonb_build_object(
      'district', v_district,
      'village', v_village
    ),

    -- ----------------------------------------
    -- SUMMARY
    -- ----------------------------------------
    'summary',
    (
      SELECT jsonb_build_object(
        'families',
          count(*),

        'individuals',
          coalesce(sum(member_count), 0),

        'locations_in_use',
          count(DISTINCT location_id),

        'mapped_locations',
          count(DISTINCT location_id)
            FILTER (WHERE is_mapped),

        'families_needing_mapping',
          count(*)
            FILTER (WHERE NOT is_mapped),

        'average_family_size',
          coalesce(
            round(avg(member_count), 1),
            0
          ),

        'districts',
          count(DISTINCT district),

        'villages',
          count(DISTINCT (district, village))

      )
      FROM family_sizes
    ),

    -- ----------------------------------------
    -- AVAILABLE FILTER OPTIONS
    -- ----------------------------------------
    'filters',
    jsonb_build_object(

      'districts',
      coalesce(
        (
          SELECT jsonb_agg(
            x.district ORDER BY x.district
          )
          FROM (
            SELECT DISTINCT district
            FROM all_families
          ) x
        ),
        '[]'::jsonb
      ),

      'villages',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'district', x.district,
              'village', x.village
            )
            ORDER BY
              x.district, x.village
          )
          FROM (
            SELECT DISTINCT district, village
            FROM all_families
          ) x
        ),
        '[]'::jsonb
      )
    ),

    -- ----------------------------------------
    -- DISTRICTS
    -- ----------------------------------------
    'districts',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', district,
            'families', families,
            'people', people,
            'mapped_families', mapped_families
          )
          ORDER BY people DESC, district
        )
        FROM district_stats
      ),
      '[]'::jsonb
    ),

    -- ----------------------------------------
    -- VILLAGES
    -- ----------------------------------------
    'villages',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'district', district,
            'name', village,
            'families', families,
            'people', people
          )
          ORDER BY people DESC, district, village
        )
        FROM village_stats
      ),
      '[]'::jsonb
    ),

    -- ----------------------------------------
    -- AGE GROUPS
    -- ----------------------------------------
    'ages',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', a.bucket,
            'value', coalesce(t.people, 0)
          )
          ORDER BY a.sort_order
        )
        FROM age_labels a
        LEFT JOIN age_totals t
          ON t.bucket = a.bucket
      ),
      '[]'::jsonb
    ),

    -- ----------------------------------------
    -- GENDER GROUPS
    -- ----------------------------------------
    'genders',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', g.label,
            'value', coalesce(t.people, 0)
          )
          ORDER BY g.sort_order
        )
        FROM gender_labels g
        LEFT JOIN gender_totals t
          ON t.gender_code = g.code
      ),
      '[]'::jsonb
    ),

    -- ----------------------------------------
    -- FAMILY SIZES
    -- ----------------------------------------
    'household_sizes',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', s.bucket,
            'families', coalesce(t.families, 0)
          )
          ORDER BY s.sort_order
        )
        FROM size_labels s
        LEFT JOIN size_totals t
          ON t.bucket = s.bucket
      ),
      '[]'::jsonb
    )

  )
  INTO v_result;

  RETURN v_result;

END;
$$;


-- ---------------------------------------------
-- 3. EXECUTION PERMISSIONS
-- ---------------------------------------------

REVOKE ALL ON FUNCTION
public.get_community_report(
  text, text, boolean
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.get_community_report(
  text, text, boolean
)
TO authenticated;

COMMIT;
