
import { supabase } from "../lib/supabase";

export async function getIndividuals() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("individuals")
    .select(`
      id,
      person_code,
      full_name,
      relationship_to_head,
      is_head,
      family:families (
        family_code,
        family_name
      )
    `)
    .eq("is_archived", false)
    .order("full_name")
    .limit(100);

  if (error) throw error;

  return data ?? [];
}
