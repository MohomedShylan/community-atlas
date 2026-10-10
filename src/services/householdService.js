
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
