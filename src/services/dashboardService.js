
import { supabase } from "../lib/supabase";

export async function getDashboardStats() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    familiesResult,
    peopleResult,
    locationsResult,
    mappedResult,
  ] = await Promise.all([
    supabase
      .from("families")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false),

    supabase
      .from("individuals")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false),

    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false),

    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .not("latitude", "is", null),
  ]);

  const results = [
    familiesResult,
    peopleResult,
    locationsResult,
    mappedResult,
  ];

  const failed = results.find((result) => result.error);

  if (failed) {
    throw failed.error;
  }

  const totalLocations = locationsResult.count ?? 0;
  const mappedLocations = mappedResult.count ?? 0;

  return {
    totalFamilies: familiesResult.count ?? 0,
    totalIndividuals: peopleResult.count ?? 0,
    mappedLocations,
    missingLocations: totalLocations - mappedLocations,
  };
}
