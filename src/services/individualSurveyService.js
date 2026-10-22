
import { supabase } from "../lib/supabase";

// Read-only survey service.
// Database Row Level Security remains authoritative.

export async function getIndividualSurvey(
  personId,
  familyId,
  role
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const canReadMemberSheet =
    role === "admin" || role === "editor";

  const canReadExtended = role === "admin";

  // Sections 1, 7 and 8 are stored in the
  // family's family_information_sheet JSONB.

  const { data: family, error: familyError } =
    await supabase
      .from("families")
      .select(`
        id,
        contact_phone,
        family_information_sheet,
        location:locations (
          address_line
        )
      `)
      .eq("id", familyId)
      .single();

  if (familyError) throw familyError;

  // Section 6: private individual survey.
  // Section 9: private subsidy records.
  // Sections 10–18: admin-only records.
  //
  // Do not request restricted data for
  // roles that cannot read it.

  const [
    memberResponse,
    subsidyResponse,
    extendedResponse,
  ] = await Promise.all([
    canReadMemberSheet
      ? supabase
          .from("individual_family_sheets")
          .select("details")
          .eq("individual_id", personId)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),

    canReadMemberSheet
      ? supabase
          .from("family_subsidies")
          .select(`
            entry_number,
            recipient_name,
            assistance_type,
            amount_text,
            card_or_account_number,
            start_date_text,
            institution,
            representative_name,
            other_information
          `)
          .eq("family_id", familyId)
          .order("entry_number")
      : Promise.resolve({
          data: [],
          error: null,
        }),

    canReadExtended
      ? supabase
          .from("family_extended_sections")
          .select(`
            section_number,
            entry_number,
            details
          `)
          .eq("family_id", familyId)
          .order("section_number")
          .order("entry_number")
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  // Report errors separately, rather than
  // incorrectly displaying inaccessible
  // records as empty survey sections.

  const errors = {
    section6:
      memberResponse.error?.message ?? "",

    section9:
      subsidyResponse.error?.message ?? "",

    extended:
      extendedResponse.error?.message ?? "",
  };

  return {
    familySheet:
      family.family_information_sheet ?? {},

    householdPhone:
      family.contact_phone ?? null,

    address:
      family.location?.address_line ?? null,

    section6:
      memberResponse.data?.details ?? null,

    subsidies:
      subsidyResponse.data ?? [],

    extended:
      extendedResponse.data ?? [],

    canReadMemberSheet,
    canReadExtended,

    errors,
  };
}
