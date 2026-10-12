
-- ============================================
-- COMMUNITY ATLAS
-- STEP 8.4 - ADVANCED PEOPLE SEARCH
-- Requires migrations 001 through 007
-- ============================================

BEGIN;

-- Help PostgreSQL filter and join records.
CREATE INDEX IF NOT EXISTS
  idx_008_individuals_family_status
ON public.individuals (
  family_id,
  is_archived,
  full_name
);

CREATE INDEX IF NOT EXISTS
  idx_008_families_location_status
ON public.families (
  location_id,
  is_archived
);


-- ============================================
-- ADVANCED SEARCH RPC
-- ============================================

CREATE OR REPLACE FUNCTION
public.search_people_directory(
  p_search text DEFAULT '',
  p_family_id uuid DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_village text DEFAULT NULL,
  p_age_group text DEFAULT 'all',
  p_gender text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_sort text DEFAULT 'name_asc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_search text;
  v_age_group text;
  v_gender text;
  v_status text;
  v_sort text;

  v_page integer;
  v_page_size integer;
  v_offset bigint;

  v_result jsonb;
BEGIN

  -- ========================================
  -- 1. AUTHORIZATION
  -- ========================================

  IF NOT (SELECT private.is_approved()) THEN
    RAISE EXCEPTION
      'An approved account is required'
      USING ERRCODE = '42501';
  END IF;

  v_status := lower(
    btrim(coalesce(p_status, 'active'))
  );

  IF v_status NOT IN (
    'active', 'archived', 'all'
  ) THEN
    RAISE EXCEPTION 'Invalid record status';
  END IF;

  -- Only Administrators may request
  -- archived individual records.
  IF v_status <> 'active'
     AND NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION
      'Archived record search requires Administrator permission'
      USING ERRCODE = '42501';
  END IF;


  -- ========================================
  -- 2. VALIDATE FILTERS
  -- ========================================

  v_search := btrim(coalesce(p_search, ''));

  IF char_length(v_search) > 120 THEN
    RAISE EXCEPTION
      'Search text must be 120 characters or fewer';
  END IF;

  v_age_group := lower(
    btrim(coalesce(p_age_group, 'all'))
  );

  IF v_age_group NOT IN (
    'all',
    'child',
    'adult',
    'senior',
    'unknown'
  ) THEN
    RAISE EXCEPTION 'Invalid age group';
  END IF;

  v_gender := nullif(
    lower(btrim(coalesce(p_gender, ''))),
    ''
  );

  IF v_gender = 'all' THEN
    v_gender := NULL;
  END IF;

  IF v_gender IS NOT NULL
     AND v_gender NOT IN (
       'male',
       'female',
       'other',
       'prefer_not_to_say',
       'unspecified'
     ) THEN
    RAISE EXCEPTION 'Invalid gender filter';
  END IF;

  v_sort := lower(
    btrim(coalesce(p_sort, 'name_asc'))
  );

  IF v_sort NOT IN (
    'name_asc',
    'name_desc',
    'code_asc',
    'youngest',
    'oldest'
  ) THEN
    RAISE EXCEPTION 'Invalid sort option';
  END IF;

  v_page := greatest(
    1,
    coalesce(p_page, 1)
  );

  v_page_size := least(
    50,
    greatest(1, coalesce(p_page_size, 12))
  );

  v_offset :=
    (v_page::bigint - 1) * v_page_size;


  -- ========================================
  -- 3. SEARCH ACTIVE HOUSEHOLD RELATIONSHIPS
  -- ========================================

  WITH candidates AS MATERIALIZED (
    SELECT
      i.id,
      i.person_code,
      i.full_name,
      i.family_id,
      i.date_of_birth,
      i.gender,
      i.relationship_to_head,
      i.is_head,
      i.is_archived,

      f.family_code,
      f.family_name,

      l.id AS location_id,
      l.location_code,
      l.address_line,
      l.village,
      l.district,

      CASE
        WHEN i.date_of_birth IS NOT NULL
        THEN
          extract(
            year FROM age(
              CURRENT_DATE,
              i.date_of_birth
            )
          )::integer
        ELSE NULL
      END AS age_years

    FROM public.individuals i

    JOIN public.families f
      ON f.id = i.family_id

    JOIN public.locations l
      ON l.id = f.location_id

    -- Archived households are managed
    -- using the household restoration system.
    WHERE f.is_archived = false
      AND l.is_archived = false

      AND (
        p_family_id IS NULL
        OR f.id = p_family_id
      )

      AND (
        nullif(btrim(p_district), '') IS NULL
        OR lower(btrim(l.district)) =
           lower(btrim(p_district))
      )

      AND (
        nullif(btrim(p_village), '') IS NULL
        OR lower(btrim(l.village)) =
           lower(btrim(p_village))
      )

      AND (
        v_status = 'all'
        OR (
          v_status = 'active'
          AND i.is_archived = false
        )
        OR (
          v_status = 'archived'
          AND i.is_archived = true
        )
      )

      AND (
        v_gender IS NULL
        OR (
          v_gender = 'unspecified'
          AND i.gender IS NULL
        )
        OR (
          v_gender <> 'unspecified'
          AND i.gender = v_gender
        )
      )

      AND (
        v_search = ''
        OR strpos(
          lower(i.full_name),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(i.person_code),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(f.family_name),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(f.family_code),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(l.location_code),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(coalesce(l.address_line, '')),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(coalesce(l.village, '')),
          lower(v_search)
        ) > 0
        OR strpos(
          lower(coalesce(l.district, '')),
          lower(v_search)
        ) > 0
      )
  ),

  -- ========================================
  -- 4. AGE GROUP FILTER
  -- ========================================

  matched AS MATERIALIZED (
    SELECT *
    FROM candidates c
    WHERE
      v_age_group = 'all'

      OR (
        v_age_group = 'unknown'
        AND c.age_years IS NULL
      )

      OR (
        v_age_group = 'child'
        AND c.age_years BETWEEN 0 AND 17
      )

      OR (
        v_age_group = 'adult'
        AND c.age_years BETWEEN 18 AND 59
      )

      OR (
        v_age_group = 'senior'
        AND c.age_years >= 60
      )
  ),

  -- ========================================
  -- 5. STABLE SERVER-SIDE SORTING
  -- ========================================

  numbered AS (
    SELECT
      m.*,

      row_number() OVER (
        ORDER BY
          CASE WHEN v_sort = 'name_asc'
            THEN lower(m.full_name)
          END ASC NULLS LAST,

          CASE WHEN v_sort = 'name_desc'
            THEN lower(m.full_name)
          END DESC NULLS LAST,

          CASE WHEN v_sort = 'code_asc'
            THEN m.person_code
          END ASC NULLS LAST,

          CASE WHEN v_sort = 'youngest'
            THEN m.age_years
          END ASC NULLS LAST,

          CASE WHEN v_sort = 'oldest'
            THEN m.age_years
          END DESC NULLS LAST,

          lower(m.full_name) ASC,
          m.id ASC
      ) AS row_index

    FROM matched m
  ),

  -- ========================================
  -- 6. PAGE RESULTS
  -- ========================================

  page_rows AS (
    SELECT *
    FROM numbered
    WHERE row_index > v_offset
      AND row_index <=
        v_offset + v_page_size
  )

  SELECT jsonb_build_object(
    'items',
    coalesce(
      (
        SELECT jsonb_agg(
          to_jsonb(p) - 'row_index'
          ORDER BY p.row_index
        )
        FROM page_rows p
      ),
      '[]'::jsonb
    ),

    'total',
    (SELECT COUNT(*) FROM matched),

    'page',
    v_page,

    'page_size',
    v_page_size
  )

  INTO v_result;


  RETURN v_result;

END;
$$;


-- ============================================
-- 7. GRANT SECURE RPC ACCESS
-- ============================================

REVOKE ALL ON FUNCTION
public.search_people_directory(
  text, uuid, text, text, text,
  text, text, text, integer, integer
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.search_people_directory(
  text, uuid, text, text, text,
  text, text, text, integer, integer
)
TO authenticated;

COMMIT;
