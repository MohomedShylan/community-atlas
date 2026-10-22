
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  FileText,
  House,
  LockKeyhole,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { getIndividualSurvey } from
  "../../services/individualSurveyService";

import "../../styles/individual-survey.css";

// ==========================================
// FIELD AND OPTION LABELS
// ==========================================

const VALUES = {
  male: "පුරුෂ — Male",
  female: "ස්ත්‍රී — Female",
  other: "වෙනත් — Other",
  prefer_not_to_say: "Prefer not to say",

  married: "විවාහක — Married",
  single: "අවිවාහක — Single",

  permanent: "ස්ථිර — Permanent",
  temporary: "තාවකාලික — Temporary",
  rental: "බදු පදනම මත — Rental",
  semi_permanent: "අර්ධ ස්ථිර — Semi-permanent",

  mud: "මැටි — Mud",
  straw: "පිදුරු — Straw",
  coconut_leaves: "පොල් අතු — Coconut Leaves",

  tiles: "උළු — Tiles",
  asbestos: "ඇස්බැස්ටෝස් — Asbestos",

  one: "එක් මහලක් — One",
  two: "මහල් දෙකක් — Two",
  three: "මහල් තුනක් — Three",

  yes: "ඇත — Yes",
  no: "නැත — No",

  protected_well: "ආරක්ෂිත ළිඳ — Protected Well",
  piped_water: "නල ජලය — Piped Water",
  tube_well: "නල ළිඳ — Tube Well",

  water_sealed: "ජල මුද්‍රිත — Water-sealed",
  pit: "වල වැසිකිළි — Pit Toilet",
  commode: "කොමඩ් — Commode",
  none: "නැත — None",

  highland: "ගොඩ — Highland",
  paddy: "මඩ — Paddy",
  government: "රජය සතු — Government",
  private: "පෞද්ගලික — Private",

  freehold: "සින්නක්කර — Freehold",
  lease: "බදු — Lease",
  joint: "හවුල් — Joint",
  litigation: "නඩු සහිත — Under Litigation",

  samurdhi: "සමෘද්ධි — Samurdhi",
  elderly: "වැඩිහිටි දීමනාව — Elderly Allowance",
  disability_public:
    "ආබාධිත / මහජනාධාර — Disability / Public Assistance",
  cancer_tuberculosis:
    "පිළිකා / ක්ෂය රෝග — Cancer / Tuberculosis",
  special_government:
    "වෙනත් රජයේ විශේෂ දීමනා — Special Government Allowance",
  scholarship_mahapola:
    "ශිෂ්‍යත්ව / මහපොළ — Scholarship / Mahapola",

  civil: "සිවිල් — Civil",
  widow_orphan: "වැන්දඹු අනත් දරු — Widow / Orphan",
  military_dependent:
    "හමුදා යැපීම — Military Dependent",

  army: "යුධ — Army",
  air_force: "ගුවන් — Air Force",
  navy: "නාවික — Navy",
  police: "පොලිස් — Police",
  vip_security: "ප්‍රභූ ආරක්ෂක — VIP Security",

  disabled: "ආබාධිත — Disabled",
  deceased: "මිය ගිය — Deceased",

  employment: "රැකියාවට — Employment",
  education: "අධ්‍යාපනයට — Education",

  mental: "මානසික — Mental",
  physical: "කායික — Physical",
  physical_impairment: "අංගවිකල — Physical Impairment",

  from_birth: "උපතින් — From Birth",
  accident: "හදිසි අනතුර — Accident",

  employed: "නිරත වේ — Employed",
  not_employed: "නිරත නොවේ — Not Employed",

  meat: "මස් — Meat",
  eggs: "බිත්තර — Eggs",
  milk: "කිරි — Milk",
};

function show(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not recorded";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return VALUES[value] ?? value;
  }

  return String(value);
}

// A field is [database key, bilingual label].

