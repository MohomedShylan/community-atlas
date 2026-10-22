
import { supabase } from "../lib/supabase";

// ==========================================
// CONFIGURATION
// ==========================================

const DOCUMENT_BUCKET = "ca-member-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

// ==========================================
// GET HOUSEHOLDS
// ==========================================

export async function getHouseholds() {
  const { data, error } = await getClient()
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
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) throw error;

  return data ?? [];
}

// ==========================================
// DOCUMENT VALIDATION
// ==========================================

function documentInfo(file) {
  const extension = file?.name
    ?.split(".")
    .pop()
    ?.toLowerCase();

  const mime = DOCUMENT_TYPES[extension];

  if (
    !mime ||
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE ||
    (file.type && file.type !== mime)
  ) {
    throw new Error(
      "Documents must be JPG, PNG, WebP or PDF, maximum 10 MB."
    );
  }

  return {
    extension: extension === "jpeg" ? "jpg" : extension,
    mime,
  };
}

// ==========================================
// UPLOAD PRIVATE DOCUMENT
// ==========================================

async function uploadDocument(
  db,
  userId,
  registrationId,
  memberId,
  type,
  file,
  uploadedPaths
) {
  if (!file) return null;

  const { extension, mime } = documentInfo(file);

  const path =
    `${userId}/${registrationId}/${memberId}/${type}.${extension}`;

  const { error } = await db.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${type}: ${error.message}`
    );
  }

  uploadedPaths.push(path);

  return path;
}

// ==========================================
// SECTION 1
// ==========================================

function prepareFamilySheet(form) {
  return {
    number_of_families_in_house:
      Number(form.numberOfFamiliesInHouse),

    head_of_household_number:
      form.headOfHouseholdNumber || null,

    whatsapp_number:
      form.whatsappNumber || null,
  };
}

// ==========================================
// SECTION 7
// ==========================================

function prepareHousingSheet(housing = {}) {
  const residencyType = housing.residencyType || null;
  const houseType = housing.houseType || null;
  const waterAvailable = housing.waterAvailable || null;

  return {
    residency_type: residencyType,

    temporary_arrival_year:
      ["temporary", "rental"].includes(residencyType)
        ? housing.temporaryArrivalYear || null
        : null,

    house_type: houseType,

    temporary_house_material:
      houseType === "temporary"
        ? housing.temporaryHouseMaterial || null
        : null,

    roof_type: housing.roofType || null,

    floor_count: housing.floorCount || null,

    electricity_available:
      housing.electricityAvailable || null,

    water_available: waterAvailable,

    water_source:
      waterAvailable === "yes"
        ? housing.waterSource || null
        : null,

    water_source_without_facility:
      waterAvailable === "no"
        ? housing.waterSourceWithoutFacility || null
        : null,

    toilet_facility: housing.toiletFacility || null,
  };
}

// ==========================================
// SECTION 8 — MULTIPLE LANDS
// ==========================================

function prepareLands(lands = []) {
  if (!Array.isArray(lands) || lands.length > 25) {
    throw new Error("Invalid land entries.");
  }

  return lands.map((land) => ({
    owner_name: land.ownerName?.trim() || null,

    land_name: land.landName?.trim() || null,

    land_size: land.landSize?.trim() || null,

    land_type: land.landType || null,

    ownership_category:
      land.ownershipCategory || null,

    deed_permit_number:
      land.ownershipCategory === "government"
        ? land.deedPermitNumber?.trim() || null
        : null,

    tenure_type: land.tenureType || null,

    main_crops: land.mainCrops?.trim() || null,
  }));
}

// ==========================================
// SECTION 9 — MULTIPLE SUBSIDIES
// ==========================================

function prepareSubsidies(subsidies = []) {
  if (!Array.isArray(subsidies) || subsidies.length > 50) {
    throw new Error("Invalid subsidy entries.");
  }

  return subsidies.map((s) => ({
    recipient_name:
      s.beneficiaryName?.trim() || "",

    assistance_type:
      s.subsidyType || "",

    amount_text:
      s.amount?.trim() || null,

    card_or_account_number:
      s.cardOrAccountNumber?.trim() || null,

    start_date_text:
      s.startDate?.trim() || null,

    institution:
      s.institution?.trim() || null,

    representative_name:
      s.representativeName?.trim() || null,

    other_information:
      s.other?.trim() || null,
  }));
}

// ==========================================
// SECTIONS 10–18
//
// Supports multiple entries for each section.
// Removes client-only card IDs before saving.
// ==========================================

function prepareExtendedSections(sections = {}) {
  const prepared = {};

  for (let number = 10; number <= 18; number++) {
    const key = `section_${number}`;

    const records = sections[key] ?? [];

    if (
      !Array.isArray(records) ||
      records.length > 50
    ) {
      throw new Error(
        `Invalid Section ${number} records.`
      );
    }

    prepared[key] = records.map((entry) => {
      const record = {};

      for (const [field, value] of Object.entries(entry)) {
        if (field !== "id") {
          record[field] = String(value ?? "").trim();
        }
      }

      return record;
    });
  }

  return prepared;
}

// ==========================================
// REGISTER HOUSEHOLD
// ==========================================

export async function registerHousehold(form) {
  const db = getClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "Please sign in again before registering."
    );
  }

  const registrationId = crypto.randomUUID();
  const uploadedPaths = [];

  try {
    // ======================================
    // PREPARE ALL FAMILY SECTIONS
    // ======================================

    const familySheet =
      prepareFamilySheet(form);

    const housingSheet =
      prepareHousingSheet(form.housing);

    const lands =
      prepareLands(form.lands);

    const subsidies =
      prepareSubsidies(form.subsidies);

    const extendedSections =
      prepareExtendedSections(form.extendedSections);

    // ======================================
    // SECTION 6 — MEMBER DOCUMENTS
    // ======================================

    const members = [];

    for (const member of form.members) {
      const birthPath = await uploadDocument(
        db,
        user.id,
        registrationId,
        member.clientId,
        "birth_certificate",
        member.birthCertificate,
        uploadedPaths
      );

      const nicPath = await uploadDocument(
        db,
        user.id,
        registrationId,
        member.clientId,
        "nic_copy",
        member.nicCopy,
        uploadedPaths
      );

      members.push({
        full_name: member.fullName,

        date_of_birth:
          member.dateOfBirth,

        relationship_to_head:
          member.relationshipToHead,

        is_head:
          Boolean(member.isHead),

        nic_number:
          member.nicNumber || null,

        school:
          member.school || null,

        grade:
          member.grade || null,

        education_level:
          member.educationLevel || null,

        job:
          member.job || null,

        workplace_address:
          member.workplaceAddress || null,

        marital_status:
          member.maritalStatus || null,

        birth_certificate_path:
          birthPath,

        nic_copy_path:
          nicPath,
      });
    }

    // ======================================
    // REGISTER ALL SECTIONS
    //
    // Section 10–18 migration must be applied
    // before calling this function.
    // ======================================

    const { data, error } = await db.rpc(
      "register_household_with_extended_sections",
      {
        p_family_name:
          form.familyName,

        p_members:
          members,

        p_existing_location_id:
          form.existingLocationId || null,

        p_address_line:
          form.addressLine || null,

        p_village:
          form.village || null,

        p_district:
          form.district || null,

        p_latitude:
          form.existingLocationId
            ? null
            : form.latitude,

        p_longitude:
          form.existingLocationId
            ? null
            : form.longitude,

        p_contact_phone:
          form.contactPhone || null,

        p_family_sheet:
          familySheet,

        p_housing_sheet:
          housingSheet,

        p_lands:
          lands,

        p_subsidies:
          subsidies,

        // NEW — SECTIONS 10–18

        p_extended_sections:
          extendedSections,
      }
    );

    if (error) {
      throw error;
    }

    return data;

  } catch (err) {
    // PostgreSQL rolls back failed RPCs.
    // Supabase Storage is a separate service,
    // so remove uploaded files if registration
    // fails.

    if (uploadedPaths.length) {
      const { error: cleanupError } =
        await db.storage
          .from(DOCUMENT_BUCKET)
          .remove(uploadedPaths);

      if (cleanupError) {
        console.error(
          "Document cleanup failed:",
          cleanupError.message
        );

        throw new Error(
          `${
            err.message || "Registration failed."
          } Some files may need administrator cleanup.`
        );
      }
    }

    throw err;
  }
}
