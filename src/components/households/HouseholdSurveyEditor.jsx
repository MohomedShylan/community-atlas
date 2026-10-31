
import { useEffect, useState } from "react";

import {
  Plus,
  Trash2,
  Save,
  FileUp,
  AlertCircle,
} from "lucide-react";

import {
  loadHouseholdSurveyForEdit,
} from "../../services/householdSurveyEditService";

import "../../styles/household-survey-edit.css";

// ==========================================
// FIELD HELPERS
// ==========================================

const options = (pairs) =>
  pairs.map(([value, label]) => ({
    value,
    label,
  }));

const field = (
  key,
  si,
  en,
  extra = {}
) => ({
  key,
  si,
  en,
  ...extra,
});

const dropdown = (
  key,
  si,
  en,
  opts,
  extra = {}
) =>
  field(key, si, en, {
    options: opts,
    ...extra,
  });

const YES_NO = options([
  ["yes", "ඇත — Yes"],
  ["no", "නැත — No"],
]);

// ==========================================
// SECTION 6 — FAMILY MEMBERS
// ==========================================

const MEMBERS = [
  field(
    "full_name",
    "6.1 සම්පූර්ණ නම",
    "Full Name",
    { required: true }
  ),

  field(
    "date_of_birth",
    "6.2 උපන් දිනය",
    "Date of Birth",
    { type: "date" }
  ),

  field(
    "nic_number",
    "6.4 ජාතික හැඳුනුම්පත් අංකය",
    "NIC Number"
  ),

  field(
    "school",
    "6.6 පාසල",
    "School"
  ),

  field(
    "grade",
    "6.7 ශ්‍රේණිය",
    "Grade"
  ),

  field(
    "education_level",
    "6.8 අධ්‍යාපන මට්ටම",
    "Education Level"
  ),

  field(
    "job",
    "6.9 රැකියාව",
    "Job"
  ),

  field(
    "workplace_address",
    "6.10 රැකියා ස්ථානයේ ලිපිනය",
    "Workplace Address"
  ),

  dropdown(
    "marital_status",
    "6.11 විවාහක/අවිවාහක",
    "Marital Status",
    options([
      ["married", "විවාහක — Married"],
      ["single", "අවිවාහක — Single"],
    ])
  ),

  dropdown(
    "gender",
    "6.12 ස්ත්‍රී / පුරුෂ භාවය",
    "Gender",
    options([
      ["female", "ස්ත්‍රී — Female"],
      ["male", "පුරුෂ — Male"],
      ["other", "වෙනත් — Other"],
    ])
  ),
];

// ==========================================
// SECTION 7 — HOUSING
// ==========================================

const HOUSING = [
  dropdown(
    "residency_type",
    "7.1 පදිංචියේ ස්වභාවය",
    "Residence",
    options([
      ["permanent", "ස්ථිර — Permanent"],
      ["temporary", "තාවකාලික — Temporary"],
      ["rental", "බදු — Rental"],
    ])
  ),

  field(
    "temporary_arrival_year",
    "පැමිණි ආසන්න වර්ෂය",
    "Approximate Arrival Year",
    {
      when: (x) =>
        ["temporary", "rental"].includes(
          x.residency_type
        ),
    }
  ),

  dropdown(
    "house_type",
    "7.2 නිවසේ ස්වභාවය",
    "House Type",
    options([
      ["permanent", "ස්ථිර — Permanent"],
      [
        "semi_permanent",
        "අර්ධ ස්ථිර — Semi-permanent",
      ],
      ["temporary", "තාවකාලික — Temporary"],
    ])
  ),

  dropdown(
    "temporary_house_material",
    "තාවකාලික නිවසේ ද්‍රව්‍ය",
    "House Material",
    options([
      ["mud", "මැටි — Mud"],
      ["straw", "පිදුරු — Straw"],
      [
        "coconut_leaves",
        "පොල් අතු — Coconut Leaves",
      ],
      ["other", "වෙනත් — Other"],
    ]),
    {
      when: (x) =>
        x.house_type === "temporary",
    }
  ),

  dropdown(
    "roof_type",
    "7.3 වහලය",
    "Roof Type",
    options([
      ["tiles", "උළු — Tiles"],
      ["asbestos", "ඇස්බැස්ටෝස් — Asbestos"],
      ["other", "වෙනත් — Other"],
    ])
  ),

  dropdown(
    "floor_count",
    "7.4 මහල් ගණන",
    "Floors",
    options([
      ["one", "එක් මහලක් — One"],
      ["two", "මහල් දෙකක් — Two"],
      ["three", "මහල් තුනක් — Three"],
    ])
  ),

  dropdown(
    "electricity_available",
    "7.5 විදුලි පහසුකම්",
    "Electricity",
    YES_NO
  ),

  dropdown(
    "water_available",
    "7.6 ජල පහසුකම්",
    "Water",
    YES_NO
  ),

  dropdown(
    "water_source",
    "ජලය ලබාගන්නා ආකාරය",
    "Water Source",
    options([
      [
        "protected_well",
        "ආරක්ෂිත ළිඳ — Protected Well",
      ],
      [
        "piped_water",
        "නල ජලය — Piped Water",
      ],
      ["tube_well", "නල ළිඳ — Tube Well"],
      ["other", "වෙනත් — Other"],
    ]),
    {
      when: (x) =>
        x.water_available === "yes",
    }
  ),

  field(
    "water_source_without_facility",
    "ජලය ලබාගන්නා ආකාරය",
    "Other Water Source",
    {
      when: (x) =>
        x.water_available === "no",
    }
  ),

  dropdown(
    "toilet_facility",
    "7.7 වැසිකිළි පහසුකම්",
    "Toilet Facilities",
    options([
      [
        "water_sealed",
        "ජල මුද්‍රිත — Water-sealed",
      ],
      ["pit", "වල වැසිකිළිය — Pit"],
      ["commode", "කොමඩ් — Commode"],
      ["none", "නැත — None"],
    ])
  ),
];

