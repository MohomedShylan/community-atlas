
import { useEffect, useState } from "react";
import {
  House, Users, Building2, LandPlot, HandHeart,
  ClipboardList, Plus, Trash2, Save, FileUp, FileText, X,
} from "lucide-react";

const MAX_MEMBERS = 25;
const MAX_LANDS = 25;
const MAX_SUBSIDIES = 50;
const MAX_EXTRA_ENTRIES = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];

const choices = (rows) =>
  rows.map(([value, label]) => ({ value, label }));

const txt = (key, si, en, props = {}) => ({
  key, si, en, type: "text", maxLength: 200, ...props,
});

const sel = (key, si, en, options) => ({
  key, si, en, type: "select", options,
});

// ==========================================
// DROPDOWN OPTIONS — SECTIONS 6–9
// ==========================================

const MARITAL = choices([
  ["married", "විවාහක — Married"],
  ["single", "අවිවාහක — Single"],
]);

const RESIDENCE = choices([
  ["permanent", "ස්ථිර පදිංචිය — Permanent"],
  ["temporary", "තාවකාලික පදිංචිය — Temporary"],
  ["rental", "බදු පදනම මත — Rental"],
]);

const HOUSE_TYPES = choices([
  ["permanent", "ස්ථිර — Permanent"],
  ["semi_permanent", "අර්ධ ස්ථිර — Semi-permanent"],
  ["temporary", "තාවකාලික — Temporary"],
]);

const HOUSE_MATERIALS = choices([
  ["mud", "මැටි — Mud"],
  ["straw", "පිදුරු — Straw"],
  ["coconut_leaves", "පොල් අතු — Coconut Leaves"],
  ["other", "වෙනත් — Other"],
]);

const ROOFS = choices([
  ["tiles", "උළු — Tiles"],
  ["asbestos", "ඇස්බැස්ටෝස් — Asbestos"],
  ["other", "වෙනත් — Other"],
]);

const FLOORS = choices([
  ["one", "එක් මහලක් — One Floor"],
  ["two", "මහල් දෙකක් — Two Floors"],
  ["three", "මහල් තුනක් — Three Floors"],
]);

const YES_NO = choices([
  ["yes", "ඇත — Yes"],
  ["no", "නැත — No"],
]);

const WATER_SOURCES = choices([
  ["protected_well", "ආරක්ෂිත ළිඳක් — Protected Well"],
  ["piped_water", "නල ජලය — Piped Water"],
  ["tube_well", "නල ළිඳක් — Tube Well"],
  ["other", "වෙනත් — Other"],
]);

const TOILETS = choices([
  ["water_sealed", "ජල මුද්‍රිත — Water-sealed"],
  ["pit", "වල වැසිකිළි — Pit Toilet"],
  ["commode", "කොමඩ් — Commode"],
  ["none", "වැසිකිළියක් නැත — No Toilet"],
]);

const LAND_TYPES = choices([
  ["highland", "ගොඩ — Highland"],
  ["paddy", "මඩ — Paddy Land"],
]);

const OWNERSHIP = choices([
  ["government", "රජය සතු — Government"],
  ["private", "පෞද්ගලික — Private"],
]);

const TENURE = choices([
  ["freehold", "සින්නක්කර — Freehold"],
  ["lease", "බදු — Lease"],
  ["joint", "හවුල් — Joint"],
  ["litigation", "නඩු සහිත — Under Litigation"],
]);

const SUBSIDY_TYPES = choices([
  ["samurdhi", "සමෘද්ධි දීමනාව — Samurdhi Allowance"],
  ["elderly", "වැඩිහිටි දීමනාව — Elderly Allowance"],
  [
    "disability_public",
    "ආබාධිත ජීවනාධාර / මහජනාධාර — Disability / Public Assistance",
  ],
  [
    "cancer_tuberculosis",
    "පිළිකාධාර / ක්ෂය රෝගය — Cancer / Tuberculosis Assistance",
  ],
  [
    "special_government",
    "වෙනත් විශේෂ දීමනා (රජයෙන් මාසිකව ලැබෙන) — Other Government Allowances",
  ],
  [
    "scholarship_mahapola",
    "ශිෂ්‍යත්ව / මහපොළ දීමනා — Scholarship / Mahapola",
  ],
]);

// ==========================================
// SECTION 6 — MEMBER FIELDS
// ==========================================

