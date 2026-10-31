
import { supabase } from "../lib/supabase";

const BUCKET = "ca-member-documents";

const MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function db() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// LOAD ALL EXISTING HOUSEHOLD SURVEY DATA
// ==========================================

export async function loadHouseholdSurveyForEdit(
  familyId
) {
  const api = db();

  const { data: family, error: fError } =
    await api
      .from("families")
      .select(`
        id,
        family_name,
        contact_phone,
        family_information_sheet,
        is_archived,
        location:locations (
          address_line
        )
      `)
      .eq("id", familyId)
      .single();

  if (fError) throw fError;

  if (family.is_archived) {
    throw new Error(
      "Archived households cannot be edited."
    );
  }

  const { data: members, error: mError } =
    await api
      .from("individuals")
      .select(`
        id,
        person_code,
        full_name,
        relationship_to_head,
        is_head,
        is_archived,
        date_of_birth,
        gender
      `)
      .eq("family_id", familyId)
      .order("person_code");

  if (mError) throw mError;

  // Fail loading if any required dataset fails.
  // This prevents hidden or inaccessible
  // information from appearing as empty.

  const [
    memberSheets,
    subsidies,
    extended,
  ] = await Promise.all([
    members.length
      ? api
          .from("individual_family_sheets")
          .select("individual_id, details")
          .in(
            "individual_id",
            members.map((m) => m.id)
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    api
      .from("family_subsidies")
      .select("*")
      .eq("family_id", familyId)
      .order("entry_number"),

    api
      .from("family_extended_sections")
      .select(`
        id,
        section_number,
        entry_number,
        details
      `)
      .eq("family_id", familyId)
      .order("section_number")
      .order("entry_number"),
  ]);

  for (const result of [
    memberSheets,
    subsidies,
    extended,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const detailsByMember = new Map(
    (memberSheets.data ?? []).map((record) => [
      record.individual_id,
      record.details ?? {},
    ])
  );

  return {
    family,

    members: members.map((member) => ({
      ...member,
      details:
        detailsByMember.get(member.id) ?? {},
    })),

    subsidies: subsidies.data ?? [],
    extended: extended.data ?? [],
  };
}

// ==========================================
// DOCUMENT VALIDATION
// ==========================================

function validateFile(file) {
  const ext = file?.name
    ?.split(".")
    .pop()
    ?.toLowerCase();

  const mime = MIME[ext];

  if (
    !file ||
    !mime ||
    file.size <= 0 ||
    file.size > 10 * 1024 * 1024 ||
    (file.type && file.type !== mime)
  ) {
    throw new Error(
      "Only JPG, PNG, WebP or PDF files " +
      "up to 10 MB are allowed."
    );
  }

  return {
    ext: ext === "jpeg" ? "jpg" : ext,
    mime,
  };
}

// ==========================================
// SAVE FULL HOUSEHOLD SURVEY
// ==========================================

export async function saveHouseholdFullSurvey(
  familyId,
  form
) {
  const api = db();

  const {
    data: authData,
    error: authError,
  } = await api.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error(
      "Sign in before saving household changes."
    );
  }

  const userId = authData.user.id;

  const batchId = crypto.randomUUID();
  const uploaded = [];

  try {
    const members = [];

    // ======================================
    // UPLOAD ONLY REPLACED OR NEW DOCUMENTS
    // ======================================

    for (const member of form.members) {
      const documentPaths = {
        birth_certificate_path:
          member.birth_certificate_path || null,

        nic_copy_path:
          member.nic_copy_path || null,
      };

      for (const [
        fileKey,
        pathKey,
        prefix,
      ] of [
        [
          "birthFile",
          "birth_certificate_path",
          "birth_certificate",
        ],
        [
          "nicFile",
          "nic_copy_path",
          "nic_copy",
        ],
      ]) {
        const file = member[fileKey];

        if (!file) continue;

        const { ext, mime } =
          validateFile(file);

        const path =
          `${userId}/${batchId}/` +
          `${member.clientId}/${prefix}.${ext}`;

        const { error } = await api.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: mime,
            upsert: false,
          });

        if (error) throw error;

        uploaded.push(path);

        documentPaths[pathKey] = path;
      }

      members.push({
        ...(member.id
          ? { id: member.id }
          : {}),

        full_name:
          member.full_name.trim(),

        relationship_to_head:
          member.relationship_to_head || "",

        is_head:
          !!member.is_head,

        is_archived:
          !!member.is_archived,

        date_of_birth:
          member.date_of_birth || null,

        gender:
          member.gender || null,

        nic_number:
          member.nic_number || null,

        school:
          member.school || null,

        grade:
          member.grade || null,

        education_level:
          member.education_level || null,

        job:
          member.job || null,

        workplace_address:
          member.workplace_address || null,

        marital_status:
          member.marital_status || null,

        ...documentPaths,
      });
    }

    // ======================================
    // ATOMIC POSTGRESQL SAVE
    // ======================================

    const { data, error } = await api.rpc(
      "save_household_full_survey",
      {
        p_family_id: familyId,

        p_family_name:
          form.familyName.trim(),

        p_contact_phone:
          form.contactPhone.trim() || null,

        p_members: members,

        p_family_sheet:
          form.section1,

        p_housing_sheet:
          form.housing,

        p_lands:
          form.lands,

        p_subsidies:
          form.subsidies.map(
            ({ id, ...fields }) => ({
              ...(id ? { id } : {}),
              ...fields,
            })
          ),

        p_extended_sections:
          form.extras,

        p_deleted_subsidy_ids:
          form.deletedSubsidyIds,

        p_deleted_extended_ids:
          form.deletedExtendedIds,
      }
    );

    if (error) throw error;

    return data;

  } catch (err) {
    // Never delete older stored documents.
    // Remove only uploads from this save attempt.

    if (uploaded.length) {
      const { error } =
        await api.storage
          .from(BUCKET)
          .remove(uploaded);

      if (error) {
        throw new Error(
          `${err.message} Newly uploaded files ` +
          "may require administrator cleanup."
        );
      }
    }

    throw err;
  }
}
