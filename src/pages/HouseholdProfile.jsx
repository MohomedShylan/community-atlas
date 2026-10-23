
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  House,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import MemberDocumentActions from
  "../components/shared/MemberDocumentActions";

import HouseholdEditForm from
  "../components/households/HouseholdEditForm";

// Full household survey editor (Sections 1–18)
import HouseholdSurveyEditor from
  "../components/households/HouseholdSurveyEditor";

// NEW: Interactive map-based location editor
import HouseholdLocationEditor from
  "../components/households/HouseholdLocationEditor";

import {
  saveHouseholdFullSurvey,
} from "../services/householdSurveyEditService";

import {
  getHouseholdProfile,
  getHouseholdMemberDetails,
  saveHouseholdChanges,
  archiveHousehold,
  updateHouseholdLocation,
} from "../services/householdEditService";

// ==========================================
// DISPLAY HELPERS
// ==========================================

function display(value) {
  return value === null ||
    value === undefined ||
    value === ""
    ? "Not recorded"
    : String(value);
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-LK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

function ageFromDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const today = new Date();

  let age = today.getFullYear() - year;

  if (
    today.getMonth() + 1 < month ||
    (
      today.getMonth() + 1 === month &&
      today.getDate() < day
    )
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}

const MARITAL = {
  married: "Married",
  single: "Single",
};

const GENDER = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

function DetailField({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{display(value)}</dd>
    </div>
  );
}

// ==========================================
// EXPANDED FAMILY MEMBER DETAILS
// ==========================================

function MemberDetails({ details, canEdit }) {
  const {
    person,
    survey,
    surveyUnavailable,
  } = details;

  const age = ageFromDate(person.date_of_birth);

  return (
    <div className="ca-member-expanded-content">

      <h3>
        <UserRound size={17} />
        Individual Details
      </h3>

      <dl className="ca-profile-grid">

        <DetailField
          label="Full name"
          value={person.full_name}
        />

        <DetailField
          label="Date of birth"
          value={formatDate(person.date_of_birth)}
        />

        <DetailField
          label="Age"
          value={
            age === null
              ? null
              : `${age} years`
          }
        />

        <DetailField
          label="Gender"
          value={
            GENDER[person.gender] ||
            person.gender
          }
        />

        <DetailField
          label="Phone number"
          value={person.phone}
        />

      </dl>

      {/* SECTION 6 — PRIVATE MEMBER DETAILS */}

      {canEdit && (
        <>
          <h3>
            <FileText size={17} />
            Member Information
          </h3>

          <dl className="ca-profile-grid">

            <DetailField
              label="6.4 ජාතික හැඳුනුම්පත් අංකය (NIC Number)"
              value={survey?.nic_number}
            />

            <DetailField
              label="6.6 පාසල (School)"
              value={survey?.school}
            />

            <DetailField
              label="6.7 ශ්‍රේණිය (Grade)"
              value={survey?.grade}
            />

            <DetailField
              label="6.8 අධ්‍යාපන මට්ටම (Education Level)"
              value={survey?.education_level}
            />

            <DetailField
              label="6.9 රැකියාව (Job)"
              value={survey?.job}
            />

            <DetailField
              label="6.10 රැකියා ස්ථානයේ ලිපිනය (Workplace Address)"
              value={survey?.workplace_address}
            />

            <DetailField
              label="6.11 විවාහක/අවිවාහක (Marital Status)"
              value={
                MARITAL[survey?.marital_status] ||
                survey?.marital_status
              }
            />

          </dl>

          {/* PRIVATE DOCUMENT VIEW / DOWNLOAD */}

          {!surveyUnavailable && (
            <>
              <MemberDocumentActions
                type="birth_certificate"
                filePath={survey?.birth_certificate_path}
                canAccess={canEdit}
              />

              <MemberDocumentActions
                type="nic_copy"
                filePath={survey?.nic_copy_path}
                canAccess={canEdit}
              />
            </>
          )}

          {surveyUnavailable && (
            <p className="ca-edit-muted">
              Additional Section 6 records could
              not be loaded. Check the
              individual_family_sheets migration
              and access policies.
            </p>
          )}

          {person.notes && (
            <div className="ca-member-notes">
              <strong>Additional notes</strong>
              <p>{person.notes}</p>
            </div>
          )}
        </>
      )}

      {!canEdit && (
        <p className="ca-edit-muted">
          NIC, uploaded documents and other private
          survey fields are available only to
          authorized staff.
        </p>
      )}

      <Link
        className="ca-edit-secondary ca-member-full-link"
        to={`/people/${person.id}`}
      >
        View full individual profile
        <ChevronRight size={16} />
      </Link>

    </div>
  );
}

// ==========================================
// MAIN HOUSEHOLD PROFILE
// ==========================================

export default function HouseholdProfile() {
  const { familyId } = useParams();

  const navigate = useNavigate();

  const { profile } = useAuth();

  const isAdmin =
    profile?.role === "admin";

  const canEdit =
    isAdmin ||
    profile?.role === "editor";

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("view");
  const [saving, setSaving] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [revision, setRevision] = useState(0);

  // ========================================
  // SELECTED MEMBER
  // ========================================

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState(null);

  const [
    memberDetails,
    setMemberDetails,
  ] = useState(null);

  const [
    memberLoading,
    setMemberLoading,
  ] = useState(false);

  const [
    memberError,
    setMemberError,
  ] = useState("");

  const refresh = useCallback(() => {
    setSelectedMemberId(null);
    setMemberDetails(null);
    setRevision((n) => n + 1);
  }, []);

  // ========================================
  // LOAD HOUSEHOLD PROFILE
  // ========================================

  useEffect(() => {
    let active = true;

    setLoading(true);
    setRecord(null);
    setError("");
    setSelectedMemberId(null);

    getHouseholdProfile(familyId)
      .then((data) => {
        if (active) {
          setRecord(data);
        }
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
  }, [familyId, revision]);

  // ========================================
  // LOAD SELECTED MEMBER DETAILS
  // ========================================

  useEffect(() => {
    let active = true;

    setMemberDetails(null);
    setMemberError("");

    if (!selectedMemberId) {
      setMemberLoading(false);

      return () => {
        active = false;
      };
    }

    setMemberLoading(true);

    getHouseholdMemberDetails(
      selectedMemberId,
      { includeSensitive: canEdit }
    )
      .then((data) => {
        if (!active) return;

        if (
          !data ||
          data.person.family_id !== familyId
        ) {
          setMemberError(
            "This member is no longer registered in this household."
          );
        } else {
          setMemberDetails(data);
        }
      })
      .catch((err) => {
        if (active) {
          setMemberError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setMemberLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    selectedMemberId,
    familyId,
    canEdit,
    revision,
  ]);

  // ========================================
  // SAVE FULL HOUSEHOLD SURVEY
  // ADMINISTRATOR ONLY
  // ========================================

  async function saveFullSurvey(payload) {
    if (!isAdmin) {
      throw new Error(
        "Administrator permission is required."
      );
    }

    setSaving(true);
    setNotice("");
    setError("");

    try {
      await saveHouseholdFullSurvey(
        familyId,
        payload
      );

      setMode("view");

      setNotice(
        "All household survey sections updated successfully."
      );

      refresh();

    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // ORIGINAL BASIC FAMILY SAVE
  // KEPT FOR EDITOR ACCOUNTS
  // ========================================

  async function saveFamily(payload) {
    setSaving(true);
    setNotice("");

    try {
      await saveHouseholdChanges(
        familyId,
        payload
      );

      setMode("view");

      setNotice(
        "Family and member changes saved."
      );

      refresh();

    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // SAVE HOUSEHOLD LOCATION
  //
  // Uses existing Supabase RPC.
  // The new map-based editor supplies:
  //
  // - Street address
  // - Latitude
  // - Longitude
  // - Existing Village/District values
  // - Shared location confirmation
  // ========================================

  async function saveLocation(values) {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      await updateHouseholdLocation(
        record.family.location.id,
        values
      );

      setMode("view");

      setNotice(
        "Location updated. Linked families now use its new coordinates."
      );

      refresh();

    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // ARCHIVE HOUSEHOLD
  // ========================================

  async function removeFamily() {
    if (
      !record ||
      confirmCode !== record.family.family_code
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await archiveHousehold(
        familyId,
        confirmCode
      );

      navigate(
        "/households",
        { replace: true }
      );

    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  // ========================================
  // LOADING AND ERROR STATES
  // ========================================

  if (loading) {
    return (
      <div className="page-card" role="status">
        Loading household...
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="page-card" role="alert">
        <AlertCircle size={21} />
        {error}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page-card">
        Household not found.
      </div>
    );
  }

  const {
    family,
    members,
    locationFamilyCount,
  } = record;

  const activeMembers = members.filter(
    (member) => !member.is_archived
  );

  const sheet =
    family.family_information_sheet ?? {};

  const location =
    family.location ?? {};

  // ========================================
  // RENDER HOUSEHOLD PROFILE
  // ========================================

  return (
    <div className="ca-household-profile">

      {/* BACK BUTTON */}

      <Link
        className="ca-registration-back"
        to="/households"
      >
        <ArrowLeft size={17} />
        Back to Households
      </Link>

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <header className="ca-profile-heading">

        <div>
          <small>{family.family_code}</small>

          <h1>
            {family.family_name}
          </h1>

          <p>
            {family.is_archived
              ? "Archived household"
              : "Household information and family members"}
          </p>
        </div>

        {!family.is_archived && canEdit && (
          <div className="ca-record-actions">

            {/* EDIT FAMILY */}

            <button
              type="button"
              className="ca-edit-secondary"
              disabled={saving}
              onClick={() =>
                setMode(
                  mode === "family"
                    ? "view"
                    : "family"
                )
              }
            >
              <Pencil size={16} />
              Edit family
            </button>

            {/* EDIT LOCATION */}

            {isAdmin && (
              <button
                type="button"
                className="ca-edit-secondary"
                disabled={saving}
                onClick={() =>
                  setMode(
                    mode === "location"
                      ? "view"
                      : "location"
                  )
                }
              >
                <MapPin size={16} />
                Edit location
              </button>
            )}

            {/* REMOVE HOUSEHOLD */}

            {isAdmin && (
              <button
                type="button"
                className="ca-edit-danger"
                disabled={saving}
                onClick={() =>
                  setMode(
                    mode === "remove"
                      ? "view"
                      : "remove"
                  )
                }
              >
                <Trash2 size={16} />
                Remove household
              </button>
            )}

          </div>
        )}

      </header>

      {/* =====================================
          NOTIFICATIONS
      ===================================== */}

      {notice && (
        <p
          className="ca-edit-success"
          role="status"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          className="ca-edit-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* CANCEL BUTTON */}

      {mode !== "view" && (
        <button
          type="button"
          className="ca-edit-secondary"
          disabled={saving}
          onClick={() => {
            setMode("view");
            setConfirmCode("");
          }}
        >
          <X size={15} />
          Cancel
        </button>
      )}

      {/* =====================================
          EDIT FAMILY

          ADMIN:
          FULL HOUSEHOLD SURVEY EDITOR

          EDITOR:
          ORIGINAL BASIC FAMILY EDITOR
      ===================================== */}

      {mode === "family" && (
        isAdmin ? (

          <HouseholdSurveyEditor
            key={`${familyId}-${revision}`}
            familyId={familyId}
            saving={saving}
            onSaved={saveFullSurvey}
          />

        ) : (

          <HouseholdEditForm
            key={revision}
            family={family}
            members={members}
            isAdmin={false}
            saving={saving}
            onSave={saveFamily}
          />

        )
      )}

      {/* =====================================
          NEW MAP-BASED LOCATION EDITOR
      ===================================== */}

      {mode === "location" && isAdmin && (
        <HouseholdLocationEditor
          key={`${familyId}-${revision}`}
          location={location}
          familyCount={locationFamilyCount}
          saving={saving}
          onSave={saveLocation}
        />
      )}

      {/* =====================================
          REMOVE / ARCHIVE HOUSEHOLD
      ===================================== */}

      {mode === "remove" && isAdmin && (
        <section className="ca-edit-form ca-remove-box">

          <h2>
            Remove household?
          </h2>

          <p>
            This archives{" "}
            <strong>
              {family.family_name}
            </strong>{" "}
            and hides its members from ordinary
            users. A shared location remains
            visible while another active family
            uses it.
          </p>

          <label>
            Type{" "}
            <strong>
              {family.family_code}
            </strong>{" "}
            to confirm

            <input
              autoComplete="off"
              value={confirmCode}
              onChange={(e) =>
                setConfirmCode(e.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="ca-edit-danger ca-remove-confirm"
            disabled={
              saving ||
              confirmCode !== family.family_code
            }
            onClick={removeFamily}
          >
            <Trash2 size={17} />

            {saving
              ? "Removing..."
              : "Archive this household"}
          </button>

        </section>
      )}

      {/* =====================================
          HOUSEHOLD INFORMATION VIEW
      ===================================== */}

      {mode === "view" && (
        <>

          {/* SECTION 1 — QUESTIONS 1–5 */}

          <section className="ca-edit-form ca-household-info-card">

            <div className="ca-profile-section-title">

              <House size={21} />

              <div>
                <h2>
                  පවුල් තොරතුරු පත්‍රිකාව
                </h2>

                <p>
                  Household Information
                </p>
              </div>

            </div>

            <dl className="ca-profile-grid ca-household-info-grid">

              <DetailField
                label="1. ලිපිනය (Address)"
                value={location.address_line}
              />

              <DetailField
                label="2. නිවසේ පදිංචි පවුල් සංඛ්‍යාව (Number of Families)"
                value={
                  sheet.number_of_families_in_house
                }
              />

              <DetailField
                label="3. ගෘහමූලික අංකය (Head of Household Number)"
                value={
                  sheet.head_of_household_number
                }
              />

              <DetailField
                label="4. දුරකථන අංකය (Telephone)"
                value={family.contact_phone}
              />

              <DetailField
                label="5. WhatsApp අංකය (WhatsApp Number)"
                value={sheet.whatsapp_number}
              />

            </dl>

          </section>

          {/* =================================
              FAMILY MEMBERS
          ================================= */}

          <section className="ca-edit-form ca-members-profile-section">

            <div className="ca-profile-section-title">

              <Users size={21} />

              <div>
                <h2>
                  පවුලේ සාමාජිකයන් ({activeMembers.length})
                </h2>

                <p>
                  Family Members — select a name
                  to view individual details
                </p>
              </div>

            </div>

            {activeMembers.length === 0 ? (
              <p className="ca-edit-muted">
                No active family members.
              </p>
            ) : (
              <ul className="ca-profile-member-list ca-clickable-member-list">

                {activeMembers.map((member) => {
                  const expanded =
                    selectedMemberId === member.id;

                  return (
                    <li
                      key={member.id}
                      className={
                        expanded
                          ? "is-expanded"
                          : ""
                      }
                    >

                      {/* MEMBER NAME */}

                      <button
                        type="button"
                        className="ca-member-toggle"
                        aria-expanded={expanded}
                        aria-controls={
                          `member-details-${member.id}`
                        }
                        onClick={() => {
                          setSelectedMemberId(
                            expanded ? null : member.id
                          );
                          setMemberDetails(null);
                          setMemberError("");
                        }}
                      >

                        <span className="ca-member-icon">
                          <UserRound size={18} />
                        </span>

                        <span className="ca-member-labels">

                          <strong>
                            {member.full_name}
                          </strong>

                          <small>
                            {member.person_code}

                            {member.is_head
                              ? " · Head of Family"
                              : member.relationship_to_head
                                ? ` · ${member.relationship_to_head}`
                                : ""}
                          </small>

                        </span>

                        {expanded
                          ? <ChevronDown size={19} />
                          : <ChevronRight size={19} />}

                      </button>

                      {/* EXPANDED DETAILS */}

                      {expanded && (
                        <div
                          id={`member-details-${member.id}`}
                          className="ca-member-expanded"
                        >

                          {memberLoading && (
                            <p
                              className="ca-edit-muted"
                              role="status"
                            >
                              Loading individual details...
                            </p>
                          )}

                          {memberError && (
                            <p
                              className="ca-edit-error"
                              role="alert"
                            >
                              {memberError}
                            </p>
                          )}

                          {!memberLoading &&
                            memberDetails && (
                              <MemberDetails
                                details={memberDetails}
                                canEdit={canEdit}
                              />
                            )}

                        </div>
                      )}

                    </li>
                  );
                })}

              </ul>
            )}

          </section>

          {/* =================================
              LOCATION DETAILS
          ================================= */}

          <section className="ca-edit-form">

            <h2>
              <MapPin size={19} />
              Location Details
            </h2>

            <dl className="ca-profile-grid">

              <DetailField
                label="Active families at this location"
                value={locationFamilyCount}
              />

              <DetailField
                label="GPS Coordinates"
                value={
                  location.latitude != null &&
                  location.longitude != null
                    ? `${location.latitude}, ${location.longitude}`
                    : null
                }
              />

            </dl>

          </section>

        </>
      )}

    </div>
  );
}