const MEMBER_FIELDS = [
  txt("fullName", "6.1 සම්පූර්ණ නම", "Full Name", {
    required: true, wide: true, maxLength: 150,
  }),
  txt("dateOfBirth", "6.2 උපන් දිනය", "Date of Birth", {
    type: "date", required: true,
  }),
  {
    key: "birthCertificate",
    si: "6.3 උප්පැන්න සහතිකය පිටපත",
    en: "Copy of Birth Certificate",
    type: "file",
  },
  txt("nicNumber", "6.4 ජාතික හැඳුනුම්පත් අංකය", "NIC No.", {
    maxLength: 30,
  }),
  {
    key: "nicCopy",
    si: "6.5 ජාතික හැඳුනුම්පතේ පිටපත",
    en: "Copy of National Identity Card",
    type: "file",
  },
  txt("school", "6.6 ඉගෙනුම ලබන/ලැබූ පාසල", "School Attended/Attending"),
  txt("grade", "6.7 ශ්‍රේණිය", "Grade", { maxLength: 50 }),
  txt("educationLevel", "6.8 අධ්‍යාපන මට්ටම", "Education Level", {
    maxLength: 150,
  }),
  txt("job", "6.9 රැකියාව", "Job", { maxLength: 150 }),
  txt("workplaceAddress", "6.10 රැකියා ස්ථානයේ ලිපිනය", "Workplace Address", {
    type: "textarea", maxLength: 500, wide: true,
  }),
  sel("maritalStatus", "6.11 විවාහක/අවිවාහක", "Married/Single", MARITAL),
];

// ==========================================
// SECTIONS 10–18 — REPEATABLE CONFIGURATIONS
// ==========================================

