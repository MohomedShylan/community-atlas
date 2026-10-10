
import { supabase } from "../lib/supabase";

// ==========================================
// GET ACTIVE INDIVIDUALS
// ==========================================

// Retrieve only active individuals who belong
// to active families.
//
// This is important because Administrators
// may have permission to view archived records,
// but archived household members should not
// appear in the normal People Directory.

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
      family:families!inner (
        family_code,
        family_name,
        is_archived
      )
    `)
    .eq("is_archived", false)
    .eq("family.is_archived", false)
    .order("full_name")
    .limit(100);

  if (error) throw error;

  return data ?? [];
}