const SECTION_7 = [
  ["residency_type", "7.1 පදිංචියේ ස්වභාවය — Residence"],
  [
    "temporary_arrival_year",
    "පැමිණි වර්ෂය — Approximate Arrival Year",
  ],
  ["house_type", "7.2 නිවසේ ස්වභාවය — House Type"],
  [
    "temporary_house_material",
    "තාවකාලික නිවසේ ද්‍රව්‍ය — House Material",
  ],
  ["roof_type", "7.3 නිවසේ වහලය — Roof"],
  ["floor_count", "7.4 මහල් ගණන — Floors"],
  [
    "electricity_available",
    "7.5 විදුලි පහසුකම් — Electricity",
  ],
  ["water_available", "7.6 ජල පහසුකම් — Water"],
  ["water_source", "ජල මූලාශ්‍රය — Water Source"],
  [
    "water_source_without_facility",
    "ජලය ලබාගන්නා ආකාරය — Other Water Source",
  ],
  ["toilet_facility", "7.7 වැසිකිළි පහසුකම් — Toilet"],
];

const SECTION_8 = [
  ["owner_name", "ඉඩම් හිමියා — Landowner"],
  ["land_name", "ඉඩමේ නම — Land Name"],
  ["land_size", "ඉඩමේ ප්‍රමාණය — Land Size"],
  ["land_type", "ගොඩ / මඩ — Land Type"],
  ["ownership_category", "රජයේ / පෞද්ගලික — Ownership"],
  ["deed_permit_number", "ඔප්පු / බලපත්‍ර අංකය — Deed / Permit"],
  ["tenure_type", "ඉඩම් අයිතිය — Tenure"],
  ["main_crops", "ප්‍රධාන භෝග — Main Crops"],
];

const SECTION_9 = [
  ["recipient_name", "ආධාර ලබන අයගේ නම — Recipient"],
  ["assistance_type", "ආධාර වර්ගය — Assistance Type"],
  ["amount_text", "මුදල — Amount"],
  [
    "card_or_account_number",
    "කාඩ්පත් / ගිණුම් අංකය — Card / Account Number",
  ],
  ["start_date_text", "ආරම්භක දිනය — Start Date"],
  ["institution", "බැංකුව / තැපැල් කාර්යාලය — Institution"],
  [
    "representative_name",
    "නියෝජිතයාගේ නම — Representative",
  ],
  ["other_information", "වෙනත් — Other"],
];

// ==========================================
// SECTIONS 10 TO 18
// ==========================================

