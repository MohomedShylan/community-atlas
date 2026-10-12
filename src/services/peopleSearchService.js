
import { supabase } from "../lib/supabase";

import {
  getActiveFamilies,
} from "./peopleService";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// 1. SEARCH INDIVIDUALS
// ==========================================

export async function searchPeople({
  search = "",
  familyId = "",
  district = "",
  village = "",
  ageGroup = "all",
  gender = "all",
  status = "active",
  sort = "name_asc",
  page = 1,
  pageSize = 12,
} = {}) {
  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safePageSize = Math.min(
    50,
    Math.max(
      1,
      Math.floor(Number(pageSize) || 12)
    )
  );

  const { data, error } = await getClient().rpc(
    "search_people_directory",
    {
      p_search: String(search).trim().slice(0, 120),

      p_family_id: familyId || null,
      p_district: district || null,
      p_village: village || null,

      p_age_group: ageGroup,
      p_gender: gender,
      p_status: status,
      p_sort: sort,

      p_page: safePage,
      p_page_size: safePageSize,
    }
  );

  if (error) throw error;

  // Convert the flat PostgreSQL result to the
  // same nested family structure used by
  // our existing People and Profile pages.
  const items = (data?.items ?? []).map((row) => ({
    id: row.id,
    person_code: row.person_code,
    full_name: row.full_name,
    family_id: row.family_id,

    date_of_birth: row.date_of_birth,
    gender: row.gender,
    age_years: row.age_years,

    relationship_to_head:
      row.relationship_to_head,

    is_head: row.is_head,
    is_archived: row.is_archived,

    family: {
      id: row.family_id,
      family_code: row.family_code,
      family_name: row.family_name,

      location: {
        id: row.location_id,
        location_code: row.location_code,
        address_line: row.address_line,
        village: row.village,
        district: row.district,
      },
    },
  }));

  const total = Number(data?.total ?? 0);

  return {
    items,
    total,
    page: Number(data?.page ?? safePage),
    pageSize: Number(
      data?.page_size ?? safePageSize
    ),
    totalPages: Math.max(
      1,
      Math.ceil(total / safePageSize)
    ),
  };
}

// ==========================================
// 2. LOAD FAMILY / LOCATION FILTER OPTIONS
// ==========================================

// Community Atlas currently has approximately
// 300 families, so we can derive these
// dropdown values from active families.
//
// As the database grows, we can replace this
// with a separate distinct-values RPC.

export async function getPeopleSearchOptions() {
  const families = await getActiveFamilies();

  const districts = [
    ...new Set(
      families
        .map((family) => family.location?.district)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const villageEntries = families
    .filter(
      (family) => family.location?.village
    )
    .map((family) => ({
      name: family.location.village,
      district: family.location.district || "",
    }));

  const uniqueVillages = [
    ...new Map(
      villageEntries.map((item) => [
        `${item.district.toLowerCase()}::${item.name.toLowerCase()}`,
        item,
      ])
    ).values(),
  ].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    families,
    districts,
    villages: uniqueVillages,
  };
}
