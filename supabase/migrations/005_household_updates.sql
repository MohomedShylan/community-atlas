-- Community Atlas / Step 7.2
-- Builds on migrations 001 through 004. Execute once on a backed-up database.
BEGIN;

-- The earlier RLS policies allowed approved staff to see archived records.
-- Harden SELECT and UPDATE before enabling removal and restoration.
DROP POLICY IF EXISTS locations_select ON public.locations;
CREATE POLICY locations_select ON public.locations FOR SELECT TO authenticated
USING ((SELECT private.is_approved()) AND (NOT is_archived OR (SELECT private.is_admin())));

DROP POLICY IF EXISTS locations_update ON public.locations;
-- Location changes affect everyone using that address: administrator-only.
CREATE POLICY locations_update ON public.locations FOR UPDATE TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS families_select ON public.families;
CREATE POLICY families_select ON public.families FOR SELECT TO authenticated
USING ((SELECT private.is_approved()) AND (NOT is_archived OR (SELECT private.is_admin())));

DROP POLICY IF EXISTS families_update ON public.families;
CREATE POLICY families_update ON public.families FOR UPDATE TO authenticated
USING ((SELECT private.is_admin()) OR ((SELECT private.can_edit()) AND NOT is_archived))
WITH CHECK ((SELECT private.is_admin()) OR ((SELECT private.can_edit()) AND NOT is_archived));

DROP POLICY IF EXISTS individuals_select ON public.individuals;
CREATE POLICY individuals_select ON public.individuals FOR SELECT TO authenticated
USING (
  (SELECT private.is_approved()) AND
  (
    (SELECT private.is_admin())
    OR (
      NOT is_archived AND EXISTS (
        SELECT 1 FROM public.families f
        WHERE f.id = individuals.family_id AND NOT f.is_archived
      )
    )
  )
);

DROP POLICY IF EXISTS individuals_update ON public.individuals;
CREATE POLICY individuals_update ON public.individuals FOR UPDATE TO authenticated
USING (
  (SELECT private.is_admin()) OR (
    (SELECT private.can_edit()) AND NOT is_archived AND
    EXISTS (SELECT 1 FROM public.families f WHERE f.id = individuals.family_id AND NOT f.is_archived)
  )
)
WITH CHECK (
  (SELECT private.is_admin()) OR (
    (SELECT private.can_edit()) AND NOT is_archived AND
    EXISTS (SELECT 1 FROM public.families f WHERE f.id = individuals.family_id AND NOT f.is_archived)
  )
);

-- Read the old schema's INSERT policies as-is: approved Editors may still
-- register families and individuals; they cannot alter archived records.
REVOKE DELETE ON public.locations, public.families, public.individuals FROM PUBLIC, anon, authenticated;

-- Prevent reassignment of IDs, family codes, and location links through
-- direct REST UPDATE calls. Step 7.2 provides a separate managed location edit.
CREATE OR REPLACE FUNCTION private.protect_household_links()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Record ID cannot be changed';
  END IF;
  IF TG_TABLE_NAME = 'locations' THEN
    IF NEW.location_code IS DISTINCT FROM OLD.location_code THEN
      RAISE EXCEPTION 'Location code cannot be changed';
    END IF;
    IF NEW.is_archived AND NOT OLD.is_archived AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.location_id = OLD.id AND NOT f.is_archived
    ) THEN
      RAISE EXCEPTION 'Cannot archive a location with active families';
    END IF;
  ELSIF TG_TABLE_NAME = 'families' THEN
    IF NEW.family_code IS DISTINCT FROM OLD.family_code OR
       NEW.location_id IS DISTINCT FROM OLD.location_id THEN
      RAISE EXCEPTION 'Family code and location link cannot be reassigned';
    END IF;
  ELSIF TG_TABLE_NAME = 'individuals' THEN
    IF NEW.person_code IS DISTINCT FROM OLD.person_code OR
       NEW.family_id IS DISTINCT FROM OLD.family_id THEN
      RAISE EXCEPTION 'Person code and family link cannot be reassigned';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_location_links BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION private.protect_household_links();
CREATE TRIGGER trg_family_links BEFORE UPDATE ON public.families
FOR EACH ROW EXECUTE FUNCTION private.protect_household_links();
CREATE TRIGGER trg_person_links BEFORE UPDATE ON public.individuals
FOR EACH ROW EXECUTE FUNCTION private.protect_household_links();
REVOKE ALL ON FUNCTION private.protect_household_links() FROM PUBLIC, anon, authenticated;