const EXTRA = [
  {
    number: 10,
    title: "රජයේ විශ්‍රාම වැටුප් — Government Pensioners",
    nameKey: "retiree_name",
    fields: [
      ["retiree_name", "විශ්‍රාමිකයාගේ නම — Name"],
      ["served_institution", "සේවය කල ආයතනය — Institution"],
      ["held_position", "දැරූ තනතුර — Position"],
      ["pension_number", "විශ්‍රාම වැටුප් අංකය — Pension Number"],
      ["retirement_year", "විශ්‍රාම ගිය වසර — Retirement Year"],
      ["service_duration", "සේවා කාලය — Service Duration"],
      ["pension_type", "විශ්‍රාම වැටුප් වර්ගය — Pension Type"],
      ["other", "වෙනත් — Other"],
    ],
  },
  {
    number: 11,
    title: "ආරක්ෂක අංශ — Security Personnel",
    nameKey: "person_name",
    fields: [
      ["person_name", "නම — Name"],
      ["security_branch", "ආරක්ෂක අංශය — Security Branch"],
      ["service_address", "සේවා ස්ථානයේ ලිපිනය — Address"],
      ["position", "තනතුර — Position"],
      ["service_duration", "සේවා කාලය — Duration"],
      ["current_status", "දැනට තත්වය — Current Status"],
      ["other", "වෙනත් — Other"],
    ],
  },
  {
    number: 12,
    title: "විදේශ ගත අය — Overseas Members",
    nameKey: "person_name",
    fields: [
      ["person_name", "නම — Name"],
      ["country", "විදේශ රට — Country"],
      ["passport_number", "ගමන් බලපත් අංකය — Passport Number"],
      ["travel_reason", "විදේශ ගත වූ හේතුව — Reason"],
      ["departure_date", "විදේශ ගත වූ දිනය — Departure Date"],
      ["return_date", "ආපසු පැමිණි දිනය — Return Date"],
      ["other", "වෙනත් — Other"],
    ],
  },
  {
    number: 13,
    title: "ආබාධිත අය — Disability Information",
    nameKey: "person_name",
    fields: [
      ["person_name", "නම — Name"],
      ["disability_type", "ආබාධයේ ස්වභාවය — Disability"],
      ["disability_cause", "ආබාධයට හේතුව — Cause"],
      ["employment_status", "රැකියා තත්වය — Employment"],
      ["special_abilities", "විශේෂ හැකියාවන් — Abilities"],
      ["assistance_amount", "ලැබෙන ආධාර — Assistance Amount"],
    ],
  },
  {
    number: 14,
    title: "ව්‍යාපාර — Family Businesses",
    nameKey: "business_person_name",
    fields: [
      ["business_person_name", "ව්‍යාපාරිකයාගේ නම — Owner"],
      ["business_nature", "ව්‍යාපාරයේ ස්වභාවය — Nature"],
      ["business_name", "ව්‍යාපාරයේ නම — Business Name"],
      ["business_address", "ව්‍යාපාරික ලිපිනය — Address"],
      ["registration_number", "ලියාපදිංචි අංකය — Registration"],
    ],
  },
  {
    number: 15,
    title: "ස්වයං රැකියා — Self-employment",
    nameKey: "person_name",
    fields: [
      ["person_name", "නම — Name"],
      ["self_employment", "ස්වයං රැකියාව — Type"],
    ],
  },
  {
    number: 16,
    title: "වාහන — Household Vehicles",
    nameKey: "owner_name",
    fields: [
      ["vehicle_type", "වාහන වර්ගය — Vehicle Type"],
      ["owner_name", "අයිතිකරුගේ නම — Owner"],
      ["vehicle_number", "වාහන අංකය — Registration Number"],
    ],
  },
  {
    number: 17,
    title: "සත්ව පාලන කටයුතු — Livestock",
    nameKey: null,
    fields: [
      ["animal_type", "සත්ත්ව වර්ගය — Animal Type"],
      ["quantity", "ප්‍රමාණය — Quantity"],
      ["products", "ලබා ගන්නා දේවල් — Products"],
    ],
  },
  {
    number: 18,
    title: "වෘත්තීය පුහුණුව / රැකියා අපේක්ෂිත අය — Training / Job Seekers",
    nameKey: "person_name",
    fields: [
      ["person_name", "නම — Name"],
      ["training_received", "ලබා ඇති පුහුණුව — Training"],
      ["training_institution", "පුහුණු ආයතනය — Institution"],
      ["other_qualifications", "වෙනත් සුදුසුකම් — Qualifications"],
    ],
  },
];

// ==========================================
// REUSABLE READ-ONLY UI
// ==========================================