// ==========================================
// SECTION 8 — LANDS
// ==========================================

const LAND = [
  field(
    "owner_name",
    "ඉඩම් හිමියන්ගේ නම",
    "Landowner Name"
  ),

  field(
    "land_name",
    "ඉඩමේ නම",
    "Land Name"
  ),

  field(
    "land_size",
    "ඉඩමේ ප්‍රමාණය",
    "Land Size"
  ),

  dropdown(
    "land_type",
    "ගොඩ / මඩ",
    "Land Type",
    options([
      ["highland", "ගොඩ — Highland"],
      ["paddy", "මඩ — Paddy"],
    ])
  ),

  dropdown(
    "ownership_category",
    "රජයේ / පෞද්ගලික",
    "Ownership",
    options([
      [
        "government",
        "රජයේ — Government",
      ],
      ["private", "පෞද්ගලික — Private"],
    ])
  ),

  field(
    "deed_permit_number",
    "ඔප්පු / බලපත්‍ර අංකය",
    "Deed / Permit Number",
    {
      when: (x) =>
        x.ownership_category === "government",
    }
  ),

  dropdown(
    "tenure_type",
    "ඉඩම් අයිතිය",
    "Tenure Type",
    options([
      ["freehold", "සින්නක්කර — Freehold"],
      ["lease", "බදු — Lease"],
      ["joint", "හවුල් — Joint"],
      ["litigation", "නඩු සහිත — Litigation"],
    ])
  ),

  field(
    "main_crops",
    "ප්‍රධාන භෝග",
    "Main Crops"
  ),
];

// ==========================================
// SECTION 9 — SUBSIDIES
// ==========================================

const SUBSIDY = [
  field(
    "recipient_name",
    "ආධාර ලබන අයගේ නම",
    "Recipient Name",
    { required: true }
  ),

  dropdown(
    "assistance_type",
    "ආධාර වර්ගය",
    "Subsidy Type",
    options([
      ["samurdhi", "සමෘද්ධි — Samurdhi"],
      ["elderly", "වැඩිහිටි — Elderly"],
      [
        "disability_public",
        "ආබාධිත / මහජනාධාර — Disability / Public",
      ],
      [
        "cancer_tuberculosis",
        "පිළිකා / ක්ෂය රෝග — Cancer / Tuberculosis",
      ],
      [
        "special_government",
        "විශේෂ දීමනා — Special Allowance",
      ],
      [
        "scholarship_mahapola",
        "ශිෂ්‍යත්ව / මහපොළ — Scholarship / Mahapola",
      ],
    ]),
    { required: true }
  ),

  field(
    "amount_text",
    "ආධාර මුදල",
    "Amount"
  ),

  field(
    "card_or_account_number",
    "කාඩ්පත් / ගිණුම් අංකය",
    "Card / Account Number"
  ),

  field(
    "start_date_text",
    "ආරම්භක දිනය",
    "Start Date"
  ),

  field(
    "institution",
    "බැංකුව / තැපැල් කාර්යාලය",
    "Institution"
  ),

  field(
    "representative_name",
    "නියෝජිතයා",
    "Representative"
  ),

  field(
    "other_information",
    "වෙනත්",
    "Other"
  ),
];

// ==========================================
// SECTIONS 10–18
// ==========================================