-- Edit an existing family and any explicitly included members ATOMICALLY.
-- Omitting an existing member does not remove them; an explicit is_archived=true
-- archives that member and requires Administrator privileges.
CREATE OR REPLACE FUNCTION public.save_household_changes(
  p_family_id uuid,
  p_family_name text,
  p_contact_phone text,
  p_members jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_family_id uuid;
  v_item jsonb;
  v_member_id uuid;
  v_old_family uuid;
  v_old_archived boolean;
  v_archived boolean;
  v_head boolean;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_head_count integer := 0;
  v_member_count integer := 0;
  v_name text;
  v_relationship text;
BEGIN
  IF NOT (SELECT private.can_edit()) THEN
    RAISE EXCEPTION 'Only active Administrators and Editors can edit households' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_family_id FROM public.families
  WHERE id = p_family_id AND NOT is_archived FOR UPDATE;
  IF v_family_id IS NULL THEN RAISE EXCEPTION 'Active family not found'; END IF;

  IF char_length(btrim(coalesce(p_family_name,''))) NOT BETWEEN 2 AND 150 THEN
    RAISE EXCEPTION 'Family name must contain 2 to 150 characters';
  END IF;
  IF char_length(coalesce(p_contact_phone,'')) > 30 THEN
    RAISE EXCEPTION 'Contact phone must be at most 30 characters';
  END IF;
  IF p_members IS NULL OR jsonb_typeof(p_members) <> 'array' THEN
    RAISE EXCEPTION 'Members must be a JSON array';
  END IF;
  IF jsonb_array_length(p_members) NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION 'Provide between 1 and 25 member entries';
  END IF;

  -- Validate the whole payload before changing the family or its members.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN RAISE EXCEPTION 'Invalid member entry'; END IF;
    v_name := btrim(coalesce(v_item->>'full_name',''));
    v_relationship := btrim(coalesce(v_item->>'relationship_to_head',''));
    v_archived := coalesce((v_item->>'is_archived')::boolean,false);
    v_head := coalesce((v_item->>'is_head')::boolean,false);
    IF char_length(v_name) NOT BETWEEN 2 AND 150 THEN
      RAISE EXCEPTION 'Every member name must contain 2 to 150 characters';
    END IF;
    IF char_length(v_relationship) > 100 THEN
      RAISE EXCEPTION 'Relationship must be at most 100 characters';
    END IF;
    IF v_archived AND v_head THEN RAISE EXCEPTION 'An archived member cannot be family head'; END IF;
    IF v_head AND NOT v_archived THEN v_head_count := v_head_count + 1; END IF;
    IF v_item ? 'id' AND NULLIF(v_item->>'id','') IS NOT NULL THEN
      v_member_id := (v_item->>'id')::uuid;
      IF v_member_id = ANY(v_seen) THEN RAISE EXCEPTION 'Duplicate member ID in request'; END IF;
      v_seen := array_append(v_seen, v_member_id);
      SELECT family_id, is_archived INTO v_old_family, v_old_archived
      FROM public.individuals WHERE id = v_member_id FOR UPDATE;
      IF v_old_family IS NULL OR v_old_family <> p_family_id THEN
        RAISE EXCEPTION 'Member does not belong to this family';
      END IF;
      IF v_archived IS DISTINCT FROM v_old_archived AND NOT (SELECT private.is_admin()) THEN
        RAISE EXCEPTION 'Only Administrators may archive or restore members' USING ERRCODE = '42501';
      END IF;
    ELSIF v_archived THEN
      RAISE EXCEPTION 'Cannot create a member as archived';
    END IF;
  END LOOP;
  IF v_head_count <> 1 THEN
    RAISE EXCEPTION 'Exactly one ACTIVE member must be selected as family head';
  END IF;

  UPDATE public.families SET
    family_name = btrim(p_family_name),
    contact_phone = NULLIF(btrim(coalesce(p_contact_phone,'')), '')
  WHERE id = p_family_id;

  -- The partial unique head index from migration 001 requires clearing heads
  -- before assigning the new head. Everything rolls back on any failure.
  UPDATE public.individuals SET is_head = false
  WHERE family_id = p_family_id AND is_head = true AND NOT is_archived;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    v_name := btrim(v_item->>'full_name');
    v_relationship := NULLIF(btrim(coalesce(v_item->>'relationship_to_head','')), '');
    v_archived := coalesce((v_item->>'is_archived')::boolean,false);
    v_head := coalesce((v_item->>'is_head')::boolean,false);

    IF v_item ? 'id' AND NULLIF(v_item->>'id','') IS NOT NULL THEN
      v_member_id := (v_item->>'id')::uuid;
      UPDATE public.individuals SET
        full_name = v_name,
        relationship_to_head = v_relationship,
        is_head = v_head,
        is_archived = v_archived
      WHERE id = v_member_id AND family_id = p_family_id;
    ELSE
      INSERT INTO public.individuals (
        person_code, family_id, full_name, relationship_to_head, is_head
      ) VALUES (
        'P-' || lpad(nextval('public.community_person_seq'::regclass)::text,6,'0'),
        p_family_id, v_name, v_relationship, v_head
      );
    END IF;
  END LOOP;

  SELECT count(*) INTO v_member_count FROM public.individuals
  WHERE family_id = p_family_id AND NOT is_archived;
  IF v_member_count < 1 THEN RAISE EXCEPTION 'Family must have an active member'; END IF;
  IF (SELECT count(*) FROM public.individuals
      WHERE family_id = p_family_id AND NOT is_archived AND is_head) <> 1 THEN
    RAISE EXCEPTION 'Family must have exactly one active head';
  END IF;

  RETURN jsonb_build_object('family_id', p_family_id, 'active_members', v_member_count);
END;
$$;

-- Remove (archive) one family. Other families at the same address stay active.
-- A location is archived only when it has no remaining active families.
CREATE OR REPLACE FUNCTION public.archive_household(
  p_family_id uuid, p_confirm_code text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_code text;
  v_location uuid;
  v_remaining integer;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Only Administrators may remove households' USING ERRCODE = '42501';
  END IF;
  SELECT family_code, location_id INTO v_code, v_location
  FROM public.families WHERE id = p_family_id AND NOT is_archived FOR UPDATE;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Active household not found'; END IF;
  IF p_confirm_code IS DISTINCT FROM v_code THEN
    RAISE EXCEPTION 'Family code confirmation does not match';
  END IF;
  UPDATE public.families SET is_archived = true WHERE id = p_family_id;
  SELECT count(*) INTO v_remaining FROM public.families
  WHERE location_id = v_location AND NOT is_archived;
  IF v_remaining = 0 THEN
    UPDATE public.locations SET is_archived = true WHERE id = v_location;
  END IF;
  RETURN jsonb_build_object('family_id',p_family_id,'family_code',v_code,'remaining_families',v_remaining);
END;
$$;

-- Restore an archived family AND reactivate its previous location if needed.
-- Members retain their individual archive flags (no accidental un-archiving).
CREATE OR REPLACE FUNCTION public.restore_household(p_family_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_location uuid;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Only Administrators may restore households' USING ERRCODE = '42501';
  END IF;
  SELECT location_id INTO v_location FROM public.families
  WHERE id = p_family_id AND is_archived FOR UPDATE;
  IF v_location IS NULL THEN RAISE EXCEPTION 'Archived household not found'; END IF;
  UPDATE public.locations SET is_archived = false WHERE id = v_location;
  UPDATE public.families SET is_archived = false WHERE id = p_family_id;
  RETURN jsonb_build_object('family_id',p_family_id);
END;
$$;

-- Location edits are Administrator-only. Shared addresses require explicit
-- confirmation in the RPC, enforced in the database.
CREATE OR REPLACE FUNCTION public.update_location_details(
  p_location_id uuid, p_address_line text,
  p_village text, p_district text,
  p_latitude numeric, p_longitude numeric,
  p_confirm_shared boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_location uuid;
  v_families integer;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'Only Administrators may edit locations' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_location FROM public.locations
  WHERE id = p_location_id AND NOT is_archived FOR UPDATE;
  IF v_location IS NULL THEN RAISE EXCEPTION 'Active location not found'; END IF;
  IF char_length(btrim(coalesce(p_address_line,''))) NOT BETWEEN 3 AND 300 THEN
    RAISE EXCEPTION 'Address must contain 3 to 300 characters';
  END IF;
  IF char_length(coalesce(p_village,'')) > 120 OR char_length(coalesce(p_district,'')) > 120 THEN
    RAISE EXCEPTION 'Village and district must be at most 120 characters';
  END IF;
  IF p_latitude IS NULL OR p_longitude IS NULL OR
     p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Both valid GPS coordinates are required';
  END IF;
  SELECT count(*) INTO v_families FROM public.families
  WHERE location_id = p_location_id AND NOT is_archived;
  IF v_families > 1 AND NOT p_confirm_shared THEN
    RAISE EXCEPTION 'Shared location: confirm changes affecting all families';
  END IF;
  UPDATE public.locations SET
    address_line = btrim(p_address_line),
    village = NULLIF(btrim(coalesce(p_village,'')),''),
    district = NULLIF(btrim(coalesce(p_district,'')),''),
    latitude = p_latitude, longitude = p_longitude
  WHERE id = p_location_id;
  RETURN jsonb_build_object('location_id',p_location_id,'affected_families',v_families);
END;
$$;

-- Lock down exposed RPC endpoints to logged-in callers; their internal role
-- checks and table RLS make Viewer/unapproved actions fail.
REVOKE ALL ON FUNCTION public.save_household_changes(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_household(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_household(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_location_details(uuid,text,text,text,numeric,numeric,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_household_changes(uuid,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_household(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_household(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_location_details(uuid,text,text,text,numeric,numeric,boolean) TO authenticated;
COMMIT;
