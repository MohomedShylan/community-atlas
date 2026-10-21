
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
} from "lucide-react";

const MAX_MEMBERS = 25;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf", "jpg", "jpeg", "png", "webp",
];

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
  { value: "coconut_leaves", label: "පොල් අතු — Coconut leaves" },
  { value: "other", label: "වෙනත් — Other" },
];

const ROOF_OPTIONS = [
  { value: "tiles", label: "උළු — Tiles" },
  { value: "asbestos", label: "ඇස්බැස්ටෝස් — Asbestos" },
  { value: "other", label: "වෙනත් — Other" },
];

const FLOOR_OPTIONS = [
  { value: "one", label: "එක් මහලක් — One floor" },
  { value: "two", label: "මහල් දෙකක් — Two floors" },
  { value: "three", label: "මහල් තුනක් — Three floors" },
];

const YES_NO_OPTIONS = [
  { value: "yes", label: "ඇත — Yes" },
  { value: "no", label: "නැත — No" },
];

const WATER_SOURCE_OPTIONS = [
  { value: "protected_well", label: "ආරක්ෂිත ළිඳක් — Protected well" },
  { value: "piped_water", label: "නල ජලය — Piped water" },
  { value: "tube_well", label: "නල ළිඳක් — Tube well" },
  { value: "other", label: "වෙනත් — Other" },
];

const TOILET_OPTIONS = [
  { value: "water_sealed", label: "ජල මුද්‍රිත — Water-sealed" },
  { value: "pit", label: "වල වැසිකිළි — Pit toilet" },
  { value: "commode", label: "කොමඩ් — Commode" },
  { value: "none", label: "වැසිකිළියක් නැත — No toilet" },
];

const MARITAL_OPTIONS = [
  { value: "married", label: "විවාහක — Married" },
  { value: "single", label: "අවිවාහක — Single" },
];

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
    placeholder: "Enter full name",
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
    english: "Copy of the Birth Certificate",
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
    english: "Copy of the National Identity Card",
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
    english: "Address of Workplace",
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
        {number}. {sinhala}
      </span>
      <span className="ca-label-en">
        ({english})
      </span>
      {required && (
        <span className="ca-required">*</span>
      )}
    </label>
  );
}