const EXTRA = [
  {
    number: 10,
    si: "රජයේ විශ්‍රාම වැටුප් ලබන අය",
    en: "Government Pensioners",
    fields: [
      field(
        "retiree_name",
        "විශ්‍රාමිකයාගේ නම",
        "Pensioner Name",
        { required: true }
      ),
      field(
        "served_institution",
        "සේවය කල ආයතනය",
        "Institution"
      ),
      field(
        "held_position",
        "දැරූ තනතුර",
        "Position"
      ),
      field(
        "pension_number",
        "විශ්‍රාම වැටුප් අංකය",
        "Pension Number"
      ),
      field(
        "retirement_year",
        "විශ්‍රාම ගිය වසර",
        "Retirement Year"
      ),
      field(
        "service_duration",
        "සේවා කාලය",
        "Service Duration"
      ),
      dropdown(
        "pension_type",
        "විශ්‍රාම වැටුප් වර්ගය",
        "Pension Type",
        options([
          ["civil", "සිවිල් — Civil"],
          [
            "widow_orphan",
            "වැන්දඹු අනත් දරු — Widow / Orphan",
          ],
          [
            "military_dependent",
            "හමුදා යැපීම — Military Dependent",
          ],
          ["other", "වෙනත් — Other"],
        ])
      ),
      field("other", "වෙනත්", "Other"),
    ],
  },

  {
    number: 11,
    si: "ආරක්ෂක අංශයේ නියුතු අය",
    en: "Security Personnel",
    fields: [
      field(
        "person_name",
        "නම",
        "Name",
        { required: true }
      ),
      dropdown(
        "security_branch",
        "ආරක්ෂක අංශය",
        "Branch",
        options([
          ["army", "යුධ — Army"],
          ["air_force", "ගුවන් — Air Force"],
          ["navy", "නාවික — Navy"],
          ["police", "පොලිස් — Police"],
          [
            "vip_security",
            "ප්‍රභූ ආරක්ෂක — VIP Security",
          ],
        ])
      ),
      field(
        "service_address",
        "සේවා ස්ථානයේ ලිපිනය",
        "Service Address"
      ),
      field(
        "position",
        "තනතුර",
        "Position"
      ),
      field(
        "service_duration",
        "සේවා කාලය",
        "Service Duration"
      ),
      dropdown(
        "current_status",
        "දැනට තත්වය",
        "Current Status",
        options([
          ["disabled", "ආබාධිත — Disabled"],
          ["deceased", "මිය ගිය — Deceased"],
        ])
      ),
      field("other", "වෙනත්", "Other"),
    ],
  },

  {
    number: 12,
    si: "විදේශ ගත අය",
    en: "Overseas Members",
    fields: [
      field(
        "person_name",
        "නම",
        "Name",
        { required: true }
      ),
      field("country", "රට", "Country"),
      field(
        "passport_number",
        "ගමන් බලපත් අංකය",
        "Passport Number"
      ),
      dropdown(
        "travel_reason",
        "විදේශ ගත වූ හේතුව",
        "Reason",
        options([
          [
            "employment",
            "රැකියාවට — Employment",
          ],
          [
            "education",
            "අධ්‍යාපනයට — Education",
          ],
        ])
      ),
      field(
        "departure_date",
        "විදේශ ගත වූ දිනය",
        "Departure Date"
      ),
      field(
        "return_date",
        "ආපසු පැමිණි දිනය",
        "Return Date"
      ),
      field("other", "වෙනත්", "Other"),
    ],
  },

  {
    number: 13,
    si: "ආබාධිත අය",
    en: "Disability Information",
    fields: [
      field(
        "person_name",
        "නම",
        "Name",
        { required: true }
      ),
      dropdown(
        "disability_type",
        "ආබාධයේ ස්වභාවය",
        "Disability Type",
        options([
          ["mental", "මානසික — Mental"],
          ["physical", "කායික — Physical"],
          [
            "physical_impairment",
            "අංගවිකල — Physical Impairment",
          ],
        ])
      ),
      dropdown(
        "disability_cause",
        "ආබාධයට හේතුව",
        "Cause",
        options([
          ["from_birth", "උපතින් — Birth"],
          ["accident", "අනතුරකින් — Accident"],
          ["other", "වෙනත් — Other"],
        ])
      ),
      dropdown(
        "employment_status",
        "රැකියා තත්වය",
        "Employment",
        options([
          ["employed", "නිරත වේ — Employed"],
          [
            "not_employed",
            "නිරත නොවේ — Not Employed",
          ],
        ])
      ),
      field(
        "special_abilities",
        "විශේෂ හැකියාවන්",
        "Special Abilities"
      ),
      field(
        "assistance_amount",
        "ලැබෙන ආධාර මුදල්",
        "Assistance Amount"
      ),
    ],
  },

  {
    number: 14,
    si: "ව්‍යාපාර කරන අය",
    en: "Family Businesses",
    fields: [
      field(
        "business_person_name",
        "ව්‍යාපාරිකයාගේ නම",
        "Owner Name",
        { required: true }
      ),
      field(
        "business_nature",
        "ව්‍යාපාරයේ ස්වභාවය",
        "Business Type"
      ),
      field(
        "business_name",
        "ව්‍යාපාරයේ නම",
        "Business Name"
      ),
      field(
        "business_address",
        "ව්‍යාපාරික ලිපිනය",
        "Business Address"
      ),
      field(
        "registration_number",
        "ලියාපදිංචි අංකය",
        "Registration Number"
      ),
    ],
  },

  {
    number: 15,
    si: "ස්වයං රැකියා",
    en: "Self-employment",
    fields: [
      field(
        "person_name",
        "ස්වයං රැකියා කරන අයගේ නම",
        "Name",
        { required: true }
      ),
      field(
        "self_employment",
        "ස්වයං රැකියාව",
        "Self-employment"
      ),
    ],
  },

  {
    number: 16,
    si: "වාහන",
    en: "Household Vehicles",
    fields: [
      field(
        "vehicle_type",
        "වාහන වර්ගය",
        "Vehicle Type",
        { required: true }
      ),
      field(
        "owner_name",
        "අයිතිකරුගේ නම",
        "Owner Name"
      ),
      field(
        "vehicle_number",
        "වාහන අංකය",
        "Vehicle Number"
      ),
    ],
  },

  {
    number: 17,
    si: "සත්ව පාලන කටයුතු",
    en: "Livestock",
    fields: [
      field(
        "animal_type",
        "සත්ත්ව වර්ගය",
        "Animal Type",
        { required: true }
      ),
      field(
        "quantity",
        "ප්‍රමාණය",
        "Quantity"
      ),
      dropdown(
        "products",
        "ලබා ගන්නා දේවල්",
        "Products",
        options([
          ["meat", "මස් — Meat"],
          ["eggs", "බිත්තර — Eggs"],
          ["milk", "කිරි — Milk"],
        ])
      ),
    ],
  },

  {
    number: 18,
    si: "වෘත්තීය පුහුණුව / රැකියා අපේක්ෂිත අය",
    en: "Training / Job Seekers",
    fields: [
      field(
        "person_name",
        "නම",
        "Name",
        { required: true }
      ),
      field(
        "training_received",
        "ලබා ඇති පුහුණුව",
        "Training"
      ),
      field(
        "training_institution",
        "පුහුණුව ලැබූ ආයතනය",
        "Training Institution"
      ),
      field(
        "other_qualifications",
        "වෙනත් සුදුසුකම්",
        "Other Qualifications"
      ),
    ],
  },
];

