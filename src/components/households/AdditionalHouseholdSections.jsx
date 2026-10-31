
import { ClipboardList, Plus, Trash2 } from "lucide-react";

// ==========================================
// COMMUNITY ATLAS
// FAMILY INFORMATION SHEET
// SECTIONS 10 TO 18
// ==========================================

const MAX_ENTRIES = 50;

const pensionTypes = [
  { value: "civil", label: "සිවිල් — Civil" },
  {
    value: "widow_orphan",
    label: "වැන්දඹු අනත් දරු — Widow / Orphan",
  },
  {
    value: "military_dependent",
    label: "හමුදා යැපීම — Military Dependent",
  },
  { value: "other", label: "වෙනත් — Other" },
];

const securityBranches = [
  { value: "army", label: "යුධ — Army" },
  { value: "air_force", label: "ගුවන් — Air Force" },
  { value: "navy", label: "නාවික — Navy" },
  { value: "police", label: "පොලිස් — Police" },
  {
    value: "vip_security",
    label: "ප්‍රභූ ආරක්ෂක — VIP Security",
  },
];

const securityStatuses = [
  { value: "disabled", label: "ආබාධිත — Disabled" },
  { value: "deceased", label: "මිය ගිය — Deceased" },
];

const overseasReasons = [
  { value: "employment", label: "රැකියාවට — Employment" },
  { value: "education", label: "අධ්‍යාපනයට — Education" },
];

const disabilityTypes = [
  { value: "mental", label: "මානසික — Mental" },
  { value: "physical", label: "කායික — Physical" },
  {
    value: "physical_impairment",
    label: "අංගවිකල — Physical Impairment",
  },
];

const disabilityCauses = [
  { value: "from_birth", label: "උපතින් — From Birth" },
  { value: "accident", label: "හදිසි අනතුරකින් — Accident" },
  { value: "other", label: "වෙනත් — Other" },
];

const employmentStatuses = [
  { value: "employed", label: "නිරත වේ — Employed" },
  {
    value: "not_employed",
    label: "නිරත නොවේ — Not Employed",
  },
];

const livestockProducts = [
  { value: "meat", label: "මස් — Meat" },
  { value: "eggs", label: "බිත්තර — Eggs" },
  { value: "milk", label: "කිරි — Milk" },
];

// Helpers for field definitions.

function textField(key, si, en, options = {}) {
  return {
    key,
    si,
    en,
    type: "text",
    maxLength: options.maxLength ?? 200,
    required: options.required ?? false,
    memberSuggestion: options.memberSuggestion ?? false,
    wide: options.wide ?? false,
    placeholder: options.placeholder ?? "",
  };
}

function selectField(key, si, en, options) {
  return {
    key,
    si,
    en,
    type: "select",
    options,
    required: false,
  };
}

// ==========================================
// SECTION CONFIGURATIONS
// ==========================================

