
-- ============================================
-- COMMUNITY ATLAS
-- STEP 11.1 - RPC PERMISSION HARDENING
--
-- Revoke anonymous execution of known
-- management and reporting functions.
--
-- Existing function bodies are unchanged.
-- Missing functions are skipped.
-- ============================================

BEGIN;

DO $$
DECLARE
  v_function record;
BEGIN

  FOR v_function IN

    SELECT
      p.oid,
      p.oid::regprocedure AS signature

    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace

    WHERE n.nspname = 'public'

      AND p.proname IN (

        -- INDIVIDUAL REGISTRATION
        'register_individual',

        -- INDIVIDUAL LIFECYCLE
        'update_individual_details',
        'archive_individual',
        'restore_individual',
        'set_family_head',
        'transfer_individual',

        -- HOUSEHOLDS
        'save_household_changes',
        'archive_household',
        'restore_household',
        'update_location_details',

        -- SEARCH AND REPORTING
        'search_people_directory',
        'get_community_report',

        -- ADMINISTRATION
        'admin_list_users',
        'admin_manage_user',
        'admin_list_audit'

      )

  LOOP

    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',
      v_function.signature
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO authenticated',
      v_function.signature
    );

  END LOOP;

END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
