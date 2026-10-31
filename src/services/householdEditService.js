
import { supabase } from "../lib/supabase";

function client() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

// ==========================================
// HOUSEHOLD DIRECTORY
// ==========================================

export async function listHouseholds({
  archived = false,
} = {}) {
  const { data, error } = await client()
    .from("families")
    .select(`
      id,
      family_code,
      family_name,
      contact_phone,
      is_archived,
      location:locations (
        id,
        location_code,
        address_line,
        village,
        district,
        latitude,
        longitude,
        is_archived
      )
    `)
    .eq("is_archived", archived)
    .order("family_code")
    .limit(500);

  if (error) throw error;

  return data ?? [];
}

// ==========================================
// HOUSEHOLD PROFILE
// INCLUDING QUESTIONS 1–5
// ==========================================

export async function getHouseholdProfile(familyId) {
  const db = client();

  const { data: family, error: familyError } =
    await db
      .from("families")
      .select(`
        id,
        family_code,
        family_name,
        contact_phone,
        family_information_sheet,
        is_archived,
        location:locations (
          id,
          location_code,
          address_line,
          village,
          district,
          latitude,
          longitude,
          is_archived
        )
      `)
      .eq("id", familyId)
      .single();

  if (familyError) {
    throw familyError;
  }

  const { data: members, error: memberError } =
    await db
      .from("individuals")
      .select(`
        id,
        person_code,
        full_name,
        relationship_to_head,
        is_head,
        is_archived
      `)
      .eq("family_id", familyId)
      .order("person_code");

  if (memberError) {
    throw memberError;
  }

  let locationFamilyCount = 0;

  if (family.location?.id) {
    const { count, error: countError } = await db
      .from("families")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("location_id", family.location.id)
      .eq("is_archived", false);

    if (countError) {
      throw countError;
    }

    locationFamilyCount = count ?? 0;
  }

  return {
    family,
    members: members ?? [],
    locationFamilyCount,
  };
}

// ==========================================
// CLICKED FAMILY MEMBER DETAILS
// ==========================================

export async function getHouseholdMemberDetails(
  personId,
  { includeSensitive = false } = {}
) {
  const db = client();

  // Basic information stored in individuals.

  const { data: person, error: personError } =
    await db
      .from("individuals")
      .select(`
        id,
        family_id,
        person_code,
        full_name,
        date_of_birth,
        gender,
        phone,
        notes,
        relationship_to_head,
        is_head,
        is_archived
      `)
      .eq("id", personId)
      .maybeSingle();

  if (personError) {
    throw personError;
  }

  if (!person) {
    return null;
  }

  const result = {
    person,
    survey: null,
    surveyUnavailable: false,
  };

  // Section 6 includes NIC and private
  // birth certificate / NIC document paths.
  //
  // Only request these fields for Admin
  // and Editor users. Supabase RLS must
  // independently enforce permissions.

  if (includeSensitive) {
    const { data, error } = await db
      .from("individual_family_sheets")
      .select("details")
      .eq("individual_id", personId)
      .maybeSingle();

    if (error) {
      // Do not prevent basic personal
      // information from loading if
      // optional Section 6 data fails.

      console.error(
        "Could not read Section 6 details:",
        error
      );

      result.surveyUnavailable = true;
    } else {
      result.survey = data?.details ?? null;
    }
  }

  return result;
}

// ==========================================
// EXISTING RPC HELPER
// ==========================================

async function rpc(name, params) {
  const { data, error } =
    await client().rpc(name, params);

  if (error) {
    throw error;
  }

  return data;
}

// ==========================================
// EDIT FAMILY AND MEMBERS
// ==========================================

export function saveHouseholdChanges(
  familyId,
  payload
) {
  return rpc("save_household_changes", {
    p_family_id: familyId,

    p_family_name:
      payload.familyName,

    p_contact_phone:
      payload.contactPhone || null,

    p_members: payload.members.map((member) => ({
      ...(member.id ? { id: member.id } : {}),

      full_name:
        member.fullName,

      relationship_to_head:
        member.relationshipToHead || "",

      is_head:
        member.isHead,

      is_archived:
        member.isArchived,
    })),
  });
}

// ==========================================
// ARCHIVE HOUSEHOLD
// ==========================================

export function archiveHousehold(
  familyId,
  confirmationCode
) {
  return rpc("archive_household", {
    p_family_id: familyId,
    p_confirm_code: confirmationCode,
  });
}

// ==========================================
// RESTORE HOUSEHOLD
// ==========================================

export function restoreHousehold(familyId) {
  return rpc("restore_household", {
    p_family_id: familyId,
  });
}

// ==========================================
// UPDATE HOUSEHOLD LOCATION
// ==========================================

export function updateHouseholdLocation(
  locationId,
  values
) {
  return rpc("update_location_details", {
    p_location_id: locationId,

    p_address_line:
      values.addressLine,

    p_village:
      values.village || null,

    p_district:
      values.district || null,

    p_latitude:
      Number(values.latitude),

    p_longitude:
      Number(values.longitude),

    p_confirm_shared:
      Boolean(values.confirmShared),
  });
}
