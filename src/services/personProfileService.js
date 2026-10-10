
import { supabase } from "../lib/supabase";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ==========================================
// GET COMPLETE INDIVIDUAL PROFILE
// ==========================================

export async function getIndividualProfile(personId) {
  if (
    !personId ||
    !UUID_PATTERN.test(personId)
  ) {
    throw new Error("Invalid individual profile link.");
  }

  const db = getClient();

  // 1. Retrieve the person together with
  // their active family and active location.
  const { data: person, error: personError } =
    await db
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

        family:families!inner (
          id,
          family_code,
          family_name,
          contact_phone,
          is_archived,

          location:locations!inner (
            id,
            location_code,
            address_line,
            village,
            district,
            latitude,
            longitude,
            is_archived
          )
        )
      `)
      .eq("id", personId)
      .eq("is_archived", false)
      .eq("family.is_archived", false)
      .eq("family.location.is_archived", false)
      .maybeSingle();

  if (personError) throw personError;

  if (!person) {
    return null;
  }

  // 2. Retrieve other active members
  // of the same household family.
  const { data: familyMembers, error: memberError } =
    await db
      .from("individuals")
      .select(`
        id,
        person_code,
        full_name,
        relationship_to_head,
        is_head
      `)
      .eq("family_id", person.family_id)
      .eq("is_archived", false)
      .neq("id", person.id)
      .order("is_head", {
        ascending: false,
      })
      .order("full_name", {
        ascending: true,
      })
      .limit(100);

  if (memberError) throw memberError;

  return {
    person,
    family: person.family,
    location: person.family.location,
    relatedMembers: familyMembers ?? [],
  };
}