const EXTRA_SECTIONS = [
  {
    number: 10,
    si: "පවුලේ සිටින රජයේ විශ්‍රාම වැටුප් ලබන අය පිළිබඳ තොරතුරු",
    en: "Government Pensioners",
    button: "Add Another Pensioner",
    fields: [
      txt("retiree_name", "විශ්‍රාමිකයාගේ නම", "Pensioner's Name", {
        required: true, wide: true, member: true,
      }),
      txt("served_institution", "සේවය කල ආයතනය", "Institution Served"),
      txt("held_position", "දැරූ තනතුර", "Position Held"),
      txt("pension_number", "විශ්‍රාම වැටුප් අංකය", "Pension Number", {
        maxLength: 100,
      }),
      txt("retirement_year", "විශ්‍රාම ගිය වසර", "Year of Retirement", {
        maxLength: 30, placeholder: "e.g. 2020",
      }),
      txt("service_duration", "සේවා කාලය", "Length of Service"),
      sel("pension_type", "විශ්‍රාම වැටුප් වර්ගය", "Pension Type", choices([
        ["civil", "සිවිල් — Civil"],
        ["widow_orphan", "වැන්දඹු අනත් දරු — Widow / Orphan"],
        ["military_dependent", "හමුදා යැපීම — Military Dependent"],
        ["other", "වෙනත් — Other"],
      ])),
      txt("other", "වෙනත්", "Other", {
        maxLength: 1000, wide: true,
      }),
    ],
  },
  {
    number: 11,
    si: "ආරක්ෂක අංශයේ නියුතු අය පිළිබඳ තොරතුරු",
    en: "Security Personnel",
    button: "Add Another Security Member",
    fields: [
      txt("person_name", "නම", "Full Name", {
        required: true, member: true, wide: true,
      }),
      sel("security_branch", "ආරක්ෂක අංශය", "Security Branch", choices([
        ["army", "යුධ — Army"],
        ["air_force", "ගුවන් — Air Force"],
        ["navy", "නාවික — Navy"],
        ["police", "පොලිස් — Police"],
        ["vip_security", "ප්‍රභූ ආරක්ෂක — VIP Security"],
      ])),
      txt("service_address", "සේවා ස්ථානයේ ලිපිනය", "Service Address", {
        maxLength: 300, wide: true,
      }),
      txt("position", "තනතුර", "Position"),
      txt("service_duration", "දැනට සේවා කාලය", "Current Service Duration"),
      sel("current_status", "දැනට සිටින තත්වය", "Current Status", choices([
        ["disabled", "ආබාධිත — Disabled"],
        ["deceased", "මිය ගිය — Deceased"],
      ])),
      txt("other", "වෙනත්", "Other", {
        maxLength: 1000, wide: true,
      }),
    ],
  },
  {
    number: 12,
    si: "විදේශ ගත අය පිළිබඳ තොරතුරු",
    en: "Overseas Family Members",
    button: "Add Another Overseas Member",
    fields: [
      txt("person_name", "නම", "Full Name", {
        required: true, member: true, wide: true,
      }),
      txt("country", "විදේශ ගත වී ඇති රට", "Country"),
      txt("passport_number", "ගමන් බලපත් අංකය", "Passport Number", {
        maxLength: 100,
      }),
      sel("travel_reason", "විදේශ ගත වූ හේතුව", "Reason for Travel", choices([
        ["employment", "රැකියාවට — Employment"],
        ["education", "අධ්‍යාපනයට — Education"],
      ])),
      txt("departure_date", "විදේශ ගත වූ දිනය", "Departure Date", {
        placeholder: "e.g. 2023-05-20",
      }),
      txt("return_date", "නැවත ලංකාවට පැමිණ ඇත්නම් ඒ දිනය", "Return Date", {
        placeholder: "e.g. 2025-01-10",
      }),
      txt("other", "වෙනත්", "Other", {
        maxLength: 1000, wide: true,
      }),
    ],
  },
  {
    number: 13,
    si: "ආබාධිත අය පිළිබඳ තොරතුරු",
    en: "Disability Information",
    button: "Add Another Person",
    fields: [
      txt("person_name", "නම", "Full Name", {
        required: true, member: true, wide: true,
      }),
      sel("disability_type", "ආබාධයේ ස්වභාවය", "Nature of Disability", choices([
        ["mental", "මානසික — Mental"],
        ["physical", "කායික — Physical"],
        ["physical_impairment", "අංගවිකල — Physical Impairment"],
      ])),
      sel("disability_cause", "ආබාධිත බවට හේතුව", "Cause of Disability", choices([
        ["from_birth", "උපතින් — From Birth"],
        ["accident", "හදිසි අනතුරකින් — Accident"],
        ["other", "වෙනත් — Other"],
      ])),
      sel("employment_status", "රැකියාවක නිරතවනවාද / නැද්ද යන වග", "Employment Status", choices([
        ["employed", "නිරත වේ — Employed"],
        ["not_employed", "නිරත නොවේ — Not Employed"],
      ])),
      txt("special_abilities", "විශේෂ හැකියාවන්", "Special Abilities", {
        maxLength: 300,
      }),
      txt("assistance_amount", "ලැබෙන ආධාර මුදල්", "Assistance Amount"),
    ],
  },
  {
    number: 14,
    si: "නිවසේ සිටින ව්‍යාපාර කරන අය පිළිබඳ විස්තර",
    en: "Family Businesses",
    button: "Add Another Business",
    fields: [
      txt("business_person_name", "ව්‍යාපාරය කරන අයගේ නම", "Business Owner's Name", {
        required: true, member: true, wide: true,
      }),
      txt("business_nature", "ව්‍යාපාරයේ ස්වභාවය", "Nature of Business"),
      txt("business_name", "ව්‍යාපාරයේ නම", "Business Name"),
      txt("business_address", "ව්‍යාපාරික ස්ථානය ලිපිනය", "Business Address", {
        maxLength: 300, wide: true,
      }),
      txt("registration_number", "ලියාපදිංචි අංකය", "Registration Number", {
        maxLength: 100,
      }),
    ],
  },
  {
    number: 15,
    si: "ස්වයං රැකියාව පිළිබඳ විස්තර",
    en: "Self-employment",
    button: "Add Another Self-employment",
    fields: [
      txt("person_name", "ස්වයං රැකියාව කරන අයගේ නම", "Self-employed Person's Name", {
        required: true, member: true,
      }),
      txt("self_employment", "ස්වයං රැකියාව", "Self-employment", {
        maxLength: 300,
      }),
    ],
  },
  {
    number: 16,
    si: "නිවසේ ඇති වාහන පිළිබඳ තොරතුරු",
    en: "Household Vehicles",
    button: "Add Another Vehicle",
    fields: [
      txt("vehicle_type", "වාහන වර්ගය", "Vehicle Type", {
        required: true, placeholder: "Car, Motorcycle...",
      }),
      txt("owner_name", "අයිතිකරුගේ නම", "Owner's Name", {
        member: true,
      }),
      txt("vehicle_number", "වාහන අංකය", "Vehicle Registration Number", {
        maxLength: 100, wide: true,
      }),
    ],
  },
  {
    number: 17,
    si: "සත්ව පාලන කටයුතු (කුකුළන්/ එළුවන්/හරක්)",
    en: "Livestock Farming",
    button: "Add Another Animal Type",
    fields: [
      txt("animal_type", "සත්ත්ව වර්ගය", "Animal Type", {
        required: true, placeholder: "කුකුළන් / එළුවන් / හරක්",
      }),
      txt("quantity", "ප්‍රමාණය", "Quantity"),
      sel("products", "ලබා ගන්නා දේවල්", "Products Obtained", choices([
        ["meat", "මස් — Meat"],
        ["eggs", "බිත්තර — Eggs"],
        ["milk", "කිරි — Milk"],
      ])),
    ],
  },
  {
    number: 18,
    si: "නිවසේ සිටින වෘත්තීය පුහුණුව ලැබූ අය හෝ රැකියා අපේක්ෂිත අය පිළිබඳ තොරතුරු",
    en: "Vocational Training and Job Seekers",
    button: "Add Another Person",
    fields: [
      txt("person_name", "නම", "Full Name", {
        required: true, member: true,
      }),
      txt("training_received", "ලබා ඇති පුහුණුව", "Training Received", {
        maxLength: 300,
      }),
      txt("training_institution", "පුහුණුව ලැබූ ආයතනය", "Training Institution", {
        maxLength: 300,
      }),
      txt("other_qualifications", "වෙනත් සුදුසුකම්", "Other Qualifications", {
        maxLength: 1000, wide: true,
      }),
    ],
  },
];

