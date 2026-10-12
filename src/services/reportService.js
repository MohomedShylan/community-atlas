
import { supabase } from "../lib/supabase";

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// FETCH LIVE COMMUNITY ANALYTICS
// ==========================================

export async function getCommunityReport(
  {
    district = "",
    village = "",
  } = {},
  {
    forExport = false,
  } = {}
) {
  const { data, error } = await getClient().rpc(
    "get_community_report",
    {
      p_district: district || null,
      p_village: village || null,
      p_for_export: Boolean(forExport),
    }
  );

  if (error) {
    throw error;
  }

  if (!data || !data.summary) {
    throw new Error(
      "The reporting service returned incomplete data."
    );
  }

  return {
    ...data,
    districts: data.districts ?? [],
    villages: data.villages ?? [],
    ages: data.ages ?? [],
    genders: data.genders ?? [],
    household_sizes: data.household_sizes ?? [],
    filters: {
      districts: data.filters?.districts ?? [],
      villages: data.filters?.villages ?? [],
    },
  };
}