export const ADDITIONAL_SECTION_CONFIG = [
  {
    number: 10,
    titleSi:
      "පවුලේ සිටින රජයේ විශ්‍රාම වැටුප් ලබන අය පිළිබඳ තොරතුරු",
    titleEn: "Government Pensioner Information",
    buttonLabel: "Add Another Pensioner",
    entryLabel: "Pensioner",
    fields: [
      textField(
        "retiree_name",
        "විශ්‍රාමිකයාගේ නම",
        "Pensioner's Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      textField(
        "served_institution",
        "සේවය කල ආයතනය",
        "Institution Served"
      ),
      textField(
        "held_position",
        "දැරූ තනතුර",
        "Position Held"
      ),
      textField(
        "pension_number",
        "විශ්‍රාම වැටුප් අංකය",
        "Pension Number",
        { maxLength: 100 }
      ),
      textField(
        "retirement_year",
        "විශ්‍රාම ගිය වසර",
        "Year of Retirement",
        { maxLength: 30, placeholder: "e.g. 2020" }
      ),
      textField(
        "service_duration",
        "සේවා කාලය",
        "Length of Service",
        { placeholder: "e.g. 25 years" }
      ),
      selectField(
        "pension_type",
        "විශ්‍රාම වැටුප් වර්ගය",
        "Pension Type",
        pensionTypes
      ),
      textField(
        "other",
        "වෙනත්",
        "Other",
        { maxLength: 1000, wide: true }
      ),
    ],
  },

  {
    number: 11,
    titleSi:
      "ආරක්ෂක අංශයේ නියුතු අය පිළිබඳ තොරතුරු",
    titleEn: "Security Personnel Information",
    buttonLabel: "Add Another Security Member",
    entryLabel: "Security Member",
    fields: [
      textField(
        "person_name",
        "නම",
        "Full Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      selectField(
        "security_branch",
        "ආරක්ෂක අංශය",
        "Security Branch",
        securityBranches
      ),
      textField(
        "service_address",
        "සේවා ස්ථානයේ ලිපිනය",
        "Service Location Address",
        { wide: true, maxLength: 300 }
      ),
      textField(
        "position",
        "තනතුර",
        "Position"
      ),
      textField(
        "service_duration",
        "දැනට සේවා කාලය",
        "Service Duration"
      ),
      selectField(
        "current_status",
        "දැනට සිටින තත්වය",
        "Current Status",
        securityStatuses
      ),
      textField(
        "other",
        "වෙනත්",
        "Other",
        { wide: true, maxLength: 1000 }
      ),
    ],
  },

  {
    number: 12,
    titleSi: "විදේශ ගත අය පිළිබඳ තොරතුරු",
    titleEn: "Overseas Family Member Information",
    buttonLabel: "Add Another Overseas Member",
    entryLabel: "Overseas Member",
    fields: [
      textField(
        "person_name",
        "නම",
        "Full Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      textField(
        "country",
        "විදේශ ගත වී ඇති රට",
        "Country"
      ),
      textField(
        "passport_number",
        "ගමන් බලපත් අංකය",
        "Passport Number",
        { maxLength: 100 }
      ),
      selectField(
        "travel_reason",
        "විදේශ ගත වූ හේතුව",
        "Reason for Going Abroad",
        overseasReasons
      ),
      textField(
        "departure_date",
        "විදේශ ගත වූ දිනය",
        "Departure Date",
        { placeholder: "e.g. 2023-05-20" }
      ),
      textField(
        "return_date",
        "නැවත ලංකාවට පැමිණ ඇත්නම් ඒ දිනය",
        "Return Date, if Returned",
        { placeholder: "e.g. 2025-01-10" }
      ),
      textField(
        "other",
        "වෙනත්",
        "Other",
        { wide: true, maxLength: 1000 }
      ),
    ],
  },

  {
    number: 13,
    titleSi: "ආබාධිත අය පිළිබඳ තොරතුරු",
    titleEn: "Disability Information",
    buttonLabel: "Add Another Person",
    entryLabel: "Person",
    fields: [
      textField(
        "person_name",
        "නම",
        "Full Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      selectField(
        "disability_type",
        "ආබාධයේ ස්වභාවය",
        "Nature of Disability",
        disabilityTypes
      ),
      selectField(
        "disability_cause",
        "ආබාධිත බවට හේතුව",
        "Cause of Disability",
        disabilityCauses
      ),
      selectField(
        "employment_status",
        "රැකියාවක නිරතවනවාද / නැද්ද යන වග",
        "Employment Status",
        employmentStatuses
      ),
      textField(
        "special_abilities",
        "විශේෂ හැකියාවන්",
        "Special Abilities",
        { maxLength: 300 }
      ),
      textField(
        "assistance_amount",
        "ලැබෙන ආධාර මුදල්",
        "Assistance Amount",
        { placeholder: "e.g. Rs. 5,000" }
      ),
    ],
  },

  {
    number: 14,
    titleSi:
      "නිවසේ සිටින ව්‍යාපාර කරන අය පිළිබඳ විස්තර",
    titleEn: "Family Business Information",
    buttonLabel: "Add Another Business",
    entryLabel: "Business",
    fields: [
      textField(
        "business_person_name",
        "ව්‍යාපාරය කරන අයගේ නම",
        "Business Owner's Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      textField(
        "business_nature",
        "ව්‍යාපාරයේ ස්වභාවය",
        "Nature of Business"
      ),
      textField(
        "business_name",
        "ව්‍යාපාරයේ නම",
        "Business Name"
      ),
      textField(
        "business_address",
        "ව්‍යාපාරික ස්ථානය ලිපිනය",
        "Business Address",
        { wide: true, maxLength: 300 }
      ),
      textField(
        "registration_number",
        "ලියාපදිංචි අංකය",
        "Registration Number",
        { maxLength: 100 }
      ),
    ],
  },

  {
    number: 15,
    titleSi: "ස්වයං රැකියාව පිළිබඳ විස්තර",
    titleEn: "Self-employment Information",
    buttonLabel: "Add Another Self-employment",
    entryLabel: "Self-employment",
    fields: [
      textField(
        "person_name",
        "ස්වයං රැකියාව කරන අයගේ නම",
        "Self-employed Person's Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      textField(
        "self_employment",
        "ස්වයං රැකියාව",
        "Type of Self-employment",
        { wide: true, maxLength: 300 }
      ),
    ],
  },

  {
    number: 16,
    titleSi: "නිවසේ ඇති වාහන පිළිබඳ තොරතුරු",
    titleEn: "Household Vehicle Information",
    buttonLabel: "Add Another Vehicle",
    entryLabel: "Vehicle",
    fields: [
      textField(
        "vehicle_type",
        "වාහන වර්ගය",
        "Vehicle Type",
        { required: true, placeholder: "e.g. Car, Motorcycle" }
      ),
      textField(
        "owner_name",
        "අයිතිකරුගේ නම",
        "Owner's Name",
        { memberSuggestion: true }
      ),
      textField(
        "vehicle_number",
        "වාහන අංකය",
        "Vehicle Registration Number",
        { maxLength: 100, wide: true }
      ),
    ],
  },

  {
    number: 17,
    titleSi: "සත්ව පාලන කටයුතු",
    titleEn: "Livestock Farming",
    buttonLabel: "Add Another Animal Type",
    entryLabel: "Livestock Record",
    fields: [
      textField(
        "animal_type",
        "සත්ත්ව වර්ගය",
        "Animal Type",
        {
          required: true,
          placeholder: "e.g. කුකුළන් / එළුවන් / හරක්",
        }
      ),
      textField(
        "quantity",
        "ප්‍රමාණය",
        "Quantity",
        { placeholder: "e.g. 25" }
      ),
      selectField(
        "products",
        "ලබා ගන්නා දේවල්",
        "Products Obtained",
        livestockProducts
      ),
    ],
  },

  {
    number: 18,
    titleSi:
      "නිවසේ සිටින වෘත්තීය පුහුණුව ලැබූ අය හෝ රැකියා අපේක්ෂිත අය පිළිබඳ තොරතුරු",
    titleEn: "Vocational Training and Job Seeker Information",
    buttonLabel: "Add Another Person",
    entryLabel: "Training / Job Seeker",
    fields: [
      textField(
        "person_name",
        "නම",
        "Full Name",
        { required: true, memberSuggestion: true, wide: true }
      ),
      textField(
        "training_received",
        "ලබා ඇති පුහුණුව",
        "Training Received",
        { maxLength: 300 }
      ),
      textField(
        "training_institution",
        "පුහුණුව ලැබූ ආයතනය",
        "Training Institution",
        { maxLength: 300 }
      ),
      textField(
        "other_qualifications",
        "වෙනත් සුදුසුකම්",
        "Other Qualifications",
        { maxLength: 1000, wide: true }
      ),
    ],
  },
];

