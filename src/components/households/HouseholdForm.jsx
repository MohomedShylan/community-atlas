
import { useState } from "react";
import {
  House,
  MapPin,
  Users,
  Building2,
  Plus,
  Trash2,
  Save,
  FileUp,
  FileText,
  X,
  LandPlot,
} from "lucide-react";

const MAX_MEMBERS = 25;
const MAX_LANDS = 25;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "webp",
];

// ==========================================
// DROPDOWN OPTIONS
// ==========================================

const RESIDENCY_OPTIONS = [
  { value: "permanent", label: "ස්ථිර පදිංචිය — Permanent" },
  { value: "temporary", label: "තාවකාලික පදිංචිය — Temporary" },
  { value: "rental", label: "බදු පදනම මත — Rental" },
];

const HOUSE_TYPE_OPTIONS = [
  { value: "permanent", label: "ස්ථිර — Permanent" },
  { value: "semi_permanent", label: "අර්ධ ස්ථිර — Semi-permanent" },
  { value: "temporary", label: "තාවකාලික — Temporary" },
];

const HOUSE_MATERIAL_OPTIONS = [
  { value: "mud", label: "මැටි — Mud" },
  { value: "straw", label: "පිදුරු — Straw" },
  { value: "coconut_leaves", label: "පොල් අතු — Coconut Leaves" },
  { value: "other", label: "වෙනත් — Other" },
];

const ROOF_OPTIONS = [
  { value: "tiles", label: "උළු — Tiles" },
  { value: "asbestos", label: "ඇස්බැස්ටෝස් — Asbestos" },
  { value: "other", label: "වෙනත් — Other" },
];

const FLOOR_OPTIONS = [
  { value: "one", label: "එක් මහලක් — One Floor" },
  { value: "two", label: "මහල් දෙකක් — Two Floors" },
  { value: "three", label: "මහල් තුනක් — Three Floors" },
];

const YES_NO_OPTIONS = [
  { value: "yes", label: "ඇත — Yes" },
  { value: "no", label: "නැත — No" },
];

const WATER_SOURCE_OPTIONS = [
  { value: "protected_well", label: "ආරක්ෂිත ළිඳක් — Protected Well" },
  { value: "piped_water", label: "නල ජලය — Piped Water" },
  { value: "tube_well", label: "නල ළිඳක් — Tube Well" },
  { value: "other", label: "වෙනත් — Other" },
];

const TOILET_OPTIONS = [
  { value: "water_sealed", label: "ජල මුද්‍රිත — Water-sealed" },
  { value: "pit", label: "වල වැසිකිළි — Pit Toilet" },
  { value: "commode", label: "කොමඩ් — Commode" },
  { value: "none", label: "වැසිකිළියක් නැත — No Toilet" },
];

const MARITAL_OPTIONS = [
  { value: "married", label: "විවාහක — Married" },
  { value: "single", label: "අවිවාහක — Single" },
];

// ==========================================
// SECTION 8 OPTIONS
// ==========================================

const LAND_TYPE_OPTIONS = [
  { value: "highland", label: "ගොඩ — Highland" },
  { value: "paddy", label: "මඩ — Paddy Land" },
];

const LAND_OWNERSHIP_OPTIONS = [
  { value: "government", label: "රජය සතු — Government" },
  { value: "private", label: "පෞද්ගලික — Private" },
];

const LAND_TENURE_OPTIONS = [
  { value: "freehold", label: "සින්නක්කර — Freehold" },
  { value: "lease", label: "බදු — Lease" },
  { value: "joint", label: "හවුල් — Joint Ownership" },
  { value: "litigation", label: "නඩු සහිත — Under Litigation" },
];

// ==========================================
// SECTION 6 QUESTION DEFINITIONS
// ==========================================