// ==========================================
// RECORD FACTORIES AND LAND / SUBSIDY FIELDS
// ==========================================

function makeEntry(fields) {
  return {
    id: crypto.randomUUID(),
    ...Object.fromEntries(fields.map(({ key }) => [key, ""])),
  };
}

function makeMember() {
  return {
    ...makeEntry(MEMBER_FIELDS),
    birthCertificate: null,
    nicCopy: null,
  };
}

const LAND_FIELDS = [
  txt("ownerName", "ඉඩම් හිමියන්ගේ නම", "Landowner's Name", {
    maxLength: 150, wide: true,
  }),
  txt("landName", "ඉඩමේ නම", "Land Name"),
  txt("landSize", "ඉඩමේ ප්‍රමාණය", "Land Size", {
    maxLength: 100, placeholder: "e.g. 20 perches",
  }),
  sel("landType", "ගොඩ / මඩ ඉඩමක්ද යන වග", "Land Type", LAND_TYPES),
  sel("ownershipCategory", "ඉඩම් අයිතිය", "Government or Private Ownership", OWNERSHIP),
  txt("deedPermitNumber", "රජයේ ඉඩමක් නම්, ඔප්පු අංකය/බලපත්‍ර අංකය", "Deed / Permit Number", {
    maxLength: 100,
    wide: true,
    when: (item) => item.ownershipCategory === "government",
  }),
  sel("tenureType", "ඉඩම් අයිතිය", "Tenure Type", TENURE),
  txt("mainCrops", "ප්‍රධාන භෝග වගාව", "Main Crop Cultivation", {
    maxLength: 300,
  }),
];

const SUBSIDY_FIELDS = [
  txt("beneficiaryName", "ආධාරය ලබන පුද්ගලයාගේ නම", "Name of Subsidy Recipient", {
    required: true, member: true, wide: true, maxLength: 150,
  }),
  sel("subsidyType", "ආධාර වර්ගය", "Subsidy Type", SUBSIDY_TYPES),
  txt("amount", "ආධාර මුදල", "Subsidy Amount", {
    maxLength: 50, placeholder: "e.g. Rs. 5,000",
  }),
  txt("cardOrAccountNumber", "කාඩ්පත් අංකය/ගිණුම් අංකය", "Card / Account Number", {
    maxLength: 100, wide: true,
  }),
  txt("startDate", "දීමනාව පටන්ගත් දිනය", "Start Date", {
    maxLength: 100, placeholder: "e.g. 2024-01-15",
  }),
  txt("institution", "දීමනාව ලබා ගන්නා බැංකුව හෝ තැපැල් කාර්යාලය", "Bank / Post Office"),
  txt("representativeName", "දීමනාව ලබා ගැනීම සඳහා නියෝජිතයෙකු නම් කර ඇත්නම්, එම පුද්ගලයාගේ නම", "Representative's Name", {
    maxLength: 150, wide: true,
  }),
  txt("other", "වෙනත්", "Other", {
    type: "textarea", maxLength: 1000, wide: true,
  }),
];

// ==========================================
// REUSABLE FIELD
// ==========================================

