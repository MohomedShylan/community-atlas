
import { useState } from "react";
import {
  House,
  MapPin,
  Users,
  Building2,
  LandPlot,
  HandHeart,
  Plus,
  Trash2,
  Save,
  FileUp,
  FileText,
  X,
} from "lucide-react";

// ==========================================
// CONFIGURATION
// ==========================================

const MAX_MEMBERS = 25;
const MAX_LANDS = 25;
const MAX_SUBSIDIES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "webp",
];

// ==========================================
// SECTION 6 - MEMBER QUESTIONS
// ==========================================

const MARITAL_OPTIONS = [
  { value: "married", label: "විවාහක — Married" },
  { value: "single", label: "අවිවාහක — Single" },
];

const MEMBER_QUESTIONS = [
  {
    number: "6.1",
    key: "fullName",
    si: "සම්පූර්ණ නම",
    en: "Full Name",
    kind: "text",
    maxLength: 150,
    required: true,
    wide: true,
  },
  {
    number: "6.2",
    key: "dateOfBirth",
    si: "උපන් දිනය",
    en: "Date of Birth",
    kind: "date",
    required: true,
  },
  {
    number: "6.3",
    key: "birthCertificate",
    si: "උප්පැන්න සහතිකය පිටපත",
    en: "Copy of Birth Certificate",
    kind: "file",
  },
  {
    number: "6.4",
    key: "nicNumber",
    si: "ජාතික හැඳුනුම්පත් අංකය",
    en: "NIC No.",
    kind: "text",
    maxLength: 30,
  },
  {
    number: "6.5",
    key: "nicCopy",
    si: "ජාතික හැඳුනුම්පතේ පිටපත",
    en: "Copy of National Identity Card",
    kind: "file",
  },
  {
    number: "6.6",
    key: "school",
    si: "ඉගෙනුම ලබන/ලැබූ පාසල",
    en: "School Attended/Attending",
    kind: "text",
    maxLength: 200,
  },
  {
    number: "6.7",
    key: "grade",
    si: "ශ්‍රේණිය",
    en: "Grade",
    kind: "text",
    maxLength: 50,
  },
  {
    number: "6.8",
    key: "educationLevel",
    si: "අධ්‍යාපන මට්ටම",
    en: "Education Level",
    kind: "text",
    maxLength: 150,
  },
  {
    number: "6.9",
    key: "job",
    si: "රැකියාව",
    en: "Job",
    kind: "text",
    maxLength: 150,
  },
  {
    number: "6.10",
    key: "workplaceAddress",
    si: "රැකියා ස්ථානයේ ලිපිනය",
    en: "Address of Workplace",
    kind: "textarea",
    maxLength: 500,
    wide: true,
  },
  {
    number: "6.11",
    key: "maritalStatus",
    si: "විවාහක/අවිවාහක",
    en: "Married/Single",
    kind: "select",
    options: MARITAL_OPTIONS,
  },
];

// ==========================================
// SECTION 7 - HOUSING OPTIONS
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

// ==========================================
// SECTION 8 - LAND OPTIONS
// ==========================================

const LAND_TYPE_OPTIONS = [
  { value: "highland", label: "ගොඩ — Highland" },
  { value: "paddy", label: "මඩ — Paddy Land" },
];

const OWNERSHIP_OPTIONS = [
  { value: "government", label: "රජය සතු — Government" },
  { value: "private", label: "පෞද්ගලික — Private" },
];

const TENURE_OPTIONS = [
  { value: "freehold", label: "සින්නක්කර — Freehold" },
  { value: "lease", label: "බදු — Lease" },
  { value: "joint", label: "හවුල් — Joint" },
  { value: "litigation", label: "නඩු සහිත — Under Litigation" },
];

// ==========================================
// SECTION 9 - SUBSIDY TYPES
// ==========================================

const SUBSIDY_TYPES = [
  {
    value: "samurdhi",
    label: "සමෘද්ධි දීමනාව — Samurdhi Allowance",
  },
  {
    value: "elderly",
    label: "වැඩිහිටි දීමනාව — Elderly Allowance",
  },
  {
    value: "disability_public",
    label:
      "ආබාධිත ජීවනාධාර / මහජනාධාර දීමනාව — Disability / Public Assistance",
  },
  {
    value: "cancer_tuberculosis",
    label:
      "පිළිකාධාර / ක්ෂය රෝගය — Cancer / Tuberculosis Assistance",
  },
  {
    value: "special_government",
    label:
      "වෙනත් විශේෂ දීමනා (රජයෙන් මාසිකව ලැබෙන) — Other Government Allowances",
  },
  {
    value: "scholarship_mahapola",
    label:
      "ශිෂ්‍යත්ව / මහපොළ දීමනා — Scholarship / Mahapola",
  },
];

