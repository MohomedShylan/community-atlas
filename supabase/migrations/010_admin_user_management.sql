
-- ==================================================
-- COMMUNITY ATLAS
-- MIGRATION 010 - ADMINISTRATOR USER MANAGEMENT
--
-- Requires migrations 001 through 009.
-- Run as postgres in Supabase SQL Editor.
-- Make a backup before running.
-- ==================================================

BEGIN;

-- ==================================================
-- 1. APPROVAL STATUS
-- ==================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_status text;

-- Preserve existing approvals.
UPDATE public.profiles
SET
  is_active = COALESCE(is_active, false),
  approval_status =
    CASE
      WHEN COALESCE(is_active, false)
        THEN 'approved'
      ELSE 'pending'
    END
WHERE approval_status IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN approval_status
SET DEFAULT 'pending';

ALTER TABLE public.profiles
ALTER COLUMN approval_status
SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid =
      'public.profiles'::regclass
      AND conname =
        'profiles_approval_status_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_approval_status_check
    CHECK (
      approval_status IN (
        'pending',
        'approved',
        'suspended'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid =
      'public.profiles'::regclass
      AND conname =
        'profiles_approval_active_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_approval_active_check
    CHECK (
      is_active IS NOT DISTINCT FROM
        (approval_status = 'approved')
    );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS
  idx_010_profiles_status_role
ON public.profiles (
  approval_status,
  role
);


-- ==================================================
-- 2. PRIVATE ADMINISTRATIVE AUDIT TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS
private.staff_admin_audit (
  id bigint GENERATED ALWAYS AS IDENTITY
    PRIMARY KEY,

  actor_id uuid,
  target_user_id uuid NOT NULL,

  event_type text NOT NULL,

  previous_role text,
  new_role text,

  previous_status text,
  new_status text,

  previous_active boolean,
  new_active boolean,

  reason text,

  occurred_at timestamptz NOT NULL
    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  idx_010_admin_audit_time
ON private.staff_admin_audit (
  occurred_at DESC,
  id DESC
);

CREATE INDEX IF NOT EXISTS
  idx_010_admin_audit_target
ON private.staff_admin_audit (
  target_user_id,
  occurred_at DESC
);

-- The table is not exposed through the
-- public REST API. No client table access.
ALTER TABLE private.staff_admin_audit
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  private.staff_admin_audit
FROM PUBLIC, anon, authenticated;


-- ==================================================
-- 3. PROTECT PRIVILEGED PROFILE FIELDS
-- ==================================================

-- The migration and private Administrator RPC
-- functions are owned by postgres.
--
-- Normal authenticated users must not be able
-- to change role, is_active, approval_status,
-- or the profile identity directly.
--
-- Existing non-privileged profile fields still
-- follow your previous RLS policies.

CREATE OR REPLACE FUNCTION
private.guard_staff_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN

  IF TG_OP = 'INSERT' THEN

    IF current_user <> 'postgres' THEN

      IF NEW.role IS DISTINCT FROM 'viewer'
         OR NEW.is_active IS DISTINCT FROM false
         OR NEW.approval_status
              IS DISTINCT FROM 'pending' THEN

        RAISE EXCEPTION
          'New accounts must begin as pending Viewers'
          USING ERRCODE = '42501';

      END IF;

    END IF;

    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION
      'Profile identity cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active
          IS DISTINCT FROM OLD.is_active
     OR NEW.approval_status
          IS DISTINCT FROM OLD.approval_status
  THEN

    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION
        'Use the approved Administrator management API'
        USING ERRCODE = '42501';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_010_profile_privileges
ON public.profiles;

CREATE TRIGGER trg_010_profile_privileges
BEFORE INSERT OR UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION
  private.guard_staff_profile_privileges();

REVOKE ALL ON FUNCTION
  private.guard_staff_profile_privileges()
FROM PUBLIC, anon, authenticated;


-- ==================================================
-- 4. AUDIT ROLE AND APPROVAL CHANGES
-- ==================================================

CREATE OR REPLACE FUNCTION
private.log_staff_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event text;
  v_reason text;
BEGIN

  IF OLD.role IS DISTINCT FROM NEW.role
     AND OLD.approval_status
       IS DISTINCT FROM NEW.approval_status THEN

    v_event := 'role_and_status_changed';

  ELSIF OLD.role IS DISTINCT FROM NEW.role THEN

    v_event := 'role_changed';

  ELSIF NEW.approval_status = 'approved' THEN

    v_event := 'approved_or_reactivated';

  ELSIF NEW.approval_status = 'suspended' THEN

    v_event := 'suspended';

  ELSE

    v_event := 'approval_status_changed';

  END IF;

  v_reason := nullif(
    current_setting(
      'community_atlas.admin_reason',
      true
    ),
    ''
  );

  INSERT INTO private.staff_admin_audit (
    actor_id,
    target_user_id,
    event_type,

    previous_role,
    new_role,

    previous_status,
    new_status,

    previous_active,
    new_active,

    reason
  )
  VALUES (
    (SELECT auth.uid()),
    NEW.id,
    v_event,

    OLD.role::text,
    NEW.role::text,

    OLD.approval_status,
    NEW.approval_status,

    OLD.is_active,
    NEW.is_active,

    v_reason
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_010_profile_admin_audit
ON public.profiles;

CREATE TRIGGER trg_010_profile_admin_audit
AFTER UPDATE OF
  role,
  approval_status,
  is_active
ON public.profiles
FOR EACH ROW
WHEN (
  OLD.role IS DISTINCT FROM NEW.role
  OR OLD.approval_status
       IS DISTINCT FROM NEW.approval_status
  OR OLD.is_active IS DISTINCT FROM NEW.is_active
)
EXECUTE FUNCTION
  private.log_staff_profile_change();

REVOKE ALL ON FUNCTION
  private.log_staff_profile_change()
FROM PUBLIC, anon, authenticated;


-- ==================================================
-- 5. PRIVATE LIST STAFF USERS
-- ==================================================

CREATE OR REPLACE FUNCTION
private.admin_list_users_impl(
  p_search text,
  p_status text,
  p_page integer,
  p_page_size integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_search text;
  v_status text;
  v_page integer;
  v_size integer;
  v_offset bigint;

  v_result jsonb;
BEGIN

  v_actor := (SELECT auth.uid());

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_actor
      AND p.role = 'admin'
      AND p.is_active = true
      AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION
      'Administrator permission required'
      USING ERRCODE = '42501';
  END IF;

  v_search := lower(
    btrim(coalesce(p_search, ''))
  );

  IF char_length(v_search) > 120 THEN
    RAISE EXCEPTION
      'Search text is too long';
  END IF;

  v_status := lower(
    btrim(coalesce(p_status, 'all'))
  );

  IF v_status NOT IN (
    'all', 'pending', 'approved', 'suspended'
  ) THEN
    RAISE EXCEPTION
      'Invalid account status filter';
  END IF;

  v_page := greatest(
    1, coalesce(p_page, 1)
  );

  v_size := least(
    50,
    greatest(1, coalesce(p_page_size, 12))
  );

  v_offset :=
    (v_page::bigint - 1) * v_size;

  WITH matching AS MATERIALIZED (
    SELECT
      p.id,
      u.email,
      p.role::text AS role,
      p.approval_status,
      p.is_active,

      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at

    FROM public.profiles p

    JOIN auth.users u
      ON u.id = p.id

    WHERE (
      v_status = 'all'
      OR p.approval_status = v_status
    )

    AND (
      v_search = ''
      OR strpos(
        lower(coalesce(u.email, '')),
        v_search
      ) > 0

      OR strpos(
        lower(p.id::text),
        v_search
      ) > 0
    )
  ),

  total_rows AS (
    SELECT count(*)::integer AS total
    FROM matching
  ),

  page_rows AS (
    SELECT
      m.*,
      CASE m.approval_status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        ELSE 2
      END AS status_order

    FROM matching m

    ORDER BY
      CASE m.approval_status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        ELSE 2
      END,
      m.created_at DESC,
      m.id

    LIMIT v_size OFFSET v_offset
  )

  SELECT jsonb_build_object(
    'items',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'email', r.email,
            'role', r.role,
            'approval_status', r.approval_status,
            'is_active', r.is_active,
            'created_at', r.created_at,
            'last_sign_in_at', r.last_sign_in_at,
            'email_confirmed', (
              r.email_confirmed_at IS NOT NULL
            )
          )
          ORDER BY
            r.status_order,
            r.created_at DESC,
            r.id
        )
        FROM page_rows r
      ),
      '[]'::jsonb
    ),

    'total',
    (SELECT total FROM total_rows),

    'page', v_page,
    'page_size', v_size
  )
  INTO v_result;

  RETURN v_result;

END;
$$;


-- ==================================================
-- 6. PRIVATE ADMINISTRATIVE UPDATE FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION
private.admin_manage_user_impl(
  p_target_user_id uuid,
  p_action text,
  p_new_role text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_target public.profiles%ROWTYPE;

  v_action text;
  v_role text;
  v_reason text;
BEGIN

  v_actor := (SELECT auth.uid());

  IF v_actor IS NULL THEN
    RAISE EXCEPTION
      'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the acting Administrator.
  -- A simultaneous suspension or demotion
  -- cannot silently invalidate this action.
  PERFORM 1
  FROM public.profiles
  WHERE id = v_actor
    AND role = 'admin'
    AND is_active = true
    AND approval_status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Administrator permission required'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION
      'Select a user account';
  END IF;

  -- Prevent accidental self-lockout and
  -- preserve an active Administrator.
  IF p_target_user_id = v_actor THEN
    RAISE EXCEPTION
      'Administrators cannot change their own permissions or status'
      USING ERRCODE = '42501';
  END IF;

  v_action := lower(
    btrim(coalesce(p_action, ''))
  );

  IF v_action NOT IN (
    'approve', 'suspend', 'set_role'
  ) THEN
    RAISE EXCEPTION
      'Unsupported administration action';
  END IF;

  v_reason := btrim(
    coalesce(p_reason, '')
  );

  IF char_length(v_reason) NOT BETWEEN 8 AND 300 THEN
    RAISE EXCEPTION
      'Provide a reason of 8 to 300 characters';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'User profile not found';
  END IF;

  -- Used by the audit trigger for this
  -- transaction only.
  PERFORM set_config(
    'community_atlas.admin_reason',
    v_reason,
    true
  );

  IF v_action = 'approve' THEN

    IF v_target.approval_status = 'approved' THEN
      RAISE EXCEPTION
        'Account is already approved';
    END IF;

    UPDATE public.profiles
    SET
      approval_status = 'approved',
      is_active = true
    WHERE id = p_target_user_id;

  ELSIF v_action = 'suspend' THEN

    IF v_target.approval_status <> 'approved' THEN
      RAISE EXCEPTION
        'Only approved accounts can be suspended';
    END IF;

    UPDATE public.profiles
    SET
      approval_status = 'suspended',
      is_active = false
    WHERE id = p_target_user_id;

  ELSE

    v_role := lower(
      btrim(coalesce(p_new_role, ''))
    );

    IF v_role NOT IN (
      'admin', 'editor', 'viewer'
    ) THEN
      RAISE EXCEPTION
        'Invalid role';
    END IF;

    IF v_target.role::text = v_role THEN
      RAISE EXCEPTION
        'Account already has this role';
    END IF;

    UPDATE public.profiles
    SET role = v_role
    WHERE id = p_target_user_id;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'action', v_action
  );

END;
$$;


-- ==================================================
-- 7. PRIVATE ADMINISTRATIVE AUDIT READER
-- ==================================================

CREATE OR REPLACE FUNCTION
private.admin_list_audit_impl(
  p_page integer,
  p_page_size integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_page integer;
  v_size integer;
  v_offset bigint;

  v_result jsonb;
BEGIN

  v_actor := (SELECT auth.uid());

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_actor
      AND role = 'admin'
      AND is_active = true
      AND approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION
      'Administrator permission required'
      USING ERRCODE = '42501';
  END IF;

  v_page := greatest(
    1, coalesce(p_page, 1)
  );

  v_size := least(
    50,
    greatest(1, coalesce(p_page_size, 15))
  );

  v_offset :=
    (v_page::bigint - 1) * v_size;

  WITH page_rows AS (
    SELECT
      a.id,
      a.actor_id,
      a.target_user_id,
      a.event_type,

      a.previous_role,
      a.new_role,

      a.previous_status,
      a.new_status,

      a.previous_active,
      a.new_active,

      a.reason,
      a.occurred_at,

      actor.email AS actor_email,
      target.email AS target_email

    FROM private.staff_admin_audit a

    LEFT JOIN auth.users actor
      ON actor.id = a.actor_id

    LEFT JOIN auth.users target
      ON target.id = a.target_user_id

    ORDER BY
      a.occurred_at DESC,
      a.id DESC

    LIMIT v_size OFFSET v_offset
  )

  SELECT jsonb_build_object(
    'items',
    coalesce(
      (
        SELECT jsonb_agg(
          to_jsonb(r)
          ORDER BY r.occurred_at DESC, r.id DESC
        )
        FROM page_rows r
      ),
      '[]'::jsonb
    ),

    'total',
    (
      SELECT count(*)
      FROM private.staff_admin_audit
    ),

    'page', v_page,
    'page_size', v_size
  )
  INTO v_result;

  RETURN v_result;

END;
$$;


-- ==================================================
-- 8. PUBLIC SECURITY-INVOKER RPC WRAPPERS
-- ==================================================

CREATE OR REPLACE FUNCTION
public.admin_list_users(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_list_users_impl(
    p_search,
    p_status,
    p_page,
    p_page_size
  );
$$;


CREATE OR REPLACE FUNCTION
public.admin_manage_user(
  p_target_user_id uuid,
  p_action text,
  p_new_role text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_manage_user_impl(
    p_target_user_id,
    p_action,
    p_new_role,
    p_reason
  );
$$;


CREATE OR REPLACE FUNCTION
public.admin_list_audit(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.admin_list_audit_impl(
    p_page,
    p_page_size
  );
$$;


-- ==================================================
-- 9. FUNCTION PERMISSIONS
-- ==================================================

-- The private schema must not be included
-- in Supabase API Exposed Schemas.
--
-- Its helper functions still need execute
-- permission for the public invoker wrappers.

GRANT USAGE ON SCHEMA private
TO authenticated;

REVOKE ALL ON FUNCTION
private.admin_list_users_impl(
  text, text, integer, integer
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
private.admin_manage_user_impl(
  uuid, text, text, text
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
private.admin_list_audit_impl(
  integer, integer
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
private.admin_list_users_impl(
  text, text, integer, integer
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
private.admin_manage_user_impl(
  uuid, text, text, text
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
private.admin_list_audit_impl(
  integer, integer
)
TO authenticated;


REVOKE ALL ON FUNCTION
public.admin_list_users(
  text, text, integer, integer
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_manage_user(
  uuid, text, text, text
)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
public.admin_list_audit(
  integer, integer
)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION
public.admin_list_users(
  text, text, integer, integer
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_manage_user(
  uuid, text, text, text
)
TO authenticated;

GRANT EXECUTE ON FUNCTION
public.admin_list_audit(
  integer, integer
)
TO authenticated;

COMMIT;
