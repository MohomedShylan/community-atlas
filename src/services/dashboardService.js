
import { supabase } from "../lib/supabase";

// ==========================================
// GET LIVE DASHBOARD STATISTICS
// ==========================================

export async function getDashboardStats() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const results = await Promise.all([
    // ======================================
    // 1. COUNT ACTIVE FAMILIES
    // ======================================

    supabase
      .from("families")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("is_archived", false),

    // ======================================
    // 2. COUNT ACTIVE INDIVIDUALS
    // ======================================

    // Count only individuals whose families
    // have not been archived.

    supabase
      .from("individuals")
      .select(
        "id, family:families!inner(id)",
        {
          count: "exact",
          head: true,
        }
      )
      .eq("is_archived", false)
      .eq("family.is_archived", false),

    // ======================================
    // 3. COUNT ACTIVE LOCATIONS
    // ======================================

    supabase
      .from("locations")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("is_archived", false),

    // ======================================
    // 4. COUNT MAPPED LOCATIONS
    // ======================================

    supabase
      .from("locations")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("is_archived", false)
      .not("latitude", "is", null),
  ]);

  // ========================================
  // HANDLE DATABASE ERRORS
  // ========================================

  const failure = results.find(
    (item) => item.error
  );

  if (failure) {
    throw failure.error;
  }

  // ========================================
  // CALCULATE DASHBOARD STATISTICS
  // ========================================

  const locations = results[2].count ?? 0;

  const mappedLocations = results[3].count ?? 0;

  return {
    totalFamilies: results[0].count ?? 0,

    totalIndividuals: results[1].count ?? 0,

    mappedLocations,

    missingLocations:
      locations - mappedLocations,
  };
}
