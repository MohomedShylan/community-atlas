
import { supabase } from "../lib/supabase";

function client() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// 1. GET ACTIVE OR ARCHIVED HOUSEHOLDS
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
// 2. GET A HOUSEHOLD'S FULL PROFILE
// ==========================================

export async function getHouseholdProfile(familyId) {
  const db = client();

  // Retrieve the family and its location.
  const { data: family, error: familyError } = await db
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
    .eq("id", familyId)
    .single();

  if (familyError) throw familyError;

  // Retrieve all family members.
  const { data: members, error: memberError } = await db
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

  if (memberError) throw memberError;

  // Count active families sharing this location.
  const { count, error: countError } = await db
    .from("families")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("location_id", family.location.id)
    .eq("is_archived", false);

  if (countError) throw countError;

  return {
    family,
    members: members ?? [],
    locationFamilyCount: count ?? 0,
  };
}

// ==========================================
// 3. REUSABLE SUPABASE RPC FUNCTION
// ==========================================

async function rpc(name, params) {
  const { data, error } = await client().rpc(name, params);

  if (error) throw error;

  return data;
}

// ==========================================
// 4. EDIT HOUSEHOLD AND FAMILY MEMBERS
// ==========================================

export function saveHouseholdChanges(familyId, payload) {
  return rpc("save_household_changes", {
    p_family_id: familyId,
    p_family_name: payload.familyName,
    p_contact_phone: payload.contactPhone || null,

    p_members: payload.members.map((member) => ({
      ...(member.id ? { id: member.id } : {}),

      full_name: member.fullName,

      relationship_to_head:
        member.relationshipToHead || "",

      is_head: member.isHead,

      is_archived: member.isArchived,
    })),
  });
}

// ==========================================
// 5. REMOVE HOUSEHOLD (SOFT DELETE)
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
// 6. RESTORE REMOVED HOUSEHOLD
// ==========================================

export function restoreHousehold(familyId) {
  return rpc("restore_household", {
    p_family_id: familyId,
  });
}

// ==========================================
// 7. UPDATE HOUSEHOLD LOCATION
// ==========================================

export function updateHouseholdLocation(
  locationId,
  values
) {
  return rpc("update_location_details", {
    p_location_id: locationId,

    p_address_line: values.addressLine,

    p_village: values.village || null,

    p_district: values.district || null,

    p_latitude: Number(values.latitude),

    p_longitude: Number(values.longitude),

    p_confirm_shared: Boolean(values.confirmShared),
  });
}