const MEMBER_QUESTIONS = [
  {
    number: "6.1",
    key: "fullName",
    sinhala: "සම්පූර්ණ නම",
    english: "Full Name",
    type: "text",
    maxLength: 150,
    required: true,
    wide: true,
  },
  {
    number: "6.2",
    key: "dateOfBirth",
    sinhala: "උපන් දිනය",
    english: "Date of Birth",
    type: "date",
    required: true,
  },
  {
    number: "6.3",
    key: "birthCertificate",
    sinhala: "උප්පැන්න සහතිකය පිටපත",
    english: "Copy of Birth Certificate",
    type: "file",
  },
  {
    number: "6.4",
    key: "nicNumber",
    sinhala: "ජාතික හැඳුනුම්පත් අංකය",
    english: "NIC No.",
    type: "text",
    maxLength: 30,
  },
  {
    number: "6.5",
    key: "nicCopy",
    sinhala: "ජාතික හැඳුනුම්පතේ පිටපත",
    english: "Copy of National Identity Card",
    type: "file",
  },
  {
    number: "6.6",
    key: "school",
    sinhala: "ඉගෙනුම ලබන/ලැබූ පාසල",
    english: "School Attended/Attending",
    type: "text",
    maxLength: 200,
  },
  {
    number: "6.7",
    key: "grade",
    sinhala: "ශ්‍රේණිය",
    english: "Grade",
    type: "text",
    maxLength: 50,
  },
  {
    number: "6.8",
    key: "educationLevel",
    sinhala: "අධ්‍යාපන මට්ටම",
    english: "Education Level",
    type: "text",
    maxLength: 150,
  },
  {
    number: "6.9",
    key: "job",
    sinhala: "රැකියාව",
    english: "Job",
    type: "text",
    maxLength: 150,
  },
  {
    number: "6.10",
    key: "workplaceAddress",
    sinhala: "රැකියා ස්ථානයේ ලිපිනය",
    english: "Workplace Address",
    type: "textarea",
    maxLength: 500,
    wide: true,
  },
  {
    number: "6.11",
    key: "maritalStatus",
    sinhala: "විවාහක/අවිවාහක",
    english: "Married/Single",
    type: "select",
    options: MARITAL_OPTIONS,
  },
];

// ==========================================
// INITIAL FORM OBJECTS
// ==========================================

function createMember() {
  return {
    id: crypto.randomUUID(),
    fullName: "",
    dateOfBirth: "",
    birthCertificate: null,
    nicNumber: "",
    nicCopy: null,
    school: "",
    grade: "",
    educationLevel: "",
    job: "",
    workplaceAddress: "",
    maritalStatus: "",
  };
}

function createLand() {
  return {
    id: crypto.randomUUID(),
    ownerName: "",
    landName: "",
    landSize: "",
    landType: "",
    ownershipCategory: "",
    deedPermitNumber: "",
    tenureType: "",
    mainCrops: "",
  };
}

// ==========================================
// REUSABLE BILINGUAL LABEL
// ==========================================

function BilingualLabel({
  htmlFor,
  number,
  sinhala,
  english,
  required = false,
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="ca-bilingual-label"
    >
      <span className="ca-label-si">
        {number ? `${number}. ` : ""}
        {sinhala}
      </span>

      <span className="ca-label-en">
        ({english})
      </span>

      {required && (
        <span className="ca-required">
          {" *"}
        </span>
      )}
    </label>
  );
}

// ==========================================
// REUSABLE DROPDOWN
// ==========================================