// ==========================================
// OBJECT FACTORIES
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

function createSubsidy() {
  return {
    id: crypto.randomUUID(),
    beneficiaryName: "",
    subsidyType: "",
    amount: "",
    cardOrAccountNumber: "",
    startDate: "",
    institution: "",
    representativeName: "",
    other: "",
  };
}

// ==========================================
// REUSABLE FORM CONTROLS
// ==========================================

function BilingualLabel({
  htmlFor,
  number,
  si,
  en,
  required = false,
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="ca-bilingual-label"
    >
      <span className="ca-label-si">
        {number ? `${number}. ` : ""}
        {si}
      </span>

      {en && (
        <span className="ca-label-en">
          ({en})
        </span>
      )}

      {required && (
        <span className="ca-required">
          {" *"}
        </span>
      )}
    </label>
  );
}

function TextField({
  id,
  number,
  si,
  en,
  value,
  onChange,
  disabled,
  required = false,
  maxLength,
  placeholder,
  type = "text",
  multiline = false,
  wide = false,
  list,
  max,
  className = "",
}) {
  return (
    <div
      className={[
        "ca-field",
        wide ? "ca-field-full" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <BilingualLabel
        htmlFor={id}
        number={number}
        si={si}
        en={en}
        required={required}
      />

      {multiline ? (
        <textarea
          id={id}
          rows={2}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : (
        <input
          id={id}
          type={type}
          maxLength={maxLength}
          max={max}
          list={list}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </div>
  );
}

function DropdownField({
  id,
  number,
  si,
  en,
  value,
  options,
  disabled,
  onChange,
  required = false,
}) {
  return (
    <div className="ca-field">
      <BilingualLabel
        htmlFor={id}
        number={number}
        si={si}
        en={en}
        required={required}
      />

      <select
        id={id}
        value={value}
        required={required}
        disabled={disabled}
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
        si={question.si}
        en={question.en}
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
        type="file"
        className="ca-file-input"
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
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
// MAIN FORM
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
  // SECTION 1 STATE
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
  // SECTION 6 STATE
  // ========================================

  const [members, setMembers] = useState([
    createMember(),
  ]);

  // ========================================
  // SECTION 7 STATE
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
  // SECTION 8 STATE
  // ========================================

  const [lands, setLands] = useState([]);

  // ========================================
  // SECTION 9 STATE
  // ========================================

  const [subsidies, setSubsidies] = useState([]);

  // ========================================
  // REGISTRATION LOCATION STATE
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

  const beneficiaryNames = [
    ...new Set(
      members
        .map((person) => person.fullName.trim())
        .filter(Boolean)
    ),
  ];

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
    if (
      saving ||
      members.length >= MAX_MEMBERS
    ) {
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
          "Upload only JPG, PNG, WebP or PDF files up to 10 MB."
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
    if (saving || lands.length >= MAX_LANDS) return;

    setLands((current) => [
      ...current,
      createLand(),
    ]);
  }

  function updateLand(id, field, value) {
    setLands((current) =>
      current.map((land) => {
        if (land.id !== id) return land;

        const updated = {
          ...land,
          [field]: value,
        };

        if (
          field === "ownershipCategory" &&
          value !== "government"
        ) {
          updated.deedPermitNumber = "";
        }

        return updated;
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
  // SECTION 9 ACTIONS
  // ========================================

  function addSubsidy() {
    if (
      saving ||
      subsidies.length >= MAX_SUBSIDIES
    ) {
      return;
    }

    setSubsidies((current) => [
      ...current,
      createSubsidy(),
    ]);
  }

  function updateSubsidy(id, field, value) {
    setSubsidies((current) =>
      current.map((subsidy) =>
        subsidy.id === id
          ? { ...subsidy, [field]: value }
          : subsidy
      )
    );
  }

  function removeSubsidy(id) {
    if (saving) return;

    setSubsidies((current) =>
      current.filter(
        (subsidy) => subsidy.id !== id
      )
    );
  }

  // ========================================
  // VALIDATION
  // ========================================

  function validate() {
    // SECTION 1

    if (
      !usingExistingLocation &&
      addressLine.trim().length < 3
    ) {
      return "Please enter a valid address.";
    }

    const familyCount = Number(
      numberOfFamiliesInHouse
    );

    if (
      !Number.isInteger(familyCount) ||
      familyCount < 1 ||
      familyCount > 999
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

    // SECTION 6

    if (
      members.length < 1 ||
      members.length > MAX_MEMBERS
    ) {
      return "Register between 1 and 25 family members.";
    }

    for (let i = 0; i < members.length; i++) {
      const person = members[i];

      if (
        person.fullName.trim().length < 2 ||
        person.fullName.trim().length > 150
      ) {
        return `Member ${i + 1}: enter a valid full name.`;
      }

      const date = new Date(
        `${person.dateOfBirth}T12:00:00`
      );

      if (
        !person.dateOfBirth ||
        person.dateOfBirth > today ||
        Number.isNaN(date.getTime())
      ) {
        return `Member ${i + 1}: enter a valid date of birth.`;
      }

      for (const question of MEMBER_QUESTIONS) {
        if (
          question.maxLength &&
          person[question.key].trim().length >
            question.maxLength
        ) {
          return `Member ${i + 1}: ${question.en} is too long.`;
        }
      }
    }

    // SECTION 7

    if (needsArrivalYear) {
      const year =
        housing.temporaryArrivalYear.trim();

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

    // SECTION 8

    if (lands.length > MAX_LANDS) {
      return "A maximum of 25 lands is allowed.";
    }

    for (let i = 0; i < lands.length; i++) {
      const land = lands[i];

      if (
        !land.ownerName.trim() &&
        !land.landName.trim()
      ) {
        return (
          `Land ${i + 1}: enter the landowner's ` +
          "name or land name."
        );
      }

      for (const [field, limit] of [
        ["ownerName", 150],
        ["landName", 200],
        ["landSize", 100],
        ["deedPermitNumber", 100],
        ["mainCrops", 300],
      ]) {
        if (land[field].trim().length > limit) {
          return `Land ${i + 1}: ${field} is too long.`;
        }
      }
    }

    // SECTION 9

    if (subsidies.length > MAX_SUBSIDIES) {
      return "A maximum of 50 subsidies is allowed.";
    }

    for (let i = 0; i < subsidies.length; i++) {
      const item = subsidies[i];
      const recipient = item.beneficiaryName.trim();

      if (!recipient) {
        return `Subsidy ${i + 1}: enter the recipient's name.`;
      }

      // Recipient must be one of the family
      // members entered in Section 6.
      const recipientExists = members.some(
        (person) =>
          person.fullName.trim().toLowerCase() ===
          recipient.toLowerCase()
      );

      if (!recipientExists) {
        return (
          `Subsidy ${i + 1}: recipient name must ` +
          "match a family member in Section 6."
        );
      }

      if (
        !SUBSIDY_TYPES.some(
          (type) => type.value === item.subsidyType
        )
      ) {
        return `Subsidy ${i + 1}: select the subsidy type.`;
      }

      for (const [field, limit] of [
        ["beneficiaryName", 150],
        ["amount", 50],
        ["cardOrAccountNumber", 100],
        ["startDate", 100],
        ["institution", 200],
        ["representativeName", 150],
        ["other", 1000],
      ]) {
        if (item[field].trim().length > limit) {
          return (
            `Subsidy ${i + 1}: ${field} ` +
            `cannot exceed ${limit} characters.`
          );
        }
      }
    }

    // GPS LOCATION

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
  // PREPARE AND SAVE
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

      numberOfFamiliesInHouse: Number(
        numberOfFamiliesInHouse
      ),

      headOfHouseholdNumber:
        headOfHouseholdNumber.trim(),

      contactPhone:
        telephoneNumber.trim(),

      whatsappNumber:
        whatsappNumber.trim(),

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

        // Required by existing registration RPC.
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

      // SECTION 8

      lands: lands.map((land) => ({
        ownerName: land.ownerName.trim(),
        landName: land.landName.trim(),
        landSize: land.landSize.trim(),
        landType: land.landType,
        ownershipCategory:
          land.ownershipCategory,
        deedPermitNumber:
          land.ownershipCategory === "government"
            ? land.deedPermitNumber.trim()
            : "",
        tenureType: land.tenureType,
        mainCrops: land.mainCrops.trim(),
      })),

      // SECTION 9
      // One member may appear many times.

      subsidies: subsidies.map((item) => ({
        beneficiaryName:
          item.beneficiaryName.trim(),
        subsidyType: item.subsidyType,
        amount: item.amount.trim(),
        cardOrAccountNumber:
          item.cardOrAccountNumber.trim(),
        startDate: item.startDate.trim(),
        institution: item.institution.trim(),
        representativeName:
          item.representativeName.trim(),
        other: item.other.trim(),
      })),

      // REGISTRATION LOCATION

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
          SECTION 1 — FAMILY INFORMATION
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
          <TextField
            id="sheet-address"
            number="1"
            si="ලිපිනය"
            en="Address"
            multiline
            wide
            className="ca-sheet-field"
            maxLength={300}
            required={!usingExistingLocation}
            disabled={saving}
            value={addressLine}
            onChange={setAddressLine}
            placeholder="Enter full address"
          />

          <TextField
            id="sheet-family-count"
            number="2"
            si="නිවසේ පදිංචි පවුල් සංඛ්‍යාව"
            en="Number of Families Residing in the House"
            type="number"
            className="ca-sheet-field"
            required
            disabled={saving}
            value={numberOfFamiliesInHouse}
            onChange={setNumberOfFamiliesInHouse}
            placeholder="Number of families"
          />

          <TextField
            id="sheet-head-number"
            number="3"
            si="ගෘහමූලික අංකය"
            en="Head of Household Number"
            className="ca-sheet-field"
            maxLength={50}
            disabled={saving}
            value={headOfHouseholdNumber}
            onChange={setHeadOfHouseholdNumber}
          />

          <TextField
            id="sheet-telephone"
            number="4"
            si="දුරකථන අංකය"
            en="Telephone Number"
            type="tel"
            className="ca-sheet-field"
            maxLength={30}
            disabled={saving}
            value={telephoneNumber}
            onChange={setTelephoneNumber}
          />

          <TextField
            id="sheet-whatsapp"
            number="5"
            si="WhatsApp අංකය"
            en="WhatsApp No."
            type="tel"
            className="ca-sheet-field"
            maxLength={30}
            disabled={saving}
            value={whatsappNumber}
            onChange={setWhatsappNumber}
          />
        </div>

        {usingExistingLocation && (
          <p className="ca-form-hint">
            This address belongs to the selected
            registered location and cannot be changed here.
          </p>
        )}
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
          Enter the head of the family as Member 1.
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
                    onClick={() =>
                      removeMember(person.id)
                    }
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

                  if (question.kind === "file") {
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

                  if (question.kind === "select") {
                    return (
                      <DropdownField
                        key={question.key}
                        id={id}
                        number={question.number}
                        si={question.si}
                        en={question.en}
                        value={person[question.key]}
                        options={question.options}
                        disabled={saving}
                        onChange={(value) =>
                          updateMember(
                            person.id,
                            question.key,
                            value
                          )
                        }
                      />
                    );
                  }

                  return (
                    <TextField
                      key={question.key}
                      id={id}
                      number={question.number}
                      si={question.si}
                      en={question.en}
                      type={
                        question.kind === "date"
                          ? "date"
                          : "text"
                      }
                      multiline={
                        question.kind === "textarea"
                      }
                      wide={question.wide}
                      required={question.required}
                      maxLength={question.maxLength}
                      max={
                        question.kind === "date"
                          ? today
                          : undefined
                      }
                      disabled={saving}
                      value={person[question.key]}
                      onChange={(value) =>
                        updateMember(
                          person.id,
                          question.key,
                          value
                        )
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================
          SECTION 7 — HOUSING INFORMATION
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
            si="පදිංචියේ ස්වභාවය"
            en="Nature of Residence"
            value={housing.residencyType}
            options={RESIDENCY_OPTIONS}
            disabled={saving}
            onChange={(value) =>
              updateHousing("residencyType", value)
            }
          />

          {needsArrivalYear && (
            <TextField
              id="housing-arrival"
              si="තාවකාලික / බදු පදනම මත පදිංචිව සිටී නම්, පැමිණි දිනය (ආසන්න වර්ෂය)"
              en="Approximate Year of Arrival"
              required
              maxLength={4}
              placeholder="e.g. 2020"
              value={housing.temporaryArrivalYear}
              disabled={saving}
              onChange={(value) =>
                updateHousing(
                  "temporaryArrivalYear",
                  value
                )
              }
            />
          )}

          <DropdownField
            id="housing-house-type"
            number="7.2"
            si="පදිංචි නිවසේ ස්වභාවය"
            en="Type of House"
            options={HOUSE_TYPE_OPTIONS}
            value={housing.houseType}
            disabled={saving}
            onChange={(value) =>
              updateHousing("houseType", value)
            }
          />

          {housing.houseType === "temporary" && (
            <DropdownField
              id="housing-material"
              si="තාවකාලික නිවසේ ද්‍රව්‍ය"
              en="Temporary House Material"
              required
              options={HOUSE_MATERIAL_OPTIONS}
              value={housing.temporaryHouseMaterial}
              disabled={saving}
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
            si="නිවසේ වහලය"
            en="Roof Type"
            options={ROOF_OPTIONS}
            value={housing.roofType}
            disabled={saving}
            onChange={(value) =>
              updateHousing("roofType", value)
            }
          />

          <DropdownField
            id="housing-floors"
            number="7.4"
            si="නිවසේ ප්‍රමාණය"
            en="Number of Floors"
            options={FLOOR_OPTIONS}
            value={housing.floorCount}
            disabled={saving}
            onChange={(value) =>
              updateHousing("floorCount", value)
            }
          />

          <DropdownField
            id="housing-electricity"
            number="7.5"
            si="විදුලි පහසුකම්"
            en="Electricity Facilities"
            options={YES_NO_OPTIONS}
            value={housing.electricityAvailable}
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
            si="ජල පහසුකම්"
            en="Water Facilities"
            options={YES_NO_OPTIONS}
            value={housing.waterAvailable}
            disabled={saving}
            onChange={(value) =>
              updateHousing("waterAvailable", value)
            }
          />

          {housing.waterAvailable === "yes" && (
            <DropdownField
              id="housing-water-source"
              si="ජලය ලබා ගන්නා ආකාරය"
              en="Source of Water"
              required
              options={WATER_SOURCE_OPTIONS}
              value={housing.waterSource}
              disabled={saving}
              onChange={(value) =>
                updateHousing("waterSource", value)
              }
            />
          )}

          {housing.waterAvailable === "no" && (
            <TextField
              id="housing-water-description"
              si="ජලය ලබා ගන්නා ආකාරය"
              en="How Water Is Obtained"
              required
              wide
              maxLength={300}
              disabled={saving}
              value={housing.waterSourceWithoutFacility}
              onChange={(value) =>
                updateHousing(
                  "waterSourceWithoutFacility",
                  value
                )
              }
            />
          )}

          <DropdownField
            id="housing-toilet"
            number="7.7"
            si="වැසිකිළි පහසුකම්"
            en="Toilet Facilities"
            options={TOILET_OPTIONS}
            value={housing.toiletFacility}
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
              <h2>පදිංචි ඉඩම පිළිබඳ විස්තර</h2>
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
          Add each land separately. The same owner
          can have multiple lands. Leave empty if
          there are no lands to register.
        </p>

        {lands.length === 0 && (
          <div className="ca-existing-location">
            <strong>No lands added</strong>
            <p>Click Add Land to register a land.</p>
          </div>
        )}

        <div className="ca-members-list">
          {lands.map((land, index) => {
            const prefix = `land-${land.id}`;

            const update = (field, value) =>
              updateLand(land.id, field, value);

            return (
              <div
                className="ca-member-form"
                key={land.id}
              >
                <div className="ca-member-form-header">
                  <strong>Land {index + 1}</strong>

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
                  <TextField
                    id={`${prefix}-owner`}
                    si="ඉඩම් හිමියන්ගේ නම"
                    en="Landowner's Name"
                    wide
                    maxLength={150}
                    value={land.ownerName}
                    disabled={saving}
                    onChange={(value) =>
                      update("ownerName", value)
                    }
                  />

                  <TextField
                    id={`${prefix}-name`}
                    si="ඉඩමේ නම"
                    en="Land Name"
                    maxLength={200}
                    value={land.landName}
                    disabled={saving}
                    onChange={(value) =>
                      update("landName", value)
                    }
                  />

                  <TextField
                    id={`${prefix}-size`}
                    si="ඉඩමේ ප්‍රමාණය"
                    en="Land Size"
                    maxLength={100}
                    value={land.landSize}
                    placeholder="e.g. 20 perches"
                    disabled={saving}
                    onChange={(value) =>
                      update("landSize", value)
                    }
                  />

                  <DropdownField
                    id={`${prefix}-type`}
                    si="ගොඩ / මඩ ඉඩමක්ද යන වග"
                    en="Land Type"
                    value={land.landType}
                    options={LAND_TYPE_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      update("landType", value)
                    }
                  />

                  <DropdownField
                    id={`${prefix}-ownership`}
                    si="ඉඩම් අයිතිය"
                    en="Government or Private Ownership"
                    value={land.ownershipCategory}
                    options={OWNERSHIP_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      update("ownershipCategory", value)
                    }
                  />

                  {land.ownershipCategory ===
                    "government" && (
                    <TextField
                      id={`${prefix}-permit`}
                      si="රජයේ ඉඩමක් නම්, ඔප්පු අංකය/බලපත්‍ර අංකය"
                      en="Deed / Permit Number"
                      wide
                      maxLength={100}
                      value={land.deedPermitNumber}
                      disabled={saving}
                      onChange={(value) =>
                        update("deedPermitNumber", value)
                      }
                    />
                  )}

                  <DropdownField
                    id={`${prefix}-tenure`}
                    si="ඉඩම් අයිතිය"
                    en="Tenure Type"
                    value={land.tenureType}
                    options={TENURE_OPTIONS}
                    disabled={saving}
                    onChange={(value) =>
                      update("tenureType", value)
                    }
                  />

                  <TextField
                    id={`${prefix}-crops`}
                    si="ප්‍රධාන භෝග වගාව"
                    en="Main Crop Cultivation"
                    maxLength={300}
                    value={land.mainCrops}
                    disabled={saving}
                    onChange={(value) =>
                      update("mainCrops", value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================
          SECTION 9 — FAMILY SUBSIDIES
      ===================================== */}

      <section className="ca-form-section">
        <div className="ca-members-heading">
          <div className="ca-form-section-heading">
            <div className="ca-form-icon">
              <HandHeart size={21} />
            </div>

            <div>
              <span className="ca-sheet-step">
                SECTION 09
              </span>

              <h2>
                පවුලේ සාමාජිකයන්ට ලැබෙන ආධාර
                පිළිබඳ තොරතුරු
              </h2>

              <p>
                Family Member Subsidy Information
                {" — "}
                {subsidies.length} subsidy record(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ca-add-member"
            disabled={
              saving ||
              subsidies.length >= MAX_SUBSIDIES
            }
            onClick={addSubsidy}
          >
            <Plus size={16} />
            Add Subsidy
          </button>
        </div>

        <p className="ca-form-hint">
          Register each subsidy separately.
          A single family member can receive
          multiple types of assistance.
          The recipient's name must match a
          family member entered in Section 6.
        </p>

        {subsidies.length === 0 && (
          <div className="ca-existing-location">
            <strong>No subsidy records added</strong>
            <p>
              Click Add Another Subsidy to enter
              assistance details. If no one receives
              assistance, leave this section empty.
            </p>
          </div>
        )}

        <div className="ca-members-list">
          {subsidies.map((item, index) => {
            const prefix = `subsidy-${item.id}`;
            const beneficiaryListId =
              `${prefix}-beneficiary-options`;

            const update = (field, value) =>
              updateSubsidy(
                item.id,
                field,
                value
              );

            return (
              <div
                className="ca-member-form"
                key={item.id}
              >
                <div className="ca-member-form-header">
                  <strong>
                    Subsidy {index + 1}
                  </strong>

                  <button
                    type="button"
                    className="ca-remove-member"
                    disabled={saving}
                    onClick={() =>
                      removeSubsidy(item.id)
                    }
                    aria-label={
                      `Remove subsidy ${index + 1}`
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="ca-form-grid">
                  {/* RECIPIENT NAME */}

                  <TextField
                    id={`${prefix}-recipient`}
                    si="ආධාරය ලබන පුද්ගලයාගේ නම"
                    en="Name of Subsidy Recipient"
                    required
                    wide
                    list={beneficiaryListId}
                    maxLength={150}
                    value={item.beneficiaryName}
                    disabled={saving}
                    placeholder="Enter or select a family member"
                    onChange={(value) =>
                      update("beneficiaryName", value)
                    }
                  />

                  <datalist id={beneficiaryListId}>
                    {beneficiaryNames.map((name) => (
                      <option
                        key={name}
                        value={name}
                      />
                    ))}
                  </datalist>

                  {/* SUBSIDY TYPE */}

                  <DropdownField
                    id={`${prefix}-type`}
                    si="ආධාර වර්ගය"
                    en="Subsidy Type"
                    required
                    value={item.subsidyType}
                    options={SUBSIDY_TYPES}
                    disabled={saving}
                    onChange={(value) =>
                      update("subsidyType", value)
                    }
                  />

                  {/* AMOUNT */}

                  <TextField
                    id={`${prefix}-amount`}
                    si="ආධාර මුදල"
                    en="Subsidy Amount"
                    maxLength={50}
                    value={item.amount}
                    disabled={saving}
                    placeholder="e.g. Rs. 5,000"
                    onChange={(value) =>
                      update("amount", value)
                    }
                  />

                  {/* ACCOUNT / CARD NUMBER */}

                  <TextField
                    id={`${prefix}-account`}
                    si="කාඩ්පත් අංකය/ගිණුම් අංකය"
                    en="Card Number / Account Number"
                    wide
                    maxLength={100}
                    value={item.cardOrAccountNumber}
                    disabled={saving}
                    placeholder="Enter card or account number"
                    onChange={(value) =>
                      update(
                        "cardOrAccountNumber",
                        value
                      )
                    }
                  />

                  {/* START DATE */}

                  <TextField
                    id={`${prefix}-start`}
                    si="දීමනාව පටන්ගත් දිනය"
                    en="Date the Allowance Started"
                    maxLength={100}
                    value={item.startDate}
                    disabled={saving}
                    placeholder="e.g. 2024-01-15"
                    onChange={(value) =>
                      update("startDate", value)
                    }
                  />

                  {/* BANK OR POST OFFICE */}

                  <TextField
                    id={`${prefix}-institution`}
                    si="දීමනාව ලබා ගන්නා බැංකුව හෝ තැපැල් කාර්යාලය"
                    en="Bank or Post Office"
                    maxLength={200}
                    value={item.institution}
                    disabled={saving}
                    placeholder="Bank or post office name"
                    onChange={(value) =>
                      update("institution", value)
                    }
                  />

                  {/* AUTHORIZED REPRESENTATIVE */}

                  <TextField
                    id={`${prefix}-representative`}
                    si="දීමනාව ලබා ගැනීම සඳහා නියෝජිතයෙකු නම් කර ඇත්නම්, එම පුද්ගලයාගේ නම"
                    en="Appointed Representative's Name"
                    wide
                    maxLength={150}
                    value={item.representativeName}
                    disabled={saving}
                    placeholder="Enter representative's name, if any"
                    onChange={(value) =>
                      update(
                        "representativeName",
                        value
                      )
                    }
                  />

                  {/* OTHER */}

                  <TextField
                    id={`${prefix}-other`}
                    si="වෙනත්"
                    en="Other Information"
                    wide
                    multiline
                    maxLength={1000}
                    value={item.other}
                    disabled={saving}
                    placeholder="Enter any other subsidy information"
                    onChange={(value) =>
                      update("other", value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================
          REGISTRATION LOCATION
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
              <TextField
                id="registration-village"
                si="Village"
                maxLength={120}
                value={village}
                disabled={saving}
                onChange={setVillage}
              />

              <TextField
                id="registration-district"
                si="District"
                maxLength={120}
                value={district}
                disabled={saving}
                onChange={setDistrict}
              />

              <TextField
                id="registration-latitude"
                si="Latitude"
                type="number"
                required
                value={latitude}
                disabled={saving}
                onChange={setLatitude}
              />

              <TextField
                id="registration-longitude"
                si="Longitude"
                type="number"
                required
                value={longitude}
                disabled={saving}
                onChange={setLongitude}
              />
            </>
          )}
        </div>

        <p className="ca-form-hint">
          Community Atlas automatically generates
          family and individual codes.
        </p>
      </section>

      {/* =====================================
          ERROR AND SAVE
      ===================================== */}

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
