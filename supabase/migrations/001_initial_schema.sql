
-- Community Atlas — Initial database migration
-- PART A: Schema and tables

begin;

-- PostGIS must already be enabled in the
-- "extensions" schema using the Supabase Dashboard.

create schema if not exists private;

-- This schema must NOT be listed in the
-- Supabase Data API exposed schemas.
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Application roles
create type public.app_role as enum (
  'admin',
  'editor',
  'viewer'
);

-- ========================================
-- 1. PROFILES
-- ========================================

create table public.profiles (
  id uuid primary key
    references auth.users(id) on delete cascade,

  display_name text,
  role public.app_role not null default 'viewer',

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================
-- 2. LOCATIONS
-- ========================================

create table public.locations (
  id uuid primary key default gen_random_uuid(),

  location_code text not null unique,
  address_line text not null,
  village text,
  district text,

  latitude numeric(9,6),
  longitude numeric(9,6),

  -- Updated automatically from lat/long.
  geo extensions.geography(Point, 4326),

  notes text,
  is_archived boolean not null default false,

  created_by uuid references auth.users(id)
    on delete set null,
  updated_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

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

-- ========================================
-- 3. FAMILIES
-- ========================================

create table public.families (
  id uuid primary key default gen_random_uuid(),

  family_code text not null unique,
  family_name text not null,

  location_id uuid not null
    references public.locations(id)
    on delete restrict,

  contact_phone text,
  notes text,

  is_archived boolean not null default false,

  created_by uuid references auth.users(id)
    on delete set null,
  updated_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================
-- 4. INDIVIDUALS
-- ========================================

create table public.individuals (
  id uuid primary key default gen_random_uuid(),

  person_code text not null unique,

  family_id uuid not null
    references public.families(id)
    on delete restrict,

  full_name text not null,
  date_of_birth date,

  relationship_to_head text,
  is_head boolean not null default false,

  phone text,
  notes text,

  is_archived boolean not null default false,

  created_by uuid references auth.users(id)
    on delete set null,
  updated_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================
-- 5. INDEXES
-- ========================================

create index idx_locations_geo
  on public.locations using gist (geo);

create index idx_families_location
  on public.families(location_id);

create index idx_individuals_family
  on public.individuals(family_id);

create index idx_individuals_name
  on public.individuals(full_name);

create index idx_profiles_active_role
  on public.profiles(is_active, role);

-- At most one active head per family.
create unique index idx_one_head_per_family
  on public.individuals(family_id)
  where is_head = true and is_archived = false;

-- ========================================
-- 6. AUTOMATIC GEOCOORDINATES
-- ========================================

create function private.set_location_geo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is null then
    new.geo := null;
  else
    -- Important: longitude is X, latitude is Y.
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
before insert or update on public.locations
for each row
execute function private.set_location_geo();

-- ========================================
-- 7. TRACK RECORD CHANGES
-- ========================================

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

create trigger trg_locations_stamp
before insert or update on public.locations
for each row execute function private.stamp_data_row();

create trigger trg_families_stamp
before insert or update on public.families
for each row execute function private.stamp_data_row();

create trigger trg_individuals_stamp
before insert or update on public.individuals
for each row execute function private.stamp_data_row();
