
-- ============================================
-- COMMUNITY ATLAS
-- STEP 5.5 - INITIAL DATABASE SCHEMA
-- ============================================

begin;

-- PostGIS is already installed in the
-- extensions schema (verified in Step 5.3).

-- Private schema for internal functions
create schema if not exists private;

revoke all on schema private
from public, anon;

grant usage on schema private
to authenticated;


-- ============================================
-- 1. APPLICATION USER ROLES
-- ============================================

create type public.app_role as enum (
  'admin',
  'editor',
  'viewer'
);


-- ============================================
-- 2. PROFILES TABLE
-- ============================================

create table public.profiles (

  id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text,

  role public.app_role
    not null default 'viewer',

  is_active boolean
    not null default false,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()

);


-- ============================================
-- 3. LOCATIONS TABLE
-- ============================================

create table public.locations (

  id uuid primary key
    default gen_random_uuid(),

  location_code text
    not null unique,

  address_line text
    not null,

  village text,

  district text,

  latitude numeric(9,6),

  longitude numeric(9,6),

  geo extensions.geography(Point, 4326),

  notes text,

  is_archived boolean
    not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint valid_latitude
    check (latitude between -90 and 90),

  constraint valid_longitude
    check (longitude between -180 and 180),

  constraint coordinate_pair
    check (
      (latitude is null and longitude is null)
      or
      (latitude is not null and longitude is not null)
    )

);


-- ============================================
-- 4. FAMILIES TABLE
-- ============================================

create table public.families (

  id uuid primary key
    default gen_random_uuid(),

  family_code text
    not null unique,

  family_name text
    not null,

  location_id uuid
    not null
    references public.locations(id)
    on delete restrict,

  contact_phone text,

  notes text,

  is_archived boolean
    not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()

);


-- ============================================
-- 5. INDIVIDUALS TABLE
-- ============================================

create table public.individuals (

  id uuid primary key
    default gen_random_uuid(),

  person_code text
    not null unique,

  family_id uuid
    not null
    references public.families(id)
    on delete restrict,

  full_name text
    not null,

  date_of_birth date,

  relationship_to_head text,

  is_head boolean
    not null default false,

  phone text,

  notes text,

  is_archived boolean
    not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()

);


-- ============================================
-- 6. CREATE DATABASE INDEXES
-- ============================================

-- Improve geographic searches
create index idx_locations_geo
on public.locations
using gist (geo);

-- Improve searches by location
create index idx_families_location
on public.families(location_id);

-- Improve searches for family members
create index idx_individuals_family
on public.individuals(family_id);

-- Improve name searches
create index idx_individuals_name
on public.individuals(full_name);

-- Improve user role checks
create index idx_profiles_active_role
on public.profiles(is_active, role);

-- Allow at most one active family head
create unique index idx_one_head_per_family
on public.individuals(family_id)
where is_head = true
and is_archived = false;


-- ============================================
-- 7. AUTOMATIC GEOGRAPHIC POINT
-- ============================================

create function private.set_location_geo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if new.latitude is null then

    new.geo := null;

  else

    new.geo := extensions.st_setsrid(
      extensions.st_makepoint(
        new.longitude::double precision,
        new.latitude::double precision
      ),
      4326
    )::extensions.geography;

  end if;

  return new;

end;
$$;


create trigger trg_location_geo
before insert or update
on public.locations
for each row
execute function private.set_location_geo();


-- ============================================
-- 8. AUTOMATIC RECORD TIMESTAMPS
-- ============================================

create function private.stamp_data_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if tg_op = 'INSERT' then

    new.created_at := now();
    new.created_by := auth.uid();

  else

    new.created_at := old.created_at;
    new.created_by := old.created_by;

  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  return new;

end;
$$;


-- Locations timestamp trigger
create trigger trg_locations_stamp
before insert or update
on public.locations
for each row
execute function private.stamp_data_row();


-- Families timestamp trigger
create trigger trg_families_stamp
before insert or update
on public.families
for each row
execute function private.stamp_data_row();


-- Individuals timestamp trigger
create trigger trg_individuals_stamp
before insert or update
on public.individuals
for each row
execute function private.stamp_data_row();


-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS immediately.
-- Access policies are added in Step 5.7.

alter table public.profiles
enable row level security;

alter table public.locations
enable row level security;

alter table public.families
enable row level security;

alter table public.individuals
enable row level security;


-- Restrict the internal trigger functions
revoke all on function private.set_location_geo()
from public, anon, authenticated;

revoke all on function private.stamp_data_row()
from public, anon, authenticated;


-- ============================================
-- FINISH
-- ============================================

commit;
