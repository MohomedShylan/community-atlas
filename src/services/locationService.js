
import { supabase } from "../lib/supabase";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// Only retrieve active locations that have coordinates.
export async function getMappedLocations() {
  const { data, error } = await getClient()
    .from("locations")
    .select(`
      id,
      location_code,
      address_line,
      village,
      district,
      latitude,
      longitude
    `)
    .eq("is_archived", false)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("location_code")
    .limit(1000);

  if (error) throw error;

  return (data ?? [])
    .map((location) => ({
      ...location,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    }))
    .filter(
      (location) =>
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude)
    );
}

// Load private family and member records only
// after a registered location is selected.
export async function getLocationFamiliesAndMembers(
  locationId
) {
  const client = getClient();

  const { data: families, error: familyError } =
    await client
      .from("families")
      .select(`
        id,
        family_code,
        family_name
      `)
      .eq("location_id", locationId)
      .eq("is_archived", false)
      .order("family_code")
      .limit(500);

  if (familyError) throw familyError;

  if (!families?.length) {
    return {
      families: [],
      people: [],
    };
  }

  const familyIds = families.map((family) => family.id);

  const { data: people, error: peopleError } =
    await client
      .from("individuals")
      .select(`
        id,
        family_id,
        person_code,
        full_name,
        relationship_to_head,
        is_head
      `)
      .in("family_id", familyIds)
      .eq("is_archived", false)
      .order("full_name")
      .limit(1500);

  if (peopleError) throw peopleError;

  return {
    families,
    people: people ?? [],
  };
}