// ==========================================
// VALIDATION FOR ALL NINE SECTIONS
// ==========================================

export function validateAdditionalSections(value = {}) {
  for (const section of ADDITIONAL_SECTION_CONFIG) {
    const key = `section_${section.number}`;
    const entries = value[key] ?? [];

    if (!Array.isArray(entries)) {
      return `Section ${section.number}: invalid data.`;
    }

    if (entries.length > MAX_ENTRIES) {
      return (
        `Section ${section.number}: maximum ` +
        `${MAX_ENTRIES} entries allowed.`
      );
    }

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];

      for (const field of section.fields) {
        const fieldValue = String(entry[field.key] ?? "").trim();

        if (field.required && !fieldValue) {
          return (
            `Section ${section.number}, entry ${index + 1}: ` +
            `${field.en} is required.`
          );
        }

        if (
          field.maxLength &&
          fieldValue.length > field.maxLength
        ) {
          return (
            `Section ${section.number}, entry ${index + 1}: ` +
            `${field.en} is too long.`
          );
        }

        if (
          field.type === "select" &&
          fieldValue &&
          !field.options.some(
            (option) => option.value === fieldValue
          )
        ) {
          return (
            `Section ${section.number}, entry ${index + 1}: ` +
            `invalid ${field.en}.`
          );
        }
      }
    }
  }

  return "";
}

// ==========================================
// REUSABLE BILINGUAL FIELD
// ==========================================