function Fields({ data = {}, fields }) {
  return (
    <dl className="ca-sv-grid">
      {fields.map(([key, label]) => (
        <div className="ca-sv-field" key={key}>
          <dt>{label}</dt>
          <dd>{show(data?.[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function SurveySection({
  number,
  title,
  children,
  description,
}) {
  return (
    <section className="ca-sv-section">
      <div className="ca-sv-heading">
        <span className="ca-sv-number">
          {number}
        </span>

        <div>
          <h2>{title}</h2>

          {description && (
            <p>{description}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function EmptyRecords() {
  return (
    <p className="ca-sv-empty">
      No information recorded for this section.
    </p>
  );
}

function Restricted({ admin = false }) {
  return (
    <div className="ca-sv-restricted">
      <LockKeyhole size={16} />

      <span>
        {admin
          ? "Restricted — Administrator access required."
          : "Restricted — Administrator or Editor access required."}
      </span>
    </div>
  );
}

function ErrorMessage({ message }) {
  return message ? (
    <p className="ca-sv-error" role="alert">
      <AlertCircle size={15} />
      {message}
    </p>
  ) : null;
}

function Records({
  records,
  fields,
  nameKey,
  selectedName,
  householdWide = false,
}) {
  if (!records.length) {
    return <EmptyRecords />;
  }

  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();

  return (
    <div className="ca-sv-records">
      {records.map((record, index) => {
        const isMatchingName =
          nameKey &&
          normalize(record[nameKey]) &&
          normalize(record[nameKey]) ===
            normalize(selectedName);

        return (
          <div
            className="ca-sv-record"
            key={index}
          >
            <div className="ca-sv-record-heading">
              <strong>Record {index + 1}</strong>

              <span>
                {isMatchingName
                  ? "Matches selected person's name"
                  : householdWide
                    ? "Household record"
                    : "Family survey record"}
              </span>
            </div>

            <Fields data={record} fields={fields} />
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// MAIN SURVEY SECTIONS
// ==========================================

export default function IndividualSurveySections({
  person,
  family,
  role,
}) {
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setSurvey(null);

    getIndividualSurvey(person.id, family.id, role)
      .then((data) => {
        if (active) setSurvey(data);
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [person.id, family.id, role, revision]);

  if (loading) {
    return (
      <section className="ca-sv-section" role="status">
        Loading Family Information Sheet...
      </section>
    );
  }

  if (error) {
    return (
      <section className="ca-sv-section">
        <ErrorMessage message={error} />

        <button
          className="ca-sv-retry"
          type="button"
          onClick={() =>
            setRevision((current) => current + 1)
          }
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </section>
    );
  }

  if (!survey) return null;

  const {
    familySheet,
    householdPhone,
    address,
    section6,
    subsidies,
    extended,
    canReadMemberSheet,
    canReadExtended,
    errors,
  } = survey;

  const housing = familySheet?.section_7 ?? null;

  const lands = Array.isArray(familySheet?.section_8)
    ? familySheet.section_8
    : [];

  const section1 = {
    address,
    family_count:
      familySheet?.number_of_families_in_house,
    head_number:
      familySheet?.head_of_household_number,
    telephone: householdPhone,
    whatsapp: familySheet?.whatsapp_number,
  };

  const personalSection = {
    full_name: person.full_name,
    date_of_birth: person.date_of_birth,
    gender: person.gender,
    ...(section6 ?? {}),
  };

  return (
    <div className="ca-sv-container">
      <div className="ca-sv-intro">
        <ClipboardList size={21} />

        <div>
          <h2>පවුල් තොරතුරු පත්‍රිකාව</h2>

          <p>
            Family Information Sheet —
            saved registration details
          </p>
        </div>
      </div>

      {/* ====================================
          SECTION 1 — QUESTIONS 1 TO 5
      ==================================== */}

      <SurveySection
        number="01 - 05"
        title="පවුල් තොරතුරු — Household Information"
        description="Questions 1–5 · Household-level data"
      >
        <Fields
          data={section1}
          fields={[
            ["address", "1. ලිපිනය — Address"],
            [
              "family_count",
              "2. නිවසේ පදිංචි පවුල් සංඛ්‍යාව — Family Count",
            ],
            [
              "head_number",
              "3. ගෘහමූලික අංකය — Head of Household Number",
            ],
            ["telephone", "4. දුරකථන අංකය — Telephone"],
            ["whatsapp", "5. WhatsApp අංකය — WhatsApp"],
          ]}
        />
      </SurveySection>

      {/* ====================================
          SECTION 6 — SELECTED INDIVIDUAL
      ==================================== */}

      <SurveySection
        number="06"
        title="පවුලේ සාමාජික තොරතුරු — Individual Information"
        description="Information belonging to the selected person"
      >
        <Fields
          data={personalSection}
          fields={[
            ["full_name", "6.1 සම්පූර්ණ නම — Full Name"],
            ["date_of_birth", "6.2 උපන් දිනය — Date of Birth"],
            ["gender", "6.12 ස්ත්‍රී / පුරුෂ භාවය — Gender"],
          ]}
        />

        {canReadMemberSheet ? (
          errors.section6 ? (
            <ErrorMessage message={errors.section6} />
          ) : (
            <>
              <Fields
                data={personalSection}
                fields={[
                  ["nic_number", "6.4 ජාතික හැඳුනුම්පත් අංකය — NIC"],
                  ["school", "6.6 පාසල — School"],
                  ["grade", "6.7 ශ්‍රේණිය — Grade"],
                  [
                    "education_level",
                    "6.8 අධ්‍යාපන මට්ටම — Education",
                  ],
                  ["job", "6.9 රැකියාව — Job"],
                  [
                    "workplace_address",
                    "6.10 සේවා ස්ථානය — Workplace Address",
                  ],
                  [
                    "marital_status",
                    "6.11 විවාහක / අවිවාහක — Marital Status",
                  ],
                ]}
              />

              <div className="ca-sv-documents">
                <FileText size={17} />
                6.3 Birth Certificate:{" "}
                <strong>
                  {section6?.birth_certificate_path
                    ? "Uploaded (private)"
                    : "Not recorded"}
                </strong>
              </div>

              <div className="ca-sv-documents">
                <FileText size={17} />
                6.5 NIC Copy:{" "}
                <strong>
                  {section6?.nic_copy_path
                    ? "Uploaded (private)"
                    : "Not recorded"}
                </strong>
              </div>
            </>
          )
        ) : (
          <Restricted />
        )}
      </SurveySection>

      {/* ====================================
          SECTION 7 — HOUSE
      ==================================== */}

      <SurveySection
        number="07"
        title="නිවාස හා පදිංචි තොරතුරු — Housing"
        description="Household-level information"
      >
        {housing ? (
          <Fields data={housing} fields={SECTION_7} />
        ) : (
          <EmptyRecords />
        )}
      </SurveySection>

      {/* ====================================
          SECTION 8 — LANDS
      ==================================== */}

      <SurveySection
        number="08"
        title="ඉඩම් තොරතුරු — Land Information"
        description="All registered household land records"
      >
        <Records
          records={lands}
          fields={SECTION_8}
          nameKey="owner_name"
          selectedName={person.full_name}
          householdWide
        />
      </SurveySection>

      {/* ====================================
          SECTION 9 — SUBSIDIES
      ==================================== */}

      <SurveySection
        number="09"
        title="ආධාර තොරතුරු — Subsidies"
        description="Household subsidy records — restricted data"
      >
        {canReadMemberSheet ? (
          errors.section9 ? (
            <ErrorMessage message={errors.section9} />
          ) : (
            <Records
              records={subsidies}
              fields={SECTION_9}
              nameKey="recipient_name"
              selectedName={person.full_name}
            />
          )
        ) : (
          <Restricted />
        )}
      </SurveySection>

      {/* ====================================
          SECTIONS 10 TO 18
      ==================================== */}

      {EXTRA.map((section) => {
        const rows = extended
          .filter(
            (item) =>
              item.section_number === section.number
          )
          .map((item) => item.details);

        return (
          <SurveySection
            key={section.number}
            number={String(section.number)}
            title={section.title}
            description={
              section.number === 16 ||
              section.number === 17
                ? "Household-level information"
                : "Family survey entries; verify the recorded person's name"
            }
          >
            {canReadExtended ? (
              errors.extended ? (
                <ErrorMessage message={errors.extended} />
              ) : (
                <Records
                  records={rows}
                  fields={section.fields}
                  nameKey={section.nameKey}
                  selectedName={person.full_name}
                  householdWide={
                    section.number === 16 ||
                    section.number === 17
                  }
                />
              )
            ) : (
              <Restricted admin />
            )}
          </SurveySection>
        );
      })}

      <p className="ca-sv-footer">
        Some sections describe the entire household,
        not only this individual. Records marked
        as matching a person's name are matched
        by text, not by a verified individual ID.
        All data is read-only on this page.
      </p>
    </div>
  );
}
