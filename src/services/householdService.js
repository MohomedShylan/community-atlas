
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
    throw new Error(
      "Supabase is not configured."
    );
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

function getDocumentType(file) {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const mime = DOCUMENT_TYPES[extension];

  if (
    !mime ||
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE
  ) {
    throw new Error(
      "Upload only JPG, PNG, WebP or PDF files up to 10 MB."
    );
  }

  if (file.type && file.type !== mime) {
    throw new Error(
      `Unsupported document format: ${file.name}`
    );
  }

  return {
    extension:
      extension === "jpeg" ? "jpg" : extension,
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
  documentType,
  file,
  uploadedPaths
) {
  if (!file) return null;

  const { extension, mime } =
    getDocumentType(file);

  const path = [
    userId,
    registrationId,
    memberId,
    `${documentType}.${extension}`,
  ].join("/");

  const { error } = await db.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Failed to upload ${documentType}: ${error.message}`
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
  const residencyType =
    housing.residencyType || null;

  const houseType =
    housing.houseType || null;

  const waterAvailable =
    housing.waterAvailable || null;

  const needsArrivalYear =
    residencyType === "temporary" ||
    residencyType === "rental";

  return {
    residency_type:
      residencyType,

    temporary_arrival_year:
      needsArrivalYear
        ? housing.temporaryArrivalYear || null
        : null,

    house_type:
      houseType,

    temporary_house_material:
      houseType === "temporary"
        ? housing.temporaryHouseMaterial || null
        : null,

    roof_type:
      housing.roofType || null,

    floor_count:
      housing.floorCount || null,

    electricity_available:
      housing.electricityAvailable || null,

    water_available:
      waterAvailable,

    water_source:
      waterAvailable === "yes"
        ? housing.waterSource || null
        : null,

    water_source_without_facility:
      waterAvailable === "no"
        ? housing.waterSourceWithoutFacility || null
        : null,

    toilet_facility:
      housing.toiletFacility || null,
  };
}

// ==========================================
// SECTION 8 - MULTIPLE LANDS
// ==========================================

function prepareLands(lands = []) {
  if (!Array.isArray(lands)) {
    throw new Error(
      "Land information must be an array."
    );
  }

  return lands.map((land) => ({
    owner_name:
      land.ownerName?.trim() || null,

    land_name:
      land.landName?.trim() || null,

    land_size:
      land.landSize?.trim() || null,

    land_type:
      land.landType || null,

    ownership_category:
      land.ownershipCategory || null,

    deed_permit_number:
      land.ownershipCategory === "government"
        ? land.deedPermitNumber?.trim() || null
        : null,

    tenure_type:
      land.tenureType || null,

    main_crops:
      land.mainCrops?.trim() || null,
  }));
}

// ==========================================
// SECTION 9 - MULTIPLE SUBSIDIES
//
// Card/account information is submitted
// to a separate protected database table.
// ==========================================

function prepareSubsidies(subsidies = []) {
  if (!Array.isArray(subsidies)) {
    throw new Error(
      "Subsidy information must be an array."
    );
  }

  if (subsidies.length > 50) {
    throw new Error(
      "You can register a maximum of 50 subsidies."
    );
  }

  return subsidies.map((item) => ({
    recipient_name:
      item.beneficiaryName?.trim() || "",

    assistance_type:
      item.subsidyType || "",

    amount_text:
      item.amount?.trim() || null,

    card_or_account_number:
      item.cardOrAccountNumber?.trim() || null,

    start_date_text:
      item.startDate?.trim() || null,

    institution:
      item.institution?.trim() || null,

    representative_name:
      item.representativeName?.trim() || null,

    other_information:
      item.other?.trim() || null,
  }));
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
    // SECTION 6 - MEMBER DATA AND DOCUMENTS
    // ======================================

    const members = [];

    for (const member of form.members) {
      const birthCertificatePath =
        await uploadDocument(
          db,
          user.id,
          registrationId,
          member.clientId,
          "birth_certificate",
          member.birthCertificate,
          uploadedPaths
        );

      const nicCopyPath =
        await uploadDocument(
          db,
          user.id,
          registrationId,
          member.clientId,
          "nic_copy",
          member.nicCopy,
          uploadedPaths
        );

      members.push({
        full_name:
          member.fullName,

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
          birthCertificatePath,

        nic_copy_path:
          nicCopyPath,
      });
    }

    // ======================================
    // PREPARE FAMILY INFORMATION
    // ======================================

    const familySheet =
      prepareFamilySheet(form);

    const housingSheet =
      prepareHousingSheet(form.housing);

    const landEntries =
      prepareLands(form.lands);

    const subsidyEntries =
      prepareSubsidies(form.subsidies);

    // ======================================
    // NEW TRANSACTIONAL REGISTRATION RPC
    // ======================================

    const { data, error } = await db.rpc(
      "register_household_with_subsidies",
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
          landEntries,

        // SECTION 9
        p_subsidies:
          subsidyEntries,
      }
    );

    if (error) {
      throw error;
    }

    return data;
  } catch (err) {
    // Database RPC calls run inside one
    // transaction. Storage uploads do not.
    // Attempt to remove unused documents
    // if the registration fails.

    if (uploadedPaths.length > 0) {
      const { error: cleanupError } =
        await db.storage
          .from(DOCUMENT_BUCKET)
          .remove(uploadedPaths);

      if (cleanupError) {
        console.error(
          "Private document cleanup failed:",
          cleanupError.message
        );

        throw new Error(
          `${
            err.message || "Registration failed."
          } Some uploaded documents may require administrator cleanup.`
        );
      }
    }

    throw err;
  }
}
