
-- ============================================
-- COMMUNITY ATLAS
-- STEP 7 - ATOMIC HOUSEHOLD REGISTRATION
-- ============================================

begin;

-- Human-readable identifiers:
-- LOC-000001, F-000001, P-000001

create sequence if not exists
  public.community_location_seq;

create sequence if not exists
  public.community_family_seq;

create sequence if not exists
  public.community_person_seq;

-- Only authenticated users can request
-- sequence values. RLS still controls writes.

revoke all on sequence
  public.community_location_seq,
  public.community_family_seq,
  public.community_person_seq
from PUBLIC, anon;

grant usage on sequence
  public.community_location_seq,
  public.community_family_seq,
  public.community_person_seq
to authenticated;


create or replace function public.register_household(
  p_family_name text,
  p_members jsonb,
  p_existing_location_id uuid default null,
  p_address_line text default null,
  p_village text default null,
  p_district text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_contact_phone text default null
)
returns jsonb

language plpgsql
security invoker
set search_path = ''

as $$
declare
  v_location_id uuid;
  v_location_code text;
  v_family_id uuid;
  v_family_code text;
  v_person jsonb;
  v_member_name text;
  v_is_head boolean;
  v_head_count integer := 0;
  v_member_count integer := 0;

begin

  -- =========================================
  -- 1. PERMISSION CHECK
  -- =========================================

  if not (select private.can_edit()) then
    raise exception
      'You do not have permission to register households.'
      using errcode = '42501';
  end if;


  -- =========================================
  -- 2. VALIDATE FAMILY
  -- =========================================

  if length(trim(coalesce(p_family_name, ''))) < 2
     or length(trim(p_family_name)) > 150 then
    raise exception
      'Family name must contain 2 to 150 characters.';
  end if;

  if p_contact_phone is not null
     and length(p_contact_phone) > 30 then
    raise exception 'Contact number is too long.';
  end if;


  -- =========================================
  -- 3. VALIDATE MEMBERS
  -- =========================================

  if p_members is null
     or jsonb_typeof(p_members) <> 'array' then
    raise exception 'Members must be an array.';
  end if;

  if jsonb_array_length(p_members) < 1
     or jsonb_array_length(p_members) > 25 then
    raise exception
      'Register between 1 and 25 family members.';
  end if;

  for v_person in
    select value
    from jsonb_array_elements(p_members)
  loop

    if jsonb_typeof(v_person) <> 'object' then
      raise exception 'Invalid family member.';
    end if;

    v_member_name :=
      trim(coalesce(v_person->>'full_name', ''));

    if length(v_member_name) < 2
       or length(v_member_name) > 150 then
      raise exception
        'Each member needs a name of 2 to 150 characters.';
    end if;

    v_is_head :=
      coalesce((v_person->>'is_head')::boolean, false);

    if v_is_head then
      v_head_count := v_head_count + 1;
    end if;

  end loop;

  if v_head_count <> 1 then
    raise exception
      'Exactly one family member must be the head of family.';
  end if;


  -- =========================================
  -- 4. CREATE OR REUSE LOCATION
  -- =========================================

  if p_existing_location_id is not null then

    select id, location_code
    into v_location_id, v_location_code
    from public.locations
    where id = p_existing_location_id
      and is_archived = false;

    if v_location_id is null then
      raise exception
        'The selected location was not found.';
    end if;

  else

    if length(trim(coalesce(p_address_line, ''))) < 3 then
      raise exception 'A valid address is required.';
    end if;

    if p_latitude is null
       or p_longitude is null
       or p_latitude < -90
       or p_latitude > 90
       or p_longitude < -180
       or p_longitude > 180 then
      raise exception 'Valid GPS coordinates are required.';
    end if;

    v_location_code :=
      'LOC-' || lpad(
        nextval(
          'public.community_location_seq'::regclass
        )::text,
        6,
        '0'
      );

    insert into public.locations (
      location_code,
      address_line,
      village,
      district,
      latitude,
      longitude
    )
    values (
      v_location_code,
      trim(p_address_line),
      nullif(trim(coalesce(p_village, '')), ''),
      nullif(trim(coalesce(p_district, '')), ''),
      p_latitude,
      p_longitude
    )
    returning id into v_location_id;

  end if;


  -- =========================================
  -- 5. CREATE FAMILY
  -- =========================================

  v_family_code :=
    'F-' || lpad(
      nextval(
        'public.community_family_seq'::regclass
      )::text,
      6,
      '0'
    );

  insert into public.families (
    family_code,
    family_name,
    location_id,
    contact_phone
  )
  values (
    v_family_code,
    trim(p_family_name),
    v_location_id,
    nullif(trim(coalesce(p_contact_phone, '')), '')
  )
  returning id into v_family_id;


  -- =========================================
  -- 6. CREATE INDIVIDUALS
  -- =========================================

  for v_person in
    select value
    from jsonb_array_elements(p_members)
  loop

    insert into public.individuals (
      person_code,
      family_id,
      full_name,
      relationship_to_head,
      is_head
    )
    values (
      'P-' || lpad(
        nextval(
          'public.community_person_seq'::regclass
        )::text,
        6,
        '0'
      ),
      v_family_id,
      trim(v_person->>'full_name'),
      nullif(
        trim(
          coalesce(
            v_person->>'relationship_to_head',
            ''
          )
        ),
        ''
      ),
      coalesce(
        (v_person->>'is_head')::boolean,
        false
      )
    );

    v_member_count := v_member_count + 1;

  end loop;


  -- =========================================
  -- 7. RETURN NEW RECORD DETAILS
  -- =========================================

  return jsonb_build_object(
    'location_id', v_location_id,
    'location_code', v_location_code,
    'family_id', v_family_id,
    'family_code', v_family_code,
    'member_count', v_member_count
  );

end;
$$;


-- ============================================
-- 8. RESTRICT API FUNCTION ACCESS
-- ============================================

revoke all on function public.register_household(
  text, jsonb, uuid, text, text,
  text, numeric, numeric, text
)
from PUBLIC, anon, authenticated;

grant execute on function public.register_household(
  text, jsonb, uuid, text, text,
  text, numeric, numeric, text
)
to authenticated;

commit;