function Field({
  id,
  def,
  value = "",
  onChange,
  disabled,
  readOnly,
  max,
  listId,
  onFileChange,
}) {
  return (
    <div
      className={`ca-field ${def.wide ? "ca-field-full" : ""} ${def.sheet ? "ca-sheet-field" : ""}`}
    >
      <label className="ca-bilingual-label" htmlFor={id}>
        <span className="ca-label-si">{def.si}</span>
        {def.en && (
          <span className="ca-label-en">({def.en})</span>
        )}
        {def.required && (
          <span className="ca-required"> *</span>
        )}
      </label>

      {def.type === "select" ? (
        <select
          id={id}
          value={value}
          required={!!def.required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an option</option>
          {def.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : def.type === "file" ? (
        <div className="ca-document-field">
          <label htmlFor={id} className="ca-upload-box">
            {value ? <FileText size={22} /> : <FileUp size={22} />}
            <span>
              {value ? value.name : "Choose image or PDF"}
            </span>
            <small>JPG, PNG, WebP or PDF — maximum 10 MB</small>
          </label>

          <input
            id={id}
            className="ca-file-input"
            type="file"
            disabled={disabled}
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              onFileChange(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />

          {value && (
            <button
              type="button"
              className="ca-file-remove"
              disabled={disabled}
              onClick={() => onFileChange(null)}
            >
              <X size={15} /> Remove selected file
            </button>
          )}
        </div>
      ) : def.type === "textarea" ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          required={!!def.required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={def.maxLength}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={def.type || "text"}
          value={value}
          required={!!def.required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={def.maxLength}
          max={max}
          min={def.min}
          step={def.type === "number" ? "any" : undefined}
          list={listId}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ==========================================
// SECTION HEADING
// ==========================================

function SectionHeading({
  number,
  si,
  en,
  icon: Icon,
  count,
  button,
  onAdd,
  disabled,
}) {
  return (
    <div className="ca-members-heading">
      <div className="ca-form-section-heading">
        <div className="ca-form-icon">
          <Icon size={21} />
        </div>

        <div>
          <span className="ca-sheet-step">
            SECTION {String(number).padStart(2, "0")}
          </span>
          <h2>{si}</h2>
          <p>
            {en}
            {count !== undefined ? ` — ${count} record(s)` : ""}
          </p>
        </div>
      </div>

      {button && (
        <button
          type="button"
          className="ca-add-member"
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus size={16} /> {button}
        </button>
      )}
    </div>
  );
}

// ==========================================
// REPEATABLE SECTION COMPONENT
// ==========================================

function RepeatableSection({
  number,
  si,
  en,
  icon,
  button,
  label,
  fields,
  entries,
  onChange,
  saving,
  maxEntries,
  memberListId,
}) {
  const add = () =>
    onChange((current) =>
      current.length >= maxEntries
        ? current
        : [...current, makeEntry(fields)]
    );

  const update = (id, key, value) =>
    onChange((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
              ...(key === "ownershipCategory" && value !== "government"
                ? { deedPermitNumber: "" }
                : {}),
            }
          : item
      )
    );

  const remove = (id) =>
    onChange((current) =>
      current.filter((item) => item.id !== id)
    );

  return (
    <section className="ca-form-section">
      <SectionHeading
        number={number}
        si={si}
        en={en}
        icon={icon}
        count={entries.length}
        button={button}
        disabled={saving || entries.length >= maxEntries}
        onAdd={add}
      />

      {entries.length === 0 && (
        <div className="ca-existing-location">
          <strong>No records added</strong>
          <p>Click "{button}" if this section applies.</p>
        </div>
      )}

      <div className="ca-members-list">
        {entries.map((item, index) => (
          <div key={item.id} className="ca-member-form">
            <div className="ca-member-form-header">
              <strong>
                {label} {index + 1}
              </strong>

              <button
                type="button"
                className="ca-remove-member"
                disabled={saving}
                onClick={() => remove(item.id)}
                aria-label={`Remove ${label} ${index + 1}`}
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="ca-form-grid">
              {fields
                .filter((field) => !field.when || field.when(item))
                .map((field) => (
                  <Field
                    key={field.key}
                    id={`section-${number}-${item.id}-${field.key}`}
                    def={field}
                    value={item[field.key]}
                    disabled={saving}
                    listId={field.member ? memberListId : undefined}
                    onChange={(value) =>
                      update(item.id, field.key, value)
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// ENTRY VALIDATION
// ==========================================

function validateEntries(entries, fields, sectionName) {
  for (let i = 0; i < entries.length; i++) {
    for (const field of fields) {
      if (field.when && !field.when(entries[i])) continue;

      const value = String(entries[i][field.key] ?? "").trim();

      if (field.required && !value) {
        return `${sectionName}, entry ${i + 1}: ${field.en} is required.`;
      }

      if (field.maxLength && value.length > field.maxLength) {
        return `${sectionName}, entry ${i + 1}: ${field.en} is too long.`;
      }

      if (
        field.type === "select" &&
        value &&
        !field.options.some((opt) => opt.value === value)
      ) {
        return `${sectionName}, entry ${i + 1}: invalid ${field.en}.`;
      }
    }
  }

  return "";
}

// ==========================================
// MAIN HOUSEHOLD FORM
// ==========================================

export default function HouseholdForm({
  selectedPoint,
  existingLocation,
  onSave,
  saving = false,
}) {
  const existing = !!existingLocation?.id;

  // SECTION 1

  const [addressLine, setAddressLine] = useState(
    existingLocation?.address_line ?? ""
  );
  const [familyCount, setFamilyCount] = useState("");
  const [headNumber, setHeadNumber] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // SECTION 6

  const [members, setMembers] = useState([makeMember()]);

  // SECTION 7

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

  // SECTIONS 8, 9 AND 10–18

  const [lands, setLands] = useState([]);
  const [subsidies, setSubsidies] = useState([]);
  const [extras, setExtras] = useState({});

  // LOCATION

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

  // Update map-derived values if the selection changes.

  useEffect(() => {
    setAddressLine(existingLocation?.address_line ?? "");
  }, [existingLocation?.id, existingLocation?.address_line]);

  useEffect(() => {
    if (selectedPoint?.lat != null) {
      setLatitude(Number(selectedPoint.lat).toFixed(6));
    }
    if (selectedPoint?.lng != null) {
      setLongitude(Number(selectedPoint.lng).toFixed(6));
    }
  }, [selectedPoint?.lat, selectedPoint?.lng]);

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const needsArrivalYear =
    ["temporary", "rental"].includes(housing.residencyType);

  const names = [
    ...new Set(
      members.map((m) => m.fullName.trim()).filter(Boolean)
    ),
  ];

  const memberListId = "ca-family-member-names";

  // ========================================
  // MEMBER ACTIONS
  // ========================================

  function updateMember(id, field, value) {
    setMembers((current) =>
      current.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  }

  function changeFile(id, key, file) {
    setError("");

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (
        !FILE_EXTENSIONS.includes(ext) ||
        file.size <= 0 ||
        file.size > MAX_FILE_SIZE
      ) {
        setError(
          "Upload a non-empty JPG, PNG, WebP or PDF file, up to 10 MB."
        );
        return;
      }
    }

    updateMember(id, key, file);
  }

  // ========================================
  // HOUSING ACTIONS
  // ========================================

  function updateHousing(field, value) {
    setHousing((h) => ({
      ...h,
      [field]: value,

      ...(field === "residencyType" &&
      !["temporary", "rental"].includes(value)
        ? { temporaryArrivalYear: "" }
        : {}),

      ...(field === "houseType" && value !== "temporary"
        ? { temporaryHouseMaterial: "" }
        : {}),

      ...(field === "waterAvailable" && value !== "yes"
        ? { waterSource: "" }
        : {}),

      ...(field === "waterAvailable" && value !== "no"
        ? { waterSourceWithoutFacility: "" }
        : {}),
    }));
  }

  // ========================================
  // SECTIONS 10–18 ACTIONS
  // ========================================

  function updateExtra(section, updater) {
    const key = `section_${section}`;

    setExtras((current) => ({
      ...current,
      [key]: updater(current[key] ?? []),
    }));
  }


// ==========================================
// GPS VALIDATION — AUTOMATIC MAP COORDINATES
// ==========================================

if (!existing) {
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
    return (
      "Please select a location from Map Explorer " +
      "before registering a household."
    );
  }
}

  // ========================================
  // PREPARE REGISTRATION
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const reason = validate();

    if (reason) {
      setError(reason);
      return;
    }

    setError("");

    const payload = {
      // SECTION 1

      familyName: members[0].fullName.trim(),

      numberOfFamiliesInHouse: Number(familyCount),
      headOfHouseholdNumber: headNumber.trim(),
      contactPhone: telephone.trim(),
      whatsappNumber: whatsapp.trim(),

      // SECTION 6

      members: members.map((m, index) => ({
        clientId: m.id,
        fullName: m.fullName.trim(),
        dateOfBirth: m.dateOfBirth,
        birthCertificate: m.birthCertificate,
        nicNumber: m.nicNumber.trim(),
        nicCopy: m.nicCopy,
        school: m.school.trim(),
        grade: m.grade.trim(),
        educationLevel: m.educationLevel.trim(),
        job: m.job.trim(),
        workplaceAddress: m.workplaceAddress.trim(),
        maritalStatus: m.maritalStatus,

        isHead: index === 0,
        relationshipToHead: index === 0 ? "Head" : "",
      })),

      // SECTION 7

      housing: {
        ...housing,

        temporaryArrivalYear: needsArrivalYear
          ? housing.temporaryArrivalYear.trim()
          : "",

        temporaryHouseMaterial:
          housing.houseType === "temporary"
            ? housing.temporaryHouseMaterial
            : "",

        waterSource:
          housing.waterAvailable === "yes"
            ? housing.waterSource
            : "",

        waterSourceWithoutFacility:
          housing.waterAvailable === "no"
            ? housing.waterSourceWithoutFacility.trim()
            : "",
      },

      // SECTION 8

      lands: lands.map((land) => ({
        ...land,
        ownerName: land.ownerName.trim(),
        landName: land.landName.trim(),
        landSize: land.landSize.trim(),

        deedPermitNumber:
          land.ownershipCategory === "government"
            ? land.deedPermitNumber.trim()
            : "",

        mainCrops: land.mainCrops.trim(),
      })),

      // SECTION 9

      subsidies: subsidies.map((s) => ({
        ...s,
        beneficiaryName: s.beneficiaryName.trim(),
        amount: s.amount.trim(),
        cardOrAccountNumber: s.cardOrAccountNumber.trim(),
        startDate: s.startDate.trim(),
        institution: s.institution.trim(),
        representativeName: s.representativeName.trim(),
        other: s.other.trim(),
      })),

      // SECTIONS 10–18

      extendedSections: Object.fromEntries(
        EXTRA_SECTIONS.map((section) => [
          `section_${section.number}`,

          (extras[`section_${section.number}`] ?? []).map(
            ({ id, ...fields }) =>
              Object.fromEntries(
                Object.entries(fields).map(([key, value]) => [
                  key,
                  String(value ?? "").trim(),
                ])
              )
          ),
        ])
      ),

      // LOCATION

      existingLocationId: existingLocation?.id ?? null,

      addressLine: existing
        ? existingLocation?.address_line ?? addressLine.trim()
        : addressLine.trim(),

      village: village.trim(),
      district: district.trim(),

      latitude: existing ? null : Number(latitude),
      longitude: existing ? null : Number(longitude),
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err.message || "Could not register the household."
      );
    }
  }

  // ========================================
  // SECTION 1 FIELD CONFIGURATION
  // ========================================

  const section1Fields = [
    txt("address", "1. ලිපිනය", "Address", {
      type: "textarea",
      required: !existing,
      wide: true,
      maxLength: 300,
      sheet: true,
    }),
    txt("familyCount", "2. නිවසේ පදිංචි පවුල් සංඛ්‍යාව", "Number of Families Residing in the House", {
      type: "number", required: true, min: 1, sheet: true,
    }),
    txt("headNumber", "3. ගෘහමූලික අංකය", "Head of Household Number", {
      maxLength: 50, sheet: true,
    }),
    txt("telephone", "4. දුරකථන අංකය", "Telephone Number", {
      type: "tel", maxLength: 30, sheet: true,
    }),
    txt("whatsapp", "5. WhatsApp අංකය", "WhatsApp No.", {
      type: "tel", maxLength: 30, sheet: true,
    }),
  ];

  const section1Values = {
    address: addressLine,
    familyCount,
    headNumber,
    telephone,
    whatsapp,
  };

  const section1Setters = {
    address: setAddressLine,
    familyCount: setFamilyCount,
    headNumber: setHeadNumber,
    telephone: setTelephone,
    whatsapp: setWhatsapp,
  };

  // ========================================
  // SECTION 7 FIELD CONFIGURATION
  // ========================================

  const housingFields = [
    sel("residencyType", "7.1 පදිංචියේ ස්වභාවය", "Nature of Residence", RESIDENCE),

    txt("temporaryArrivalYear", "තාවකාලික / බදු පදනම මත පදිංචිව සිටී නම්, පැමිණි දිනය (ආසන්න වර්ෂය)", "Approximate Arrival Year", {
      required: true,
      maxLength: 4,
      when: () => needsArrivalYear,
      placeholder: "e.g. 2020",
    }),

    sel("houseType", "7.2 පදිංචි නිවසේ ස්වභාවය", "Type of House", HOUSE_TYPES),

    {
      ...sel("temporaryHouseMaterial", "තාවකාලික නිවසේ ද්‍රව්‍ය", "Temporary House Material", HOUSE_MATERIALS),
      required: true,
      when: () => housing.houseType === "temporary",
    },

    sel("roofType", "7.3 නිවසේ වහලය", "Roof Type", ROOFS),
    sel("floorCount", "7.4 නිවසේ ප්‍රමාණය", "Number of Floors", FLOORS),
    sel("electricityAvailable", "7.5 විදුලි පහසුකම්", "Electricity Facilities", YES_NO),
    sel("waterAvailable", "7.6 ජල පහසුකම්", "Water Facilities", YES_NO),

    {
      ...sel("waterSource", "ජලය ලබා ගන්නා ආකාරය", "Water Source", WATER_SOURCES),
      required: true,
      when: () => housing.waterAvailable === "yes",
    },

    txt("waterSourceWithoutFacility", "ජලය ලබා ගන්නා ආකාරය", "How Water Is Obtained", {
      required: true,
      wide: true,
      maxLength: 300,
      when: () => housing.waterAvailable === "no",
    }),

    sel("toiletFacility", "7.7 වැසිකිළි පහසුකම්", "Toilet Facilities", TOILETS),
  ];

  // ========================================
  // RENDER COMPLETE REGISTRATION FORM
  // ========================================

  return (
    <form
      className="ca-registration-form"
      onSubmit={handleSubmit}
    >
      <datalist id={memberListId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* SECTION 1 */}

      <section className="ca-form-section ca-sheet-section">
        <SectionHeading
          number={1}
          si="පවුල් තොරතුරු පත්‍රිකාව"
          en="Family Information Sheet"
          icon={House}
        />

        <div className="ca-sheet-fields">
          {section1Fields.map((def) => (
            <Field
              key={def.key}
              id={`sheet-${def.key}`}
              def={def}
              value={section1Values[def.key]}
              readOnly={existing && def.key === "address"}
              disabled={saving}
              onChange={section1Setters[def.key]}
            />
          ))}
        </div>

        {existing && (
          <p className="ca-form-hint">
            This address belongs to the selected registered
            location and cannot be changed here.
          </p>
        )}
      </section>

      {/* SECTION 6 */}

      <section className="ca-form-section">
        <SectionHeading
          number={6}
          si="පවුලේ සාමාජිකයින් පිළිබඳ තොරතුරු"
          en="Family Member Information"
          icon={Users}
          count={members.length}
          button="Add Member"
          disabled={saving || members.length >= MAX_MEMBERS}
          onAdd={() =>
            setMembers((list) => [...list, makeMember()])
          }
        />

        <p className="ca-form-hint">
          Enter the family head as Member 1.
          Full Name and Date of Birth are required
          for each member.
        </p>

        <div className="ca-members-list">
          {members.map((member, index) => (
            <div className="ca-member-form" key={member.id}>
              <div className="ca-member-form-header">
                <strong>Member {index + 1}</strong>

                {members.length > 1 && (
                  <button
                    className="ca-remove-member"
                    type="button"
                    disabled={saving}
                    aria-label={`Remove member ${index + 1}`}
                    onClick={() =>
                      setMembers((list) =>
                        list.filter((m) => m.id !== member.id)
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="ca-form-grid">
                {MEMBER_FIELDS.map((def) => (
                  <Field
                    key={def.key}
                    id={`member-${member.id}-${def.key}`}
                    def={def}
                    value={member[def.key]}
                    disabled={saving}
                    max={def.type === "date" ? today : undefined}
                    onChange={(value) =>
                      updateMember(member.id, def.key, value)
                    }
                    onFileChange={(file) =>
                      changeFile(member.id, def.key, file)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7 */}

      <section className="ca-form-section">
        <SectionHeading
          number={7}
          si="නිවාස හා පදිංචි තොරතුරු"
          en="Housing and Residence Information"
          icon={Building2}
        />

        <div className="ca-form-grid">
          {housingFields
            .filter((field) => !field.when || field.when())
            .map((def) => (
              <Field
                key={def.key}
                id={`housing-${def.key}`}
                def={def}
                value={housing[def.key]}
                disabled={saving}
                onChange={(value) =>
                  updateHousing(def.key, value)
                }
              />
            ))}
        </div>
      </section>

      {/* SECTION 8 */}

      <RepeatableSection
        number={8}
        si="පදිංචි ඉඩම පිළිබඳ විස්තර"
        en="Land Information"
        icon={LandPlot}
        button="Add Land"
        label="Land"
        fields={LAND_FIELDS}
        entries={lands}
        onChange={setLands}
        saving={saving}
        maxEntries={MAX_LANDS}
        memberListId={memberListId}
      />

      {/* SECTION 9 */}

      <RepeatableSection
        number={9}
        si="පවුලේ සාමාජිකයන්ට ලැබෙන ආධාර පිළිබඳ තොරතුරු"
        en="Family Member Subsidy Information"
        icon={HandHeart}
        button="Add Another Subsidy"
        label="Subsidy"
        fields={SUBSIDY_FIELDS}
        entries={subsidies}
        onChange={setSubsidies}
        saving={saving}
        maxEntries={MAX_SUBSIDIES}
        memberListId={memberListId}
      />

      {/* SECTIONS 10–18 */}

      {EXTRA_SECTIONS.map((section) => (
        <RepeatableSection
          key={section.number}
          number={section.number}
          si={section.si}
          en={section.en}
          icon={ClipboardList}
          button={section.button}
          label="Entry"
          fields={section.fields}
          entries={extras[`section_${section.number}`] ?? []}
          onChange={(fn) =>
            updateExtra(section.number, fn)
          }
          saving={saving}
          maxEntries={MAX_EXTRA_ENTRIES}
          memberListId={memberListId}
        />
      ))}

   
      {/* ERROR AND SUBMIT */}

      {error && (
        <div className="ca-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="ca-form-actions">
        <button
          className="ca-save-household"
          type="submit"
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