// ==========================================
// REUSABLE HELPERS
// ==========================================

function newRow(fields) {
  return {
    clientId: crypto.randomUUID(),
    ...Object.fromEntries(
      fields.map((f) => [f.key, ""])
    ),
  };
}

function text(value) {
  return value == null
    ? ""
    : String(value);
}

function Field({
  def,
  value,
  onChange,
  disabled,
}) {
  return (
    <label className="ca-sedit-field">

      <span>
        {def.si}
        {" "}
        <small>({def.en})</small>
        {def.required ? " *" : ""}
      </span>

      {def.options ? (
        <select
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value)
          }
          disabled={disabled}
          required={!!def.required}
        >
          <option value="">
            Select an option
          </option>

          {def.options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
            >
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={def.type ?? "text"}
          value={value ?? ""}
          disabled={disabled}
          required={!!def.required}
          maxLength={
            def.type === "date"
              ? undefined
              : 1000
          }
          onChange={(e) =>
            onChange(e.target.value)
          }
        />
      )}

    </label>
  );
}

// ==========================================
// REPEATABLE SECTION
// ==========================================

function Repeatable({
  title,
  entries,
  fields,
  onAdd,
  onPatch,
  onRemove,
  saving,
  max,
}) {
  return (
    <section className="ca-sedit-section">

      <div className="ca-sedit-section-header">
        <h2>
          {title}
          {" "}
          <small>({entries.length})</small>
        </h2>

        <button
          type="button"
          className="ca-edit-secondary"
          disabled={
            saving ||
            entries.length >= max
          }
          onClick={onAdd}
        >
          <Plus size={16} />
          Add Another
        </button>
      </div>

      {entries.length === 0 && (
        <p className="ca-edit-muted">
          No records. Add an entry if applicable.
        </p>
      )}

      {entries.map((entry, index) => (
        <div
          className="ca-sedit-record"
          key={entry.clientId}
        >

          <div className="ca-sedit-record-heading">
            <strong>
              Entry {index + 1}
            </strong>

            <button
              type="button"
              className="ca-edit-danger"
              disabled={saving}
              onClick={() =>
                onRemove(entry)
              }
            >
              <Trash2 size={15} />
              Remove
            </button>
          </div>

          <div className="ca-sedit-grid">
            {fields
              .filter(
                (f) =>
                  !f.when ||
                  f.when(entry)
              )
              .map((f) => (
                <Field
                  key={f.key}
                  def={f}
                  value={entry[f.key]}
                  disabled={saving}
                  onChange={(value) =>
                    onPatch(
                      entry.clientId,
                      f.key,
                      value
                    )
                  }
                />
              ))}
          </div>

        </div>
      ))}

    </section>
  );
}

