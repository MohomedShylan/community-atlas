
-- ============================================
-- COMMUNITY ATLAS
-- STEP 5.7 - ROW LEVEL SECURITY POLICIES
-- ============================================

-- Designed for the database from Steps 5.5
-- and 5.6. Run once on that database.

begin;


-- ============================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles
enable row level security;

alter table public.locations
enable row level security;

alter table public.families
enable row level security;

alter table public.individuals
enable row level security;


-- ============================================
-- 2. RESTRICT DEFAULT TABLE PERMISSIONS
-- ============================================

-- Remove existing client table permissions.
-- PUBLIC means every PostgreSQL role here.

revoke all on table public.profiles
from PUBLIC, anon, authenticated;

revoke all on table public.locations
from PUBLIC, anon, authenticated;

revoke all on table public.families
from PUBLIC, anon, authenticated;

revoke all on table public.individuals
from PUBLIC, anon, authenticated;


-- ============================================
-- 3. GRANT NECESSARY CLIENT PERMISSIONS
-- ============================================

-- Profiles:
-- Signed-in users can read permitted profiles.
-- Only administrators pass the UPDATE RLS policy.
-- Normal clients cannot INSERT or DELETE profiles.

grant select, update
on table public.profiles
to authenticated;


-- Locations:
grant select, insert, update
on table public.locations
to authenticated;


-- Families:
grant select, insert, update
on table public.families
to authenticated;


-- Individuals:
grant select, insert, update
on table public.individuals
to authenticated;


-- ============================================
-- 4. PRIVATE AUTHORIZATION HELPERS
-- ============================================

-- These functions were created in Step 5.6.
-- They must not be directly exposed as API RPCs.

revoke all on schema private
from PUBLIC, anon;

grant usage on schema private
to authenticated;

grant execute on function private.is_approved()
to authenticated;

grant execute on function private.is_admin()
to authenticated;

grant execute on function private.can_edit()
to authenticated;


-- ============================================
-- 5. PROFILES: SELECT POLICY
-- ============================================

-- Users can read their own profile, including
-- when awaiting approval.
-- Active administrators can read all profiles.

create policy "profiles_select"

on public.profiles

for select

to authenticated

using (
  id = (select auth.uid())
  or
  (select private.is_admin())
);


-- ============================================
-- 6. PROFILES: UPDATE POLICY
-- ============================================

-- Only active administrators can modify
-- profile details, roles or approval status.

create policy "profiles_update"

on public.profiles

for update

to authenticated

using (
  (select private.is_admin())
)

with check (
  (select private.is_admin())
);


-- ============================================
-- 7. LOCATIONS: SELECT POLICY
-- ============================================

create policy "locations_select"

on public.locations

for select

to authenticated

using (
  (select private.is_approved())
);


-- ============================================
-- 8. LOCATIONS: INSERT POLICY
-- ============================================

create policy "locations_insert"

on public.locations

for insert

to authenticated

with check (
  (select private.can_edit())
);


-- ============================================
-- 9. LOCATIONS: UPDATE POLICY
-- ============================================

create policy "locations_update"

on public.locations

for update

to authenticated

using (
  (select private.can_edit())
)

with check (
  (select private.can_edit())
);


-- ============================================
-- 10. FAMILIES: SELECT POLICY
-- ============================================

create policy "families_select"

on public.families

for select

to authenticated

using (
  (select private.is_approved())
);


-- ============================================
-- 11. FAMILIES: INSERT POLICY
-- ============================================

create policy "families_insert"

on public.families

for insert

to authenticated

with check (
  (select private.can_edit())
);


-- ============================================
-- 12. FAMILIES: UPDATE POLICY
-- ============================================

create policy "families_update"

on public.families

for update

to authenticated

using (
  (select private.can_edit())
)

with check (
  (select private.can_edit())
);


-- ============================================
-- 13. INDIVIDUALS: SELECT POLICY
-- ============================================

create policy "individuals_select"

on public.individuals

for select

to authenticated

using (
  (select private.is_approved())
);


-- ============================================
-- 14. INDIVIDUALS: INSERT POLICY
-- ============================================

create policy "individuals_insert"

on public.individuals

for insert

to authenticated

with check (
  (select private.can_edit())
);


-- ============================================
-- 15. INDIVIDUALS: UPDATE POLICY
-- ============================================

create policy "individuals_update"

on public.individuals

for update

to authenticated

using (
  (select private.can_edit())
)

with check (
  (select private.can_edit())
);


-- ============================================
-- 16. DELETE OPERATIONS
-- ============================================

-- No DELETE grants or DELETE policies are
-- created for any of the four tables.
-- Records can instead be archived using
-- is_archived, when the user can edit them.


-- ============================================
-- FINISH
-- ============================================

commit;