function ExtraField({
  id,
  field,
  value,
  disabled,
  onChange,
}) {
  return (
    <div
      className={
        `ca-field ${field.wide ? "ca-field-full" : ""}`
      }
    >
      <label
        htmlFor={id}
        className="ca-bilingual-label"
      >
        <span className="ca-label-si">
          {field.si}
        </span>

        <span className="ca-label-en">
          ({field.en})
        </span>

        {field.required && (
          <span className="ca-required">
            {" *"}
          </span>
        )}
      </label>

      {field.type === "select" ? (
        <select
          id={id}
          value={value}
          disabled={disabled}
          required={field.required}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          <option value="">Select an option</option>

          {field.options.map((option) => (
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
          type="text"
          maxLength={field.maxLength}
          value={value}
          disabled={disabled}
          required={field.required}
          placeholder={field.placeholder}
          list={
            field.memberSuggestion
              ? "ca-extended-member-names"
              : undefined
          }
          autoComplete="off"
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </div>
  );
}

// ==========================================
// REPEATABLE SECTION COMPONENT
// ==========================================

export default function AdditionalHouseholdSections({
  value = {},
  onChange,
  memberNames = [],
  saving = false,
}) {
  function createEntry(section) {
    const entry = {
      id: crypto.randomUUID(),
    };

    section.fields.forEach((field) => {
      entry[field.key] = "";
    });

    return entry;
  }

  function addEntry(section) {
    const key = `section_${section.number}`;

    onChange((current) => {
      const existing = current[key] ?? [];

      if (existing.length >= MAX_ENTRIES) {
        return current;
      }

      return {
        ...current,
        [key]: [
          ...existing,
          createEntry(section),
        ],
      };
    });
  }

  function updateEntry(
    sectionNumber,
    entryId,
    fieldName,
    fieldValue
  ) {
    const key = `section_${sectionNumber}`;

    onChange((current) => ({
      ...current,
      [key]: (current[key] ?? []).map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              [fieldName]: fieldValue,
            }
          : entry
      ),
    }));
  }

  function removeEntry(sectionNumber, entryId) {
    const key = `section_${sectionNumber}`;

    onChange((current) => ({
      ...current,
      [key]: (current[key] ?? []).filter(
        (entry) => entry.id !== entryId
      ),
    }));
  }

  const suggestedNames = [
    ...new Set(
      memberNames
        .map((name) => String(name ?? "").trim())
        .filter(Boolean)
    ),
  ];

  return (
    <>
      <datalist id="ca-extended-member-names">
        {suggestedNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {ADDITIONAL_SECTION_CONFIG.map((section) => {
        const sectionKey = `section_${section.number}`;
        const entries = value[sectionKey] ?? [];

        return (
          <section
            key={section.number}
            className="ca-form-section"
          >
            <div className="ca-members-heading">
              <div className="ca-form-section-heading">
                <div className="ca-form-icon">
                  <ClipboardList size={21} />
                </div>

                <div>
                  <span className="ca-sheet-step">
                    SECTION {section.number}
                  </span>

                  <h2>
                    {section.number}. {section.titleSi}
                  </h2>

                  <p>
                    {section.titleEn} —{" "}
                    {entries.length} record(s)
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ca-add-member"
                disabled={
                  saving ||
                  entries.length >= MAX_ENTRIES
                }
                onClick={() => addEntry(section)}
              >
                <Plus size={16} />
                {section.buttonLabel}
              </button>
            </div>

            {entries.length === 0 && (
              <div className="ca-existing-location">
                <strong>
                  No records added
                </strong>

                <p>
                  Use "{section.buttonLabel}" to
                  add information. Leave empty if
                  this section does not apply.
                </p>
              </div>
            )}

            {entries.length > 0 && (
              <div
                className="ca-members-list"
                style={{ marginTop: 16 }}
              >
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="ca-member-form"
                  >
                    <div className="ca-member-form-header">
                      <strong>
                        {section.entryLabel} {index + 1}
                      </strong>

                      <button
                        type="button"
                        className="ca-remove-member"
                        disabled={saving}
                        aria-label={
                          `Remove ${section.entryLabel} ${index + 1}`
                        }
                        onClick={() =>
                          removeEntry(
                            section.number,
                            entry.id
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="ca-form-grid">
                      {section.fields.map((field) => (
                        <ExtraField
                          key={field.key}
                          id={
                            `extra-${section.number}-` +
                            `${entry.id}-${field.key}`
                          }
                          field={field}
                          disabled={saving}
                          value={entry[field.key] ?? ""}
                          onChange={(nextValue) =>
                            updateEntry(
                              section.number,
                              entry.id,
                              field.key,
                              nextValue
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