// ==========================================
// MAIN FULL HOUSEHOLD SURVEY EDITOR
// ==========================================

export default function HouseholdSurveyEditor({
  familyId,
  saving,
  onSaved,
}) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  // ========================================
  // LOAD ALL PREVIOUSLY SAVED DATA
  // ========================================

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    loadHouseholdSurveyForEdit(familyId)
      .then(({
        family,
        members,
        subsidies,
        extended,
      }) => {
        if (!active) return;

        const sheet =
          family.family_information_sheet ?? {};

        const extras = Object.fromEntries(
          EXTRA.map((s) => [
            `section_${s.number}`,

            extended
              .filter(
                (r) =>
                  r.section_number === s.number
              )
              .map((r) => ({
                ...r.details,
                id: r.id,
                clientId: r.id,
              })),
          ])
        );

        setForm({
          familyName:
            family.family_name ?? "",

          contactPhone:
            family.contact_phone ?? "",

          address:
            family.location?.address_line ?? "",

          // SECTION 1

          section1: {
            number_of_families_in_house:
              text(
                sheet.number_of_families_in_house
              ),

            head_of_household_number:
              text(
                sheet.head_of_household_number
              ),

            whatsapp_number:
              text(sheet.whatsapp_number),
          },

          // SECTION 7

          housing: {
            ...sheet.section_7,

            ...Object.fromEntries(
              HOUSING.map((f) => [
                f.key,
                text(
                  sheet.section_7?.[f.key]
                ),
              ])
            ),
          },

          // SECTION 8

          lands: (
            Array.isArray(sheet.section_8)
              ? sheet.section_8
              : []
          ).map((r) => ({
            ...r,
            clientId: crypto.randomUUID(),
          })),

          // SECTION 6

          members: members.map((m) => ({
            clientId: m.id,
            id: m.id,

            full_name:
              m.full_name ?? "",

            relationship_to_head:
              m.relationship_to_head ?? "",

            is_head:
              !!m.is_head,

            is_archived:
              !!m.is_archived,

            date_of_birth:
              m.date_of_birth ?? "",

            gender:
              m.gender ?? "",

            ...Object.fromEntries(
              MEMBERS.map((f) => [
                f.key,
                text(
                  f.key in m
                    ? m[f.key]
                    : m.details?.[f.key]
                ),
              ])
            ),

            birth_certificate_path:
              m.details?.birth_certificate_path ?? "",

            nic_copy_path:
              m.details?.nic_copy_path ?? "",

            birthFile: null,
            nicFile: null,
          })),

          // SECTION 9

          subsidies: subsidies.map((r) => ({
            ...r,
            clientId: r.id,
          })),

          // SECTIONS 10–18

          extras,

          deletedSubsidyIds: [],
          deletedExtendedIds: [],
        });
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [familyId]);

  // ========================================
  // FIELD UPDATE HELPERS
  // ========================================

  const set = (patch) =>
    setForm((current) => ({
      ...current,
      ...patch,
    }));

  const patchField = (
    section,
    key,
    value
  ) =>
    setForm((f) => ({
      ...f,

      [section]: {
        ...f[section],
        [key]: value,
      },
    }));

  const patchRow = (
    section,
    clientId,
    key,
    value
  ) =>
    setForm((f) => ({
      ...f,

      [section]:
        f[section].map((r) =>
          r.clientId === clientId
            ? {
                ...r,
                [key]: value,
              }
            : r
        ),
    }));

  const addRow = (section, fields) =>
    setForm((f) => ({
      ...f,

      [section]: [
        ...f[section],
        newRow(fields),
      ],
    }));

  // ========================================
  // REMOVE ENTRY
  // ========================================

  const removeRow = (
    section,
    row,
    deletedKey = null
  ) => {
    if (
      row.id &&
      !window.confirm(
        "Remove this saved record? " +
        "This action will delete it when you save."
      )
    ) {
      return;
    }

    setForm((f) => ({
      ...f,

      [section]:
        f[section].filter(
          (r) =>
            r.clientId !== row.clientId
        ),

      ...(deletedKey && row.id
        ? {
            [deletedKey]: [
              ...f[deletedKey],
              row.id,
            ],
          }
        : {}),
    }));
  };

  // ========================================
  // SECTIONS 10–18 HELPERS
  // ========================================

  const patchExtra = (
    key,
    clientId,
    fieldKey,
    value
  ) =>
    setForm((f) => ({
      ...f,

      extras: {
        ...f.extras,

        [key]: f.extras[key].map((r) =>
          r.clientId === clientId
            ? {
                ...r,
                [fieldKey]: value,
              }
            : r
        ),
      },
    }));

  const removeExtra = (key, row) => {
    if (
      row.id &&
      !window.confirm(
        "Remove this saved Section record when you save?"
      )
    ) {
      return;
    }

    setForm((f) => ({
      ...f,

      extras: {
        ...f.extras,

        [key]:
          f.extras[key].filter(
            (r) =>
              r.clientId !== row.clientId
          ),
      },

      deletedExtendedIds:
        row.id
          ? [
              ...f.deletedExtendedIds,
              row.id,
            ]
          : f.deletedExtendedIds,
    }));
  };

  // ========================================
  // MEMBER HELPERS
  // ========================================

  const patchMember = (
    clientId,
    key,
    value
  ) =>
    patchRow(
      "members",
      clientId,
      key,
      value
    );

  const chooseHead = (clientId) =>
    setForm((f) => ({
      ...f,

      members: f.members.map((m) => ({
        ...m,

        is_head:
          m.clientId === clientId &&
          !m.is_archived,
      })),
    }));

  const archiveMember = (member) =>
    setForm((f) => ({
      ...f,

      members: f.members.map((m) =>
        m.clientId === member.clientId
          ? {
              ...m,

              is_archived:
                !m.is_archived,

              is_head:
                m.is_archived
                  ? m.is_head
                  : false,
            }
          : m
      ),
    }));

  // ========================================
  // SAVE VALIDATION
  // ========================================

  async function submit(event) {
    event.preventDefault();

    if (!form || saving) return;

    setError("");

    if (
      !confirm &&
      (
        form.deletedExtendedIds.length ||
        form.deletedSubsidyIds.length
      )
    ) {
      setError(
        "Confirm the removal of saved records before saving."
      );
      return;
    }

    const active =
      form.members.filter(
        (m) =>
          !m.is_archived
      );

    if (
      active.filter(
        (m) =>
          m.is_head
      ).length !== 1
    ) {
      setError(
        "Choose exactly one active family head."
      );
      return;
    }

    for (const m of active) {
      if (
        m.full_name.trim().length < 2 ||
        (!m.id && !m.date_of_birth)
      ) {
        setError(
          "Each member needs a name; " +
          "new members also require date of birth."
        );
        return;
      }
    }

    if (
      form.lands.some(
        (r) =>
          !r.owner_name?.trim() &&
          !r.land_name?.trim()
      )
    ) {
      setError(
        "Each land needs an owner or land name."
      );
      return;
    }

    const year = String(
      form.housing.temporary_arrival_year ?? ""
    );

    if (
      ["temporary", "rental"].includes(
        form.housing.residency_type
      ) &&
      (
        !/^\d{4}$/.test(year) ||
        +year < 1800 ||
        +year > new Date().getFullYear()
      )
    ) {
      setError(
        "Enter a valid arrival year for " +
        "Temporary or Rental residence."
      );
      return;
    }

    try {
      const payload = {
        ...form,

        lands: form.lands.map(
          ({ clientId, ...rest }) => ({
            ...rest,

            deed_permit_number:
              rest.ownership_category === "government"
                ? rest.deed_permit_number
                : "",
          })
        ),

        extras: Object.fromEntries(
          EXTRA.map((s) => [
            `section_${s.number}`,

            form.extras[
              `section_${s.number}`
            ].map(
              ({ clientId, ...rest }) =>
                rest
            ),
          ])
        ),
      };

      await onSaved(payload);

    } catch (err) {
      setError(
        err.message ||
        "Could not save the household survey."
      );
    }
  }

  // ========================================
  // LOADING / ERROR
  // ========================================

  if (loading) {
    return (
      <p className="ca-edit-form">
        Loading all household sections...
      </p>
    );
  }

  if (!form) {
    return (
      <p
        className="ca-edit-error"
        role="alert"
      >
        Unable to load the editor: {error}
      </p>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <form
      className="ca-edit-form ca-sedit"
      onSubmit={submit}
    >

      <h2>
        Edit Household — Sections 1, 6–18
      </h2>

      <p className="ca-edit-muted">
        Previously saved values are loaded.
        Address / GPS changes must use the
        separate Edit Location action.
      </p>

      {/* SECTION 1 */}

      <section className="ca-sedit-section">
        <h2>
          01 — පවුල් තොරතුරු (Questions 1–5)
        </h2>

        <div className="ca-sedit-grid">

          <Field
            def={field(
              "address",
              "1. ලිපිනය",
              "Address"
            )}
            value={form.address}
            disabled
            onChange={() => {}}
          />

          <Field
            def={field(
              "number_of_families_in_house",
              "2. නිවසේ පදිංචි පවුල් සංඛ්‍යාව",
              "Family Count",
              { required: true }
            )}
            value={
              form.section1
                .number_of_families_in_house
            }
            onChange={(v) =>
              patchField(
                "section1",
                "number_of_families_in_house",
                v
              )
            }
          />

          <Field
            def={field(
              "head_of_household_number",
              "3. ගෘහමූලික අංකය",
              "Head of Household Number"
            )}
            value={
              form.section1
                .head_of_household_number
            }
            onChange={(v) =>
              patchField(
                "section1",
                "head_of_household_number",
                v
              )
            }
          />

          <Field
            def={field(
              "contactPhone",
              "4. දුරකථන අංකය",
              "Telephone"
            )}
            value={form.contactPhone}
            onChange={(v) =>
              set({
                contactPhone: v,
              })
            }
          />

          <Field
            def={field(
              "whatsapp_number",
              "5. WhatsApp අංකය",
              "WhatsApp"
            )}
            value={
              form.section1
                .whatsapp_number
            }
            onChange={(v) =>
              patchField(
                "section1",
                "whatsapp_number",
                v
              )
            }
          />

          <Field
            def={field(
              "familyName",
              "පවුලේ නම",
              "Family Name"
            )}
            value={form.familyName}
            onChange={(v) =>
              set({
                familyName: v,
              })
            }
          />

        </div>
      </section>

      {/* SECTION 6 */}

      <section className="ca-sedit-section">

        <div className="ca-sedit-section-header">

          <h2>
            06 — පවුලේ සාමාජිකයින්
            {" "}
            ({form.members.length})
          </h2>

          <button
            type="button"
            className="ca-edit-secondary"
            disabled={
              saving ||
              form.members.length >= 25
            }
            onClick={() =>
              set({
                members: [
                  ...form.members,

                  {
                    ...newRow(MEMBERS),

                    full_name: "",
                    date_of_birth: "",
                    gender: "",
                    relationship_to_head: "",

                    is_head: false,
                    is_archived: false,

                    birthFile: null,
                    nicFile: null,

                    birth_certificate_path: "",
                    nic_copy_path: "",
                  },
                ],
              })
            }
          >
            <Plus size={16} />
            Add Another Member
          </button>

        </div>

        {form.members.map((m, index) => (
          <div
            className="ca-sedit-record"
            key={m.clientId}
          >

            <div className="ca-sedit-record-heading">

              <strong>
                Member {index + 1}
                {m.is_archived
                  ? " — Archived"
                  : ""}
              </strong>

              {m.id ? (
                <button
                  type="button"
                  className="ca-edit-secondary"
                  disabled={saving}
                  onClick={() =>
                    archiveMember(m)
                  }
                >
                  {m.is_archived
                    ? "Restore member"
                    : "Archive member"}
                </button>
              ) : (
                <button
                  type="button"
                  className="ca-edit-danger"
                  disabled={saving}
                  onClick={() =>
                    removeRow(
                      "members",
                      m
                    )
                  }
                >
                  Discard member
                </button>
              )}

            </div>

            <div className="ca-sedit-grid">

              {MEMBERS.map((def) => (
                <Field
                  key={def.key}
                  def={def}
                  value={m[def.key]}
                  disabled={
                    saving ||
                    m.is_archived
                  }
                  onChange={(value) =>
                    patchMember(
                      m.clientId,
                      def.key,
                      value
                    )
                  }
                />
              ))}

            </div>

            {!m.is_archived && (
              <label className="ca-sedit-head">
                <input
                  type="radio"
                  name="family-head"
                  checked={!!m.is_head}
                  disabled={saving}
                  onChange={() =>
                    chooseHead(m.clientId)
                  }
                />
                Head of Family
              </label>
            )}

            <div className="ca-sedit-docs">

              {[
                [
                  "birthFile",
                  "birth_certificate_path",
                  "6.3 Birth Certificate",
                ],
                [
                  "nicFile",
                  "nic_copy_path",
                  "6.5 NIC Copy",
                ],
              ].map(([
                fileKey,
                pathKey,
                label,
              ]) => (
                <label
                  key={fileKey}
                  className="ca-sedit-upload"
                >
                  <FileUp size={17} />

                  {label}

                  <small>
                    {m[pathKey]
                      ? "Current private document retained unless replaced"
                      : "Not uploaded"}
                  </small>

                  <input
                    type="file"
                    disabled={
                      saving ||
                      m.is_archived
                    }
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file =
                        e.target.files?.[0] ?? null;

                      if (file) {
                        patchMember(
                          m.clientId,
                          fileKey,
                          file
                        );
                      }
                    }}
                  />

                  {m[fileKey] && (
                    <small>
                      Replacement selected:
                      {" "}
                      {m[fileKey].name}
                    </small>
                  )}

                </label>
              ))}

            </div>
          </div>
        ))}

      </section>

      {/* SECTION 7 */}

      <section className="ca-sedit-section">

        <h2>
          07 — නිවාස හා පදිංචි තොරතුරු (Housing)
        </h2>

        <div className="ca-sedit-grid">

          {HOUSING
            .filter(
              (x) =>
                !x.when ||
                x.when(form.housing)
            )
            .map((def) => (
              <Field
                key={def.key}
                def={def}
                value={
                  form.housing[def.key]
                }
                disabled={saving}
                onChange={(v) =>
                  patchField(
                    "housing",
                    def.key,
                    v
                  )
                }
              />
            ))}

        </div>
      </section>

      {/* SECTION 8 */}

      <Repeatable
        title="08 — ඉඩම් තොරතුරු (Lands)"
        entries={form.lands}
        fields={LAND}
        max={25}
        saving={saving}
        onAdd={() =>
          addRow("lands", LAND)
        }
        onPatch={(id, key, val) =>
          patchRow(
            "lands",
            id,
            key,
            val
          )
        }
        onRemove={(row) =>
          removeRow(
            "lands",
            row
          )
        }
      />

      {/* SECTION 9 */}

      <Repeatable
        title="09 — ආධාර තොරතුරු (Subsidies)"
        entries={form.subsidies}
        fields={SUBSIDY}
        max={50}
        saving={saving}
        onAdd={() =>
          addRow(
            "subsidies",
            SUBSIDY
          )
        }
        onPatch={(id, key, val) =>
          patchRow(
            "subsidies",
            id,
            key,
            val
          )
        }
        onRemove={(row) =>
          removeRow(
            "subsidies",
            row,
            "deletedSubsidyIds"
          )
        }
      />

      {/* SECTIONS 10–18 */}

      {EXTRA.map((section) => {
        const key =
          `section_${section.number}`;

        return (
          <Repeatable
            key={key}
            title={
              `${section.number} — ${section.si} ` +
              `(${section.en})`
            }
            entries={
              form.extras[key]
            }
            fields={
              section.fields
            }
            max={50}
            saving={saving}
            onAdd={() =>
              setForm((f) => ({
                ...f,

                extras: {
                  ...f.extras,

                  [key]: [
                    ...f.extras[key],
                    newRow(
                      section.fields
                    ),
                  ],
                },
              }))
            }
            onPatch={(id, fieldKey, val) =>
              patchExtra(
                key,
                id,
                fieldKey,
                val
              )
            }
            onRemove={(row) =>
              removeExtra(
                key,
                row
              )
            }
          />
        );
      })}

      {/* DELETE CONFIRMATION */}

      {(
        form.deletedSubsidyIds.length +
        form.deletedExtendedIds.length
      ) > 0 && (
        <label className="ca-sedit-head">

          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) =>
              setConfirm(e.target.checked)
            }
          />

          I confirm removal of
          {" "}
          {
            form.deletedSubsidyIds.length +
            form.deletedExtendedIds.length
          }
          {" "}
          saved records.

        </label>
      )}

      {/* ERROR */}

      {error && (
        <p
          className="ca-edit-error"
          role="alert"
        >
          <AlertCircle size={16} />
          {error}
        </p>
      )}

      {/* SAVE */}

      <button
        type="submit"
        className="ca-edit-primary"
        disabled={saving}
      >
        <Save size={17} />

        {saving
          ? "Saving..."
          : "Save All Household Sections"}
      </button>

    </form>
  );
}