function DropdownField({
  id,
  number,
  sinhala,
  english,
  value,
  options,
  onChange,
  disabled,
  required = false,
}) {
  return (
    <div className="ca-field">
      <BilingualLabel
        htmlFor={id}
        number={number}
        sinhala={sinhala}
        english={english}
        required={required}
      />

      <select
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        <option value="">
          Select an option
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==========================================
// PRIVATE DOCUMENT SELECTION
// ==========================================

function DocumentField({
  id,
  question,
  file,
  disabled,
  onFileChange,
}) {
  return (
    <div className="ca-field ca-document-field">
      <BilingualLabel
        htmlFor={id}
        number={question.number}
        sinhala={question.sinhala}
        english={question.english}
      />

      <label
        className="ca-upload-box"
        htmlFor={id}
      >
        {file
          ? <FileText size={22} />
          : <FileUp size={22} />}

        <span>
          {file ? file.name : "Choose image or PDF"}
        </span>

        <small>
          JPG, PNG, WebP or PDF — maximum 10 MB
        </small>
      </label>

      <input
        id={id}
        className="ca-file-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        disabled={disabled}
        onChange={(event) => {
          onFileChange(
            event.target.files?.[0] ?? null
          );
          event.target.value = "";
        }}
      />

      {file && (
        <button
          type="button"
          className="ca-file-remove"
          disabled={disabled}
          onClick={() => onFileChange(null)}
        >
          <X size={15} />
          Remove selected file
        </button>
      )}
    </div>
  );
}

// ==========================================
// MAIN HOUSEHOLD FORM
// ==========================================

export default function HouseholdForm({
  selectedPoint,
  existingLocation,
  onSave,
  saving,
}) {
  const usingExistingLocation =
    Boolean(existingLocation?.id);

  // ========================================
  // SECTION 1
  // ========================================

  const [addressLine, setAddressLine] = useState(
    existingLocation?.address_line ?? ""
  );

  const [
    numberOfFamiliesInHouse,
    setNumberOfFamiliesInHouse,
  ] = useState("");

  const [
    headOfHouseholdNumber,
    setHeadOfHouseholdNumber,
  ] = useState("");

  const [telephoneNumber, setTelephoneNumber] =
    useState("");

  const [whatsappNumber, setWhatsappNumber] =
    useState("");

  // ========================================
  // SECTION 6
  // ========================================

  const [members, setMembers] = useState([
    createMember(),
  ]);

  // ========================================
  // SECTION 7
  // ========================================

  const [housing, setHousing] = useState({
    residencyType: "",
    temporaryArrivalYear: "",
    houseType: "",
    temporaryHouseMaterial: "",
    roofType: "",
    floorCount: "",
    electricityAvailable: "",
    waterAvailable: "",
    waterSource: "",
    waterSourceWithoutFacility: "",
    toiletFacility: "",
  });

  // ========================================
  // SECTION 8 - MULTIPLE LANDS
  // ========================================

  const [lands, setLands] = useState([]);

  // ========================================
  // GPS / LOCATION
  // ========================================

  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");

  const [latitude, setLatitude] = useState(
    selectedPoint?.lat != null
      ? Number(selectedPoint.lat).toFixed(6)
      : ""
  );

  const [longitude, setLongitude] = useState(
    selectedPoint?.lng != null
      ? Number(selectedPoint.lng).toFixed(6)
      : ""
  );

  const [error, setError] = useState("");

  const now = new Date();

  const currentYear = now.getFullYear();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const needsArrivalYear =
    housing.residencyType === "temporary" ||
    housing.residencyType === "rental";

  // ========================================
  // SECTION 6 ACTIONS
  // ========================================

  function updateMember(id, field, value) {
    setMembers((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, [field]: value }
          : person
      )
    );
  }

  function addMember() {
    if (saving || members.length >= MAX_MEMBERS) {
      return;
    }

    setMembers((current) => [
      ...current,
      createMember(),
    ]);
  }

  function removeMember(id) {
    if (saving) return;

    setMembers((current) =>
      current.length <= 1
        ? current
        : current.filter(
            (person) => person.id !== id
          )
    );
  }

  function changeDocument(memberId, field, file) {
    setError("");

    if (file) {
      const extension = file.name
        .split(".")
        .pop()
        ?.toLowerCase();

      if (
        !ALLOWED_EXTENSIONS.includes(extension) ||
        file.size <= 0 ||
        file.size > MAX_FILE_SIZE
      ) {
        setError(
          "Use a JPG, PNG, WebP or PDF file up to 10 MB."
        );
        return;
      }
    }

    updateMember(memberId, field, file);
  }

  // ========================================
  // SECTION 7 ACTIONS
  // ========================================

  function updateHousing(field, value) {
    setHousing((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (
        field === "residencyType" &&
        value !== "temporary" &&
        value !== "rental"
      ) {
        next.temporaryArrivalYear = "";
      }

      if (
        field === "houseType" &&
        value !== "temporary"
      ) {
        next.temporaryHouseMaterial = "";
      }

      if (field === "waterAvailable") {
        if (value !== "yes") {
          next.waterSource = "";
        }

        if (value !== "no") {
          next.waterSourceWithoutFacility = "";
        }
      }

      return next;
    });
  }

  // ========================================
  // SECTION 8 ACTIONS
  // ========================================

  function addLand() {
    if (saving || lands.length >= MAX_LANDS) {
      return;
    }

    setLands((current) => [
      ...current,
      createLand(),
    ]);
  }

  function updateLand(id, field, value) {
    setLands((current) =>
      current.map((land) => {
        if (land.id !== id) {
          return land;
        }

        const next = {
          ...land,
          [field]: value,
        };

        // Clear permit/deed number if
        // no longer government-owned.
        if (
          field === "ownershipCategory" &&
          value !== "government"
        ) {
          next.deedPermitNumber = "";
        }

        return next;
      })
    );
  }

  function removeLand(id) {
    if (saving) return;

    setLands((current) =>
      current.filter((land) => land.id !== id)
    );
  }

  // ========================================
  // VALIDATION
  // ========================================

  function validate() {
    if (
      !usingExistingLocation &&
      addressLine.trim().length < 3
    ) {
      return "Please enter a valid address.";
    }

    const count = Number(
      numberOfFamiliesInHouse
    );

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 999
    ) {
      return "Number of families must be between 1 and 999.";
    }

    if (headOfHouseholdNumber.trim().length > 50) {
      return "Head of Household Number is too long.";
    }

    if (
      telephoneNumber.trim().length > 30 ||
      whatsappNumber.trim().length > 30
    ) {
      return "Telephone or WhatsApp number is too long.";
    }

    if (
      members.length < 1 ||
      members.length > MAX_MEMBERS
    ) {
      return "Register between 1 and 25 family members.";
    }

    // Validate family members

    for (let index = 0; index < members.length; index++) {
      const person = members[index];

      if (
        person.fullName.trim().length < 2 ||
        person.fullName.trim().length > 150
      ) {
        return `Member ${index + 1}: enter a valid full name.`;
      }

      if (
        !person.dateOfBirth ||
        person.dateOfBirth > today ||
        Number.isNaN(
          new Date(
            `${person.dateOfBirth}T12:00:00`
          ).getTime()
        )
      ) {
        return `Member ${index + 1}: enter a valid date of birth.`;
      }

      for (const question of MEMBER_QUESTIONS) {
        if (
          question.maxLength &&
          person[question.key].trim().length >
            question.maxLength
        ) {
          return `Member ${index + 1}: ${question.english} is too long.`;
        }
      }
    }

    // Validate conditional Section 7 fields

    if (needsArrivalYear) {
      const year = housing.temporaryArrivalYear.trim();

      if (
        !/^\d{4}$/.test(year) ||
        Number(year) < 1800 ||
        Number(year) > currentYear
      ) {
        return "Enter a valid approximate arrival year.";
      }
    }

    if (
      housing.houseType === "temporary" &&
      !housing.temporaryHouseMaterial
    ) {
      return "Select the temporary house material.";
    }

    if (
      housing.waterAvailable === "yes" &&
      !housing.waterSource
    ) {
      return "Select how water is obtained.";
    }

    if (
      housing.waterAvailable === "no" &&
      !housing.waterSourceWithoutFacility.trim()
    ) {
      return "Describe how water is obtained.";
    }

    if (
      housing.waterSourceWithoutFacility.length > 300
    ) {
      return "Water source description is too long.";
    }

    // Validate Section 8 lands

    if (lands.length > MAX_LANDS) {
      return "You can register up to 25 lands.";
    }

    for (let index = 0; index < lands.length; index++) {
      const land = lands[index];
      const number = index + 1;

      // Each added land should have at least
      // one identifying detail.
      if (
        !land.ownerName.trim() &&
        !land.landName.trim()
      ) {
        return (
          `Land ${number}: enter the landowner's name ` +
          "or the land name."
        );
      }

      const limits = [
        ["ownerName", 150],
        ["landName", 200],
        ["landSize", 100],
        ["deedPermitNumber", 100],
        ["mainCrops", 300],
      ];

      for (const [field, maxLength] of limits) {
        if (land[field].trim().length > maxLength) {
          return `Land ${number}: a field exceeds ${maxLength} characters.`;
        }
      }
    }

    // Validate location

    if (!usingExistingLocation) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        latitude.trim() === "" ||
        longitude.trim() === "" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return "Valid GPS coordinates are required.";
      }
    }

    return "";
  }

  // ========================================
  // SAVE
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    const payload = {
      // SECTION 1
      familyName: members[0].fullName.trim(),
      numberOfFamiliesInHouse:
        Number(numberOfFamiliesInHouse),
      headOfHouseholdNumber:
        headOfHouseholdNumber.trim(),
      contactPhone: telephoneNumber.trim(),
      whatsappNumber: whatsappNumber.trim(),

      // SECTION 6
      members: members.map((person, index) => ({
        clientId: person.id,
        fullName: person.fullName.trim(),
        dateOfBirth: person.dateOfBirth,
        birthCertificate: person.birthCertificate,
        nicNumber: person.nicNumber.trim(),
        nicCopy: person.nicCopy,
        school: person.school.trim(),
        grade: person.grade.trim(),
        educationLevel:
          person.educationLevel.trim(),
        job: person.job.trim(),
        workplaceAddress:
          person.workplaceAddress.trim(),
        maritalStatus: person.maritalStatus,
        isHead: index === 0,
        relationshipToHead:
          index === 0 ? "Head" : "",
      })),

      // SECTION 7
      housing: {
        residencyType: housing.residencyType,
        temporaryArrivalYear: needsArrivalYear
          ? housing.temporaryArrivalYear.trim()
          : "",
        houseType: housing.houseType,
        temporaryHouseMaterial:
          housing.houseType === "temporary"
            ? housing.temporaryHouseMaterial
            : "",
        roofType: housing.roofType,
        floorCount: housing.floorCount,
        electricityAvailable:
          housing.electricityAvailable,
        waterAvailable: housing.waterAvailable,
        waterSource:
          housing.waterAvailable === "yes"
            ? housing.waterSource
            : "",
        waterSourceWithoutFacility:
          housing.waterAvailable === "no"
            ? housing.waterSourceWithoutFacility.trim()
            : "",
        toiletFacility: housing.toiletFacility,
      },

      // SECTION 8 — MULTIPLE LANDS
      lands: lands.map((land) => ({
        ownerName: land.ownerName.trim(),
        landName: land.landName.trim(),
        landSize: land.landSize.trim(),
        landType: land.landType,
        ownershipCategory: land.ownershipCategory,
        deedPermitNumber:
          land.ownershipCategory === "government"
            ? land.deedPermitNumber.trim()
            : "",
        tenureType: land.tenureType,
        mainCrops: land.mainCrops.trim(),
      })),

      // LOCATION
      existingLocationId:
        existingLocation?.id ?? null,
      addressLine: addressLine.trim(),
      village: village.trim(),
      district: district.trim(),
      latitude: usingExistingLocation
        ? null
        : Number(latitude),
      longitude: usingExistingLocation
        ? null
        : Number(longitude),
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err.message ||
        "Could not register the household."
      );
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <form
      className="ca-registration-form"
      onSubmit={handleSubmit}
    >
      {/* =====================================
          SECTION 1
      ===================================== */}

      <section className="ca-form-section ca-sheet-section">
        <div className="ca-form-section-heading">
          <div className="ca-form-icon">
            <House size={21} />
          </div>
          <div>
            <span className="ca-sheet-step">
              SECTION 01
            </span>
            <h2>පවුල් තොරතුරු පත්‍රිකාව</h2>
            <p>Family Information Sheet</p>
          </div>
        </div>

        <div className="ca-sheet-fields">
          <div className="ca-field ca-sheet-field ca-field-full">
            <BilingualLabel
              htmlFor="sheet-address"
              number="1"
              sinhala="ලිපිනය"
              english="Address"
              required={!usingExistingLocation}
            />
            <textarea
              id="sheet-address"
              rows={2}
              maxLength={300}
              required={!usingExistingLocation}
              readOnly={usingExistingLocation}
              disabled={saving}
              value={addressLine}
              onChange={(e) =>
                setAddressLine(e.target.value)
              }
              placeholder="Enter full address"
            />
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-family-count"
              number="2"
              sinhala="නිවසේ පදිංචි පවුල් සංඛ්‍යාව"
              english="Number of Families Residing in the House"
              required
            />
            <input
              id="sheet-family-count"
              type="number"
              min="1"
              max="999"
              step="1"
              required
              disabled={saving}
              value={numberOfFamiliesInHouse}
              onChange={(e) =>
                setNumberOfFamiliesInHouse(e.target.value)
              }
              placeholder="Number of families"
            />
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-head-number"
              number="3"
              sinhala="ගෘහමූලික අංකය"
              english="Head of Household Number"
            />
            <input
              id="sheet-head-number"
              type="text"
              maxLength={50}
              disabled={saving}
              value={headOfHouseholdNumber}
              onChange={(e) =>
                setHeadOfHouseholdNumber(e.target.value)
              }
            />
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-telephone"
              number="4"
              sinhala="දුරකථන අංකය"
              english="Telephone Number"
            />
            <input
              id="sheet-telephone"
              type="tel"
              maxLength={30}
              disabled={saving}
              value={telephoneNumber}
              onChange={(e) =>
                setTelephoneNumber(e.target.value)
              }
            />
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-whatsapp"
              number="5"
              sinhala="WhatsApp අංකය"
              english="WhatsApp No."
            />
            <input
              id="sheet-whatsapp"
              type="tel"
              maxLength={30}
              disabled={saving}
              value={whatsappNumber}
              onChange={(e) =>
                setWhatsappNumber(e.target.value)
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================
          SECTION 6 — FAMILY MEMBERS
      ===================================== */}

      <section className="ca-form-section">
        <div className="ca-members-heading">
          <div className="ca-form-section-heading">
            <div className="ca-form-icon">
              <Users size={21} />
            </div>
            <div>
              <span className="ca-sheet-step">
                SECTION 06
              </span>
              <h2>
                පවුලේ සාමාජිකයින් පිළිබඳ තොරතුරු
              </h2>
              <p>
                Family Member Information —{" "}
                {members.length} member(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ca-add-member"
            disabled={
              saving || members.length >= MAX_MEMBERS
            }
            onClick={addMember}
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>

        <p className="ca-form-hint">
          Enter the household head as Member 1.
          Full Name and Date of Birth are required.
        </p>

        <div className="ca-members-list">
          {members.map((person, index) => (
            <div
              className="ca-member-form"
              key={person.id}
            >
              <div className="ca-member-form-header">
                <strong>Member {index + 1}</strong>

                {members.length > 1 && (
                  <button
                    type="button"
                    className="ca-remove-member"
                    disabled={saving}
                    onClick={() => removeMember(person.id)}
                    aria-label={`Remove member ${index + 1}`}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="ca-form-grid">
                {MEMBER_QUESTIONS.map((question) => {
                  const id =
                    `member-${person.id}-${question.key}`;

                  if (question.type === "file") {
                    return (
                      <DocumentField
                        key={question.key}
                        id={id}
                        question={question}
                        file={person[question.key]}
                        disabled={saving}
                        onFileChange={(file) =>
                          changeDocument(
                            person.id,
                            question.key,
                            file
                          )
                        }
                      />
                    );
                  }

                  return (
                    <div
                      key={question.key}
                      className={
                        `ca-field ${
                          question.wide
                            ? "ca-field-full"
                            : ""
                        }`
                      }
                    >
                      <BilingualLabel
                        htmlFor={id}
                        number={question.number}
                        sinhala={question.sinhala}
                        english={question.english}
                        required={question.required}
                      />

                      {question.type === "textarea" ? (
                        <textarea
                          id={id}
                          rows={2}
                          maxLength={question.maxLength}
                          disabled={saving}
                          value={person[question.key]}
                          onChange={(e) =>
                            updateMember(
                              person.id,
                              question.key,
                              e.target.value
                            )
                          }
                        />
                      ) : question.type === "select" ? (
                        <select
                          id={id}
                          disabled={saving}
                          value={person[question.key]}
                          onChange={(e) =>
                            updateMember(
                              person.id,
                              question.key,
                              e.target.value
                            )
                          }
                        >
                          <option value="">
                            Select status
                          </option>
                          {question.options.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type={question.type}
                          required={question.required}
                          maxLength={question.maxLength}
                          max={
                            question.type === "date"
                              ? today
                              : undefined
                          }
                          disabled={saving}
                          value={person[question.key]}
                          onChange={(e) =>
                            updateMember(
                              person.id,
                              question.key,
                              e.target.value
                            )
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================
          SECTION 7 — HOUSING
      ===================================== */}

      <section className="ca-form-section">
        <div className="ca-form-section-heading">
          <div className="ca-form-icon">
            <Building2 size={21} />
          </div>
          <div>
            <span className="ca-sheet-step">
              SECTION 07
            </span>
            <h2>නිවාස හා පදිංචි තොරතුරු</h2>
            <p>Housing and Residence Information</p>
          </div>
        </div>

        <div className="ca-form-grid">
          <DropdownField
            id="housing-residency"
            number="7.1"
            sinhala="පදිංචියේ ස්වභාවය"
            english="Nature of Residence"
            value={housing.residencyType}
            options={RESIDENCY_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("residencyType", value)
            }
          />

          {needsArrivalYear && (
            <div className="ca-field">
              <label htmlFor="housing-arrival-year">
                තාවකාලික / බදු පදනම මත පදිංචිව
                සිටී නම්, පැමිණි දිනය
                (ආසන්න වර්ෂය)
                <span className="ca-required">
                  {" *"}
                </span>
                <span className="ca-label-en">
                  {" "}(Approximate Year of Arrival)
                </span>
              </label>

              <input
                id="housing-arrival-year"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                disabled={saving}
                value={housing.temporaryArrivalYear}
                onChange={(e) =>
                  updateHousing(
                    "temporaryArrivalYear",
                    e.target.value
                  )
                }
                placeholder="e.g. 2020"
              />
            </div>
          )}

          <DropdownField
            id="housing-house-type"
            number="7.2"
            sinhala="පදිංචි නිවසේ ස්වභාවය"
            english="Type of House"
            value={housing.houseType}
            options={HOUSE_TYPE_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("houseType", value)
            }
          />

          {housing.houseType === "temporary" && (
            <DropdownField
              id="housing-material"
              sinhala="තාවකාලික නිවසේ ද්‍රව්‍ය"
              english="Temporary House Material"
              value={housing.temporaryHouseMaterial}
              options={HOUSE_MATERIAL_OPTIONS}
              disabled={saving}
              required
              onChange={(value) =>
                updateHousing(
                  "temporaryHouseMaterial",
                  value
                )
              }
            />
          )}

          <DropdownField
            id="housing-roof"
            number="7.3"
            sinhala="නිවසේ වහලය"
            english="Roof Type"
            value={housing.roofType}
            options={ROOF_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("roofType", value)
            }
          />

          <DropdownField
            id="housing-floors"
            number="7.4"
            sinhala="නිවසේ ප්‍රමාණය"
            english="Number of Floors"
            value={housing.floorCount}
            options={FLOOR_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("floorCount", value)
            }
          />

          <DropdownField
            id="housing-electricity"
            number="7.5"
            sinhala="විදුලි පහසුකම්"
            english="Electricity Facilities"
            value={housing.electricityAvailable}
            options={YES_NO_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing(
                "electricityAvailable",
                value
              )
            }
          />

          <DropdownField
            id="housing-water"
            number="7.6"
            sinhala="ජල පහසුකම්"
            english="Water Facilities"
            value={housing.waterAvailable}
            options={YES_NO_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("waterAvailable", value)
            }
          />

          {housing.waterAvailable === "yes" && (
            <DropdownField
              id="housing-water-source"
              sinhala="ජලය ලබා ගන්නා ආකාරය"
              english="Water Source"
              value={housing.waterSource}
              options={WATER_SOURCE_OPTIONS}
              disabled={saving}
              required
              onChange={(value) =>
                updateHousing("waterSource", value)
              }
            />
          )}

          {housing.waterAvailable === "no" && (
            <div className="ca-field ca-field-full">
              <BilingualLabel
                htmlFor="housing-water-description"
                sinhala="ජලය ලබා ගන්නා ආකාරය"
                english="How Water Is Obtained"
                required
              />

              <input
                id="housing-water-description"
                type="text"
                maxLength={300}
                required
                disabled={saving}
                value={housing.waterSourceWithoutFacility}
                onChange={(e) =>
                  updateHousing(
                    "waterSourceWithoutFacility",
                    e.target.value
                  )
                }
                placeholder="Describe how water is obtained"
              />
            </div>
          )}

          <DropdownField
            id="housing-toilet"
            number="7.7"
            sinhala="වැසිකිළි පහසුකම්"
            english="Toilet Facilities"
            value={housing.toiletFacility}
            options={TOILET_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("toiletFacility", value)
            }
          />
        </div>
      </section>

      {/* =====================================
          SECTION 8 — LAND INFORMATION
      ===================================== */}

      <section className="ca-form-section">
        <div className="ca-members-heading">
          <div className="ca-form-section-heading">
            <div className="ca-form-icon">
              <LandPlot size={21} />
            </div>

            <div>
              <span className="ca-sheet-step">
                SECTION 08
              </span>

              <h2>
                පදිංචි ඉඩම පිළිබඳ විස්තර
              </h2>

              <p>
                Land Information — {lands.length} land(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ca-add-member"
            disabled={
              saving || lands.length >= MAX_LANDS
            }
            onClick={addLand}
          >
            <Plus size={16} />
            Add Land
          </button>
        </div>

        <p className="ca-form-hint">
          Add each land separately. The same
          landowner's name may be entered for
          multiple lands. If there is no land to
          register, leave this section empty.
        </p>

        {lands.length === 0 && (
          <div className="ca-existing-location">
            <strong>No lands added</strong>
            <p>
              Click "Add Land" to register the first land.
            </p>
          </div>
        )}

        <div className="ca-members-list">
          {lands.map((land, index) => {
            const prefix = `land-${land.id}`;

            return (
              <div
                className="ca-member-form"
                key={land.id}
              >
                <div className="ca-member-form-header">
                  <strong>
                    Land {index + 1}
                  </strong>

                  <button
                    type="button"
                    className="ca-remove-member"
                    disabled={saving}
                    onClick={() => removeLand(land.id)}
                    aria-label={`Remove land ${index + 1}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="ca-form-grid">
                  {/* LANDOWNER NAME */}

                  <div className="ca-field ca-field-full">
                    <BilingualLabel
                      htmlFor={`${prefix}-owner`}
                      sinhala="ඉඩම් හිමියන්ගේ නම"
                      english="Landowner's Name"
                    />

                    <input
                      id={`${prefix}-owner`}
                      type="text"
                      maxLength={150}
                      disabled={saving}
                      value={land.ownerName}
                      onChange={(e) =>
                        updateLand(
                          land.id,
                          "ownerName",
                          e.target.value
                        )
                      }
                      placeholder="Enter landowner's name"
                    />
                  </div>

                  {/* LAND NAME */}

                  <div className="ca-field">
                    <BilingualLabel
                      htmlFor={`${prefix}-name`}
                      sinhala="ඉඩමේ නම"
                      english="Land Name"
                    />

                    <input
                      id={`${prefix}-name`}
                      type="text"
                      maxLength={200}
                      disabled={saving}
                      value={land.landName}
                      onChange={(e) =>
                        updateLand(
                          land.id,
                          "landName",
                          e.target.value
                        )
                      }
                      placeholder="Enter land name"
                    />
                  </div>

                  {/* LAND SIZE */}

                  <div className="ca-field">
                    <BilingualLabel
                      htmlFor={`${prefix}-size`}
                      sinhala="ඉඩමේ ප්‍රමාණය"
                      english="Land Size"
                    />

                    <input
                      id={`${prefix}-size`}
                      type="text"
                      maxLength={100}
                      disabled={saving}
                      value={land.landSize}
                      onChange={(e) =>
                        updateLand(
                          land.id,
                          "landSize",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 20 perches, 2 acres"
                    />
                  </div>

                  {/* HIGHLAND / PADDY LAND */}

                  <DropdownField
                    id={`${prefix}-type`}
                    sinhala="ගොඩ / මඩ ඉඩමක්ද යන වග"
                    english="Land Type"
                    value={land.landType}
                    options={LAND_TYPE_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      updateLand(
                        land.id,
                        "landType",
                        value
                      )
                    }
                  />

                  {/* GOVERNMENT / PRIVATE */}

                  <DropdownField
                    id={`${prefix}-ownership`}
                    sinhala="ඉඩම් අයිතිය"
                    english="Government or Private Ownership"
                    value={land.ownershipCategory}
                    options={LAND_OWNERSHIP_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      updateLand(
                        land.id,
                        "ownershipCategory",
                        value
                      )
                    }
                  />

                  {/* GOVERNMENT DEED / PERMIT */}

                  {land.ownershipCategory === "government" && (
                    <div className="ca-field ca-field-full">
                      <BilingualLabel
                        htmlFor={`${prefix}-permit`}
                        sinhala="රජයේ ඉඩමක් නම්, ඔප්පු අංකය/බලපත්‍ර අංකය"
                        english="Government Land Deed / Permit Number"
                      />

                      <input
                        id={`${prefix}-permit`}
                        type="text"
                        maxLength={100}
                        disabled={saving}
                        value={land.deedPermitNumber}
                        onChange={(e) =>
                          updateLand(
                            land.id,
                            "deedPermitNumber",
                            e.target.value
                          )
                        }
                        placeholder="Enter deed or permit number"
                      />
                    </div>
                  )}

                  {/* TENURE TYPE */}

                  <DropdownField
                    id={`${prefix}-tenure`}
                    sinhala="ඉඩම් අයිතිය"
                    english="Tenure Type"
                    value={land.tenureType}
                    options={LAND_TENURE_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      updateLand(
                        land.id,
                        "tenureType",
                        value
                      )
                    }
                  />

                  {/* MAIN CROPS */}

                  <div className="ca-field">
                    <BilingualLabel
                      htmlFor={`${prefix}-crops`}
                      sinhala="ප්‍රධාන භෝග වගාව"
                      english="Main Crop Cultivation"
                    />

                    <input
                      id={`${prefix}-crops`}
                      type="text"
                      maxLength={300}
                      disabled={saving}
                      value={land.mainCrops}
                      onChange={(e) =>
                        updateLand(
                          land.id,
                          "mainCrops",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Coconut, Paddy, Banana"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================
          REGISTRATION DETAILS
      ===================================== */}

      <section className="ca-form-section">
        <div className="ca-form-section-heading">
          <div className="ca-form-icon">
            <MapPin size={21} />
          </div>
          <div>
            <h2>Registration Details</h2>
            <p>
              GPS location and geographical details
            </p>
          </div>
        </div>

        <div className="ca-form-grid">
          {usingExistingLocation ? (
            <div className="ca-field ca-field-full">
              <div className="ca-existing-location">
                <strong>
                  {existingLocation.location_code}
                </strong>

                <p>
                  {existingLocation.address_line}
                </p>

                <span>
                  This family will share the existing
                  registered location. No new map
                  marker will be created.
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="ca-field">
                <label htmlFor="village">
                  Village
                </label>
                <input
                  id="village"
                  type="text"
                  maxLength={120}
                  disabled={saving}
                  value={village}
                  onChange={(e) =>
                    setVillage(e.target.value)
                  }
                />
              </div>

              <div className="ca-field">
                <label htmlFor="district">
                  District
                </label>
                <input
                  id="district"
                  type="text"
                  maxLength={120}
                  disabled={saving}
                  value={district}
                  onChange={(e) =>
                    setDistrict(e.target.value)
                  }
                />
              </div>

              <div className="ca-field">
                <label htmlFor="latitude">
                  Latitude
                  <span className="ca-required">
                    {" *"}
                  </span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  required
                  disabled={saving}
                  value={latitude}
                  onChange={(e) =>
                    setLatitude(e.target.value)
                  }
                />
              </div>

              <div className="ca-field">
                <label htmlFor="longitude">
                  Longitude
                  <span className="ca-required">
                    {" *"}
                  </span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  required
                  disabled={saving}
                  value={longitude}
                  onChange={(e) =>
                    setLongitude(e.target.value)
                  }
                />
              </div>
            </>
          )}
        </div>

        <p className="ca-form-hint">
          Community Atlas automatically generates
          family and individual codes.
        </p>
      </section>

      {/* ERROR AND SAVE */}

      {error && (
        <div
          className="ca-form-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="ca-form-actions">
        <button
          type="submit"
          className="ca-save-household"
          disabled={saving}
        >
          <Save size={18} />
          {saving
            ? "Uploading documents and saving..."
            : "Register Household"}
        </button>
      </div>
    </form>
  );
}
