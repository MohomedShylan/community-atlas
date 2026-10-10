
-- =============================================
-- COMMUNITY ATLAS
-- STEP 5.6 - AUTOMATIC USER PROFILES
-- =============================================

begin;

-- =============================================
-- 1. CREATE USER PROFILE FUNCTION
-- =============================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.profiles (
    id,
    display_name,
    role,
    is_active
  )

  values (
    new.id,

    coalesce(
      nullif(
        pg_catalog.btrim(
          new.raw_user_meta_data ->> 'full_name'
        ),
        ''
      ),
      'New User'
    ),

    'viewer'::public.app_role,
    false
  );

  return new;

end;
$$;


-- =============================================
-- 2. CREATE AUTHENTICATION TRIGGER
-- =============================================

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created

after insert on auth.users

for each row

execute function private.handle_new_user();


-- =============================================
-- 3. CREATE PROFILES FOR EXISTING USERS
-- =============================================

-- Accounts created before this trigger was added
-- may not have a profile yet.
-- Existing profiles are left unchanged.

insert into public.profiles (
  id,
  display_name,
  role,
  is_active
)

select
  u.id,

  coalesce(
    nullif(
      pg_catalog.btrim(
        u.raw_user_meta_data ->> 'full_name'
      ),
      ''
    ),
    'New User'
  ),

  'viewer'::public.app_role,
  false

from auth.users u

on conflict (id) do nothing;


-- =============================================
-- 4. PROTECT PROFILE IDENTITY
-- =============================================

create or replace function private.protect_profile_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if new.id is distinct from old.id then
    raise exception
      'Profile ID cannot be changed';
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();

  return new;

end;
$$;

drop trigger if exists trg_profile_identity
on public.profiles;

create trigger trg_profile_identity

before update on public.profiles

for each row

execute function private.protect_profile_id();


-- =============================================
-- 5. CHECK WHETHER USER IS APPROVED
-- =============================================

create or replace function private.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
  );
$$;


-- =============================================
-- 6. CHECK WHETHER USER IS ADMIN
-- =============================================

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role = 'admin'
  );
$$;


-- =============================================
-- 7. CHECK WHETHER USER CAN EDIT
-- =============================================

create or replace function private.can_edit()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'editor')
  );
$$;


-- =============================================
-- 8. SECURE PRIVATE FUNCTIONS
-- =============================================

revoke all on function private.handle_new_user()
from public, anon, authenticated;

revoke all on function private.protect_profile_id()
from public, anon, authenticated;

revoke all on function private.is_approved()
from public, anon, authenticated;

revoke all on function private.is_admin()
from public, anon, authenticated;

revoke all on function private.can_edit()
from public, anon, authenticated;


-- Allow signed-in users to invoke role helpers
-- through PostgreSQL RLS policies.

grant usage on schema private
to authenticated;

grant execute on function private.is_approved()
to authenticated;

grant execute on function private.is_admin()
to authenticated;

grant execute on function private.can_edit()
to authenticated;


-- =============================================
-- 9. KEEP RLS ENABLED
-- =============================================

alter table public.profiles
enable row level security;


-- =============================================
-- COMPLETE
-- =============================================

commit;
