
import { supabase } from "../lib/supabase";

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
// GET ACTIVE HOUSEHOLDS
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

  if (error) {
    throw error;
  }

  return data ?? [];
}

// ==========================================
// VALIDATE DOCUMENT TYPES
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
      `Unsupported document type: ${file.name}`
    );
  }

  return {
    extension:
      extension === "jpeg" ? "jpg" : extension,
    mime,
  };
}

// ==========================================
// UPLOAD PRIVATE MEMBER DOCUMENT
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
  if (!file) {
    return null;
  }

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
//
// Arrival year is included when residency
// is either Temporary OR Rental.
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
    residency_type: residencyType,

    // Existing database key is preserved.
    // It now represents the approximate year
    // of arrival for Temporary or Rental.

    temporary_arrival_year:
      needsArrivalYear
        ? housing.temporaryArrivalYear || null
        : null,

    house_type: houseType,

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
      "Please sign in again before registering a household."
    );
  }

  const registrationId = crypto.randomUUID();
  const uploadedPaths = [];

  try {
    const members = [];

    // ======================================
    // UPLOAD SECTION 6 DOCUMENTS
    // ======================================

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
          birthCertificatePath,

        nic_copy_path:
          nicCopyPath,
      });
    }

    // ======================================
    // PREPARE SECTIONS 1 AND 7
    // ======================================

    const familySheet =
      prepareFamilySheet(form);

    const housingSheet =
      prepareHousingSheet(form.housing);

    // ======================================
    // SAVE USING EXISTING RPC
    // ======================================

    const { data, error } = await db.rpc(
      "register_household_with_housing",
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
      }
    );

    if (error) {
      throw error;
    }

    return data;

  } catch (err) {
    // Database registration is atomic.
    // Storage uploads must be cleaned up
    // separately if registration fails.

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
