
import { supabase } from "../lib/supabase";

function db() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// 1. GET ACTIVE FAMILIES FOR REGISTRATION
// ==========================================

export async function getActiveFamilies() {
  const { data, error } = await db()
    .from("families")
    .select(`
      id,
      family_code,
      family_name,
      location:locations!inner (
        id,
        location_code,
        address_line,
        village,
        district,
        is_archived
      )
    `)
    .eq("is_archived", false)
    .eq("location.is_archived", false)
    .order("family_name")
    .limit(500);

  if (error) throw error;

  return data ?? [];
}

// ==========================================
// 2. CHECK A FAMILY'S MEMBER STATUS
// ==========================================

export async function getFamilyRegistrationStatus(
  familyId
) {
  if (!familyId) {
    return {
      activeCount: 0,
      hasHead: false,
    };
  }

  const [membersResult, headsResult] =
    await Promise.all([
      db()
        .from("individuals")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("family_id", familyId)
        .eq("is_archived", false),

      db()
        .from("individuals")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("family_id", familyId)
        .eq("is_archived", false)
        .eq("is_head", true),
    ]);

  if (membersResult.error) {
    throw membersResult.error;
  }

  if (headsResult.error) {
    throw headsResult.error;
  }

  return {
    activeCount: membersResult.count ?? 0,
    hasHead: (headsResult.count ?? 0) > 0,
  };
}

// ==========================================
// 3. REGISTER A NEW INDIVIDUAL
// ==========================================

export async function registerIndividual(form) {
  if (!form.familyId) {
    throw new Error("Select a family first.");
  }

  const { data, error } = await db().rpc(
    "register_individual",
    {
      p_family_id: form.familyId,
      p_full_name: form.fullName.trim(),

      p_date_of_birth:
        form.dateOfBirth || null,

      p_gender:
        form.gender || null,

      p_relationship_to_head:
        form.relationshipToHead.trim(),

      p_phone:
        form.phone.trim() || null,

      p_notes:
        form.notes.trim() || null,

      p_is_head:
        Boolean(form.isHead),
    }
  );

  if (error) throw error;

  return data;
}

// ==========================================
// 4. PAGINATED PEOPLE DIRECTORY
// ==========================================

export async function getPeoplePage({
  page = 1,
  pageSize = 12,
  search = "",
  familyId = "",
} = {}) {
  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safePageSize = Math.min(
    100,
    Math.max(
      1,
      Math.floor(Number(pageSize) || 12)
    )
  );

  const from =
    (safePage - 1) * safePageSize;

  const to =
    from + safePageSize - 1;

  let query = db()
    .from("individuals")
    .select(
      `
      id,
      person_code,
      full_name,
      date_of_birth,
      gender,
      relationship_to_head,
      is_head,
      family_id,
      family:families!inner (
        id,
        family_code,
        family_name,
        is_archived,
        location:locations (
          location_code,
          address_line,
          village,
          district
        )
      )
    `,
      { count: "exact" }
    )
    .eq("is_archived", false)
    .eq("family.is_archived", false);

  if (familyId) {
    query = query.eq("family_id", familyId);
  }

  // Remove PostgREST filter metacharacters from
  // user input before constructing an OR filter.
  const term = String(search)
    .trim()
    .replace(/[%,().*\\]/g, "")
    .slice(0, 80);

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,person_code.ilike.%${term}%`
    );
  }

  const { data, count, error } = await query
    .order("full_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;

  return {
    items: data ?? [],
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(
      1,
      Math.ceil(total / safePageSize)
    ),
  };
}

// ==========================================
// 5. KEEP THE OLD GET INDIVIDUALS API
// ==========================================

// Preserves compatibility with earlier code
// that calls getIndividuals().

export async function getIndividuals() {
  const result = await getPeoplePage({
    page: 1,
    pageSize: 100,
  });

  return result.items;
}