function DropdownField({
  id,
  number,
  sinhala,
  english,
  value,
  options,
  onChange,
  disabled,
}) {
  return (
    <div className="ca-field">
      <BilingualLabel
        htmlFor={id}
        number={number}
        sinhala={sinhala}
        english={english}
      />

      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        <option value="">Select an option</option>
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
        sinhala={question.sinhala}
        english={question.english}
      />

      <label htmlFor={id} className="ca-upload-box">
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

export default function HouseholdForm({
  selectedPoint,
  existingLocation,
  saving,
  onSave,
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
  // LOCATION
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

  const currentYear = new Date().getFullYear();
  const today = new Date().toLocaleDateString("en-CA");

  // ========================================
  // RESIDENCY YEAR CONDITIONS
  //
  // NEW: Both Temporary AND Rental now
  // display the arrival-year text field.
  // ========================================

  const needsArrivalYear =
    housing.residencyType === "temporary" ||
    housing.residencyType === "rental";

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
          "Use a JPG, PNG, WebP or PDF file, maximum 10 MB."
        );
        return;
      }
    }

    updateMember(memberId, field, file);
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

    if (
      headOfHouseholdNumber.trim().length > 50
    ) {
      return "Head of Household Number is too long.";
    }

    if (
      telephoneNumber.trim().length > 30 ||
      whatsappNumber.trim().length > 30
    ) {
      return "Telephone and WhatsApp numbers are too long.";
    }

    if (
      members.length < 1 ||
      members.length > MAX_MEMBERS
    ) {
      return "Register between 1 and 25 family members.";
    }

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

    // ======================================
    // 7.1 - TEMPORARY OR RENTAL ARRIVAL YEAR
    // ======================================

    if (needsArrivalYear) {
      const year = housing.temporaryArrivalYear.trim();

      if (
        !/^\d{4}$/.test(year) ||
        Number(year) < 1800 ||
        Number(year) > currentYear
      ) {
        return (
          "Enter a valid approximate arrival year " +
          "for Temporary or Rental residence."
        );
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
  // SUBMIT REGISTRATION
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

      // SECTION 7

      housing: {
        residencyType: housing.residencyType,

        // NEW: Preserve this value for
        // Temporary and Rental residences.
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

      // SECTION 6
      // Member 1 is automatically the head.

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
  // FORM
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
              onChange={(event) =>
                setAddressLine(event.target.value)
              }
              placeholder="Enter full address"
            />

            {usingExistingLocation && (
              <p className="ca-form-hint">
                This address belongs to the
                selected registered location.
              </p>
            )}
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-family-count"
              number="2"
              sinhala="නිවසේ පදිංචි පවුල් සංඛ්‍යාව"
              english="Number of families residing in the house"
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
              onChange={(event) =>
                setNumberOfFamiliesInHouse(
                  event.target.value
                )
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
              onChange={(event) =>
                setHeadOfHouseholdNumber(event.target.value)
              }
              placeholder="Head of Household Number"
            />
          </div>

          <div className="ca-field ca-sheet-field">
            <BilingualLabel
              htmlFor="sheet-telephone"
              number="4"
              sinhala="දුරකථන අංකය"
              english="Telephone number"
            />

            <input
              id="sheet-telephone"
              type="tel"
              maxLength={30}
              disabled={saving}
              value={telephoneNumber}
              onChange={(event) =>
                setTelephoneNumber(event.target.value)
              }
              placeholder="Telephone number"
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
              onChange={(event) =>
                setWhatsappNumber(event.target.value)
              }
              placeholder="WhatsApp number"
            />
          </div>
        </div>
      </section>

      {/* =====================================
          SECTION 6
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
          Enter the family head as Member 1.
          Full Name and Date of Birth are required
          for every member.
        </p>

        <div className="ca-members-list">
          {members.map((person, index) => (
            <div
              key={person.id}
              className="ca-member-form"
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
                          onChange={(event) =>
                            updateMember(
                              person.id,
                              question.key,
                              event.target.value
                            )
                          }
                        />
                      ) : question.type === "select" ? (
                        <select
                          id={id}
                          disabled={saving}
                          value={person[question.key]}
                          onChange={(event) =>
                            updateMember(
                              person.id,
                              question.key,
                              event.target.value
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
                          placeholder={question.placeholder}
                          onChange={(event) =>
                            updateMember(
                              person.id,
                              question.key,
                              event.target.value
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
          SECTION 7
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
          {/* 7.1 NATURE OF RESIDENCE */}

          <DropdownField
            id="housing-residency-type"
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

          {/* NEW:
              ARRIVAL YEAR FOR TEMPORARY AND RENTAL */}

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
                placeholder="e.g. 2020"
                value={housing.temporaryArrivalYear}
                onChange={(event) =>
                  updateHousing(
                    "temporaryArrivalYear",
                    event.target.value
                  )
                }
              />
            </div>
          )}

          {/* 7.2 HOUSE TYPE */}

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
            <div className="ca-field">
              <label htmlFor="housing-material">
                තාවකාලික නිවසේ ද්‍රව්‍ය
                <span className="ca-required">
                  {" *"}
                </span>
                <span className="ca-label-en">
                  {" "}(Temporary House Material)
                </span>
              </label>

              <select
                id="housing-material"
                value={housing.temporaryHouseMaterial}
                required
                disabled={saving}
                onChange={(event) =>
                  updateHousing(
                    "temporaryHouseMaterial",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select material
                </option>
                {HOUSE_MATERIAL_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 7.3 ROOF */}

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

          {/* 7.4 FLOORS */}

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

          {/* 7.5 ELECTRICITY */}

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

          {/* 7.6 WATER */}

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
            <div className="ca-field">
              <label htmlFor="housing-water-source">
                ජලය ලබා ගන්නා ආකාරය
                <span className="ca-required">
                  {" *"}
                </span>
                <span className="ca-label-en">
                  {" "}(Source of Water)
                </span>
              </label>

              <select
                id="housing-water-source"
                required
                disabled={saving}
                value={housing.waterSource}
                onChange={(event) =>
                  updateHousing(
                    "waterSource",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select water source
                </option>

                {WATER_SOURCE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {housing.waterAvailable === "no" && (
            <div className="ca-field ca-field-full">
              <label htmlFor="housing-water-no-source">
                ජලය ලබා ගන්නා ආකාරය
                <span className="ca-required">
                  {" *"}
                </span>
                <span className="ca-label-en">
                  {" "}(How Water Is Obtained)
                </span>
              </label>

              <input
                id="housing-water-no-source"
                type="text"
                maxLength={300}
                required
                disabled={saving}
                value={housing.waterSourceWithoutFacility}
                onChange={(event) =>
                  updateHousing(
                    "waterSourceWithoutFacility",
                    event.target.value
                  )
                }
                placeholder="Describe how water is obtained"
              />
            </div>
          )}

          {/* 7.7 TOILET */}

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
                  This family will share the
                  selected registered location.
                  No new map marker will be created.
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
                  value={village}
                  disabled={saving}
                  onChange={(event) =>
                    setVillage(event.target.value)
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
                  value={district}
                  disabled={saving}
                  onChange={(event) =>
                    setDistrict(event.target.value)
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
                  onChange={(event) =>
                    setLatitude(event.target.value)
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
                  onChange={(event) =>
                    setLongitude(event.target.value)
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
