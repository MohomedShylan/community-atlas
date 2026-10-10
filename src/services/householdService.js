
import { supabase } from "../lib/supabase";

export async function getHouseholds() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("families")
    .select(`
      id,
      family_code,
      family_name,
      created_at,
      location:locations (
        id,
        location_code,
        address_line,
        village,
        district,
        latitude,
        longitude
      )
    `)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return data ?? [];
}

export async function registerHousehold(form) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc(
    "register_household",
    {
      p_family_name: form.familyName,
      p_members: form.members.map((person) => ({
        full_name: person.fullName,
        relationship_to_head:
          person.relationshipToHead,
        is_head: person.isHead,
      })),
      p_existing_location_id:
        form.existingLocationId || null,
      p_address_line: form.addressLine || null,
      p_village: form.village || null,
      p_district: form.district || null,
      p_latitude:
        form.existingLocationId
          ? null
          : form.latitude,
      p_longitude:
        form.existingLocationId
          ? null
          : form.longitude,
      p_contact_phone: form.contactPhone || null,
    }
  );

  if (error) throw error;

  return data;
}
