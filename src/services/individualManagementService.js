
import { supabase } from "../lib/supabase";

// ==========================================
// COMMUNITY ATLAS
// STEP 8.3 - INDIVIDUAL MANAGEMENT SERVICE
// ==========================================

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==========================================
// DATABASE CLIENT
// ==========================================

function db() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  return supabase;
}

// ==========================================
// VALIDATE UUID
// ==========================================

function checkId(id) {
  if (!UUID_PATTERN.test(String(id ?? ""))) {
    throw new Error(
      "Invalid individual or family ID."
    );
  }
}

// ==========================================
// 1. GET INDIVIDUAL FOR MANAGEMENT
// ==========================================

export async function getManagedIndividual(personId) {
  checkId(personId);

  const { data: person, error } = await db()
    .from("individuals")
    .select(`
      id,
      person_code,
      family_id,
      full_name,
      date_of_birth,
      gender,
      relationship_to_head,
      is_head,
      phone,
      notes,
      is_archived,

      family:families (
        id,
        family_code,
        family_name,
        is_archived,

        location:locations (
          id,
          is_archived
        )
      )
    `)
    .eq("id", personId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!person) {
    return null;
  }

  // Load active members of the same family.

  const { data: members, error: memberError } =
    await db()
      .from("individuals")
      .select(`
        id,
        person_code,
        full_name,
        is_head,
        is_archived
      `)
      .eq("family_id", person.family_id)
      .eq("is_archived", false)
      .order("full_name")
      .limit(100);

  if (memberError) {
    throw memberError;
  }

  return {
    person,
    members: members ?? [],
  };
}

// ==========================================
// 2. UPDATE INDIVIDUAL DETAILS
// ==========================================

export async function updateIndividualDetails(
  personId,
  values
) {
  checkId(personId);

  const { data, error } = await db().rpc(
    "update_individual_details",
    {
      p_person_id: personId,

      p_full_name:
        values.fullName.trim(),

      p_date_of_birth:
        values.dateOfBirth || null,

      p_gender:
        values.gender || null,

      p_relationship_to_head:
        values.relationshipToHead.trim() || null,

      p_phone:
        values.phone.trim() || null,

      p_notes:
        values.notes.trim() || null,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// 3. CHANGE HEAD OF FAMILY
// ==========================================

export async function changeFamilyHead(
  familyId,
  newHeadId
) {
  checkId(familyId);
  checkId(newHeadId);

  const { data, error } = await db().rpc(
    "set_family_head",
    {
      p_family_id: familyId,
      p_new_head_id: newHeadId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// 4. TRANSFER INDIVIDUAL
// ==========================================

export async function transferIndividual(
  personId,
  targetFamilyId
) {
  checkId(personId);
  checkId(targetFamilyId);

  const { data, error } = await db().rpc(
    "transfer_individual",
    {
      p_person_id: personId,
      p_target_family_id: targetFamilyId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// 5. REMOVE (ARCHIVE) INDIVIDUAL
// ==========================================

export async function archiveIndividual(
  personId,
  confirmationCode
) {
  checkId(personId);

  const { data, error } = await db().rpc(
    "archive_individual",
    {
      p_person_id: personId,
      p_confirm_code: confirmationCode,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// 6. RESTORE ARCHIVED INDIVIDUAL
// ==========================================

export async function restoreIndividual(personId) {
  checkId(personId);

  const { data, error } = await db().rpc(
    "restore_individual",
    {
      p_person_id: personId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// 7. GET ARCHIVED INDIVIDUALS
// ==========================================

export async function getArchivedIndividuals({
  page = 1,
  pageSize = 12,
} = {}) {
  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safeSize = Math.min(
    50,
    Math.max(
      1,
      Math.floor(Number(pageSize) || 12)
    )
  );

  const from =
    (safePage - 1) * safeSize;

  const { data, count, error } = await db()
    .from("individuals")
    .select(`
      id,
      person_code,
      full_name,

      family:families (
        id,
        family_code,
        family_name,
        is_archived
      )
    `, {
      count: "exact",
    })
    .eq("is_archived", true)
    .order("person_code")
    .range(
      from,
      from + safeSize - 1
    );

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    items: data ?? [],
    total,
    page: safePage,

    totalPages: Math.max(
      1,
      Math.ceil(total / safeSize)
    ),
  };
}
