
import { useEffect, useState } from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  ArrowLeft,
  AlertCircle,
  UserRound,
  Users,
  ArrowRightLeft,
  Archive,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  House,
  Save,
  X,
  WifiOff,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getActiveFamilies,
} from "../services/peopleService";

import {
  getManagedIndividual,
  updateIndividualDetails,
  changeFamilyHead,
  transferIndividual,
  archiveIndividual,
  restoreIndividual,
} from "../services/individualManagementService";

// ==========================================
// INITIAL FORM VALUES
// ==========================================

function getInitialFormValues(person) {
  return {
    fullName: person?.full_name ?? "",
    dateOfBirth: person?.date_of_birth ?? "",
    gender: person?.gender ?? "",
    relationshipToHead:
      person?.relationship_to_head ?? "",
    phone: person?.phone ?? "",
    notes: person?.notes ?? "",
  };
}

// ==========================================
// VALIDATE PERSONAL INFORMATION
// ==========================================

function validateForm(values) {
  const name = values.fullName.trim();

  if (name.length < 2 || name.length > 150) {
    return "Full name must contain 2 to 150 characters.";
  }

  if (values.relationshipToHead.length > 100) {
    return "Relationship to head cannot exceed 100 characters.";
  }

  if (values.phone.length > 30) {
    return "Phone number cannot exceed 30 characters.";
  }

  if (values.notes.length > 2000) {
    return "Notes cannot exceed 2000 characters.";
  }

  if (values.dateOfBirth) {
    const date = new Date(
      `${values.dateOfBirth}T12:00:00`
    );

    if (
      Number.isNaN(date.getTime()) ||
      date > new Date()
    ) {
      return "Date of birth cannot be in the future.";
    }
  }

  return "";
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ManageIndividual() {
  const { personId } = useParams();

  const { profile } = useAuth();

  // ========================================
  // ROLE PERMISSIONS
  // ========================================

  const isAdmin =
    profile?.role === "admin" &&
    profile?.is_active === true;

  const canEdit =
    profile?.is_active === true &&
    (
      profile?.role === "admin" ||
      profile?.role === "editor"
    );

  // ========================================
  // DATA STATES
  // ========================================

  const [record, setRecord] = useState(null);
  const [families, setFamilies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  // ========================================
  // FORM STATE
  // ========================================

  const [form, setForm] = useState(
    getInitialFormValues(null)
  );

  // ========================================
  // FAMILY HEAD STATE
  // ========================================

  const [newHeadId, setNewHeadId] = useState("");

  // ========================================
  // TRANSFER STATE
  // ========================================

  const [
    targetFamilyId,
    setTargetFamilyId,
  ] = useState("");

  // ========================================
  // ARCHIVE CONFIRMATION
  // ========================================

  const [showRemove, setShowRemove] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");

  // ========================================
  // REFRESH HELPER
  // ========================================

  function refreshData() {
    setReloadKey((current) => current + 1);
  }

  // ========================================
  // 1. LOAD INDIVIDUAL INFORMATION
  // ========================================

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadIndividual() {
      setLoading(true);
      setError("");

      try {
        const personData =
          await getManagedIndividual(personId);

        if (!active) return;

        setRecord(personData);

        if (personData?.person) {
          setForm(
            getInitialFormValues(
              personData.person
            )
          );

          const currentHead =
            personData.members?.find(
              (member) => member.is_head
            );

          setNewHeadId(
            currentHead?.id ?? ""
          );
        } else {
          setNewHeadId("");
        }

        setTargetFamilyId("");

        // Destination families are needed
        // only for Administrator transfers.
        if (isAdmin) {
          try {
            const familyData =
              await getActiveFamilies();

            if (active) {
              setFamilies(familyData ?? []);
            }
          } catch (familyError) {
            if (active) {
              setFamilies([]);

              setError(
                "Individual loaded, but destination families could not be loaded: " +
                familyError.message
              );
            }
          }
        } else {
          setFamilies([]);
        }
      } catch (err) {
        if (!active) return;

        setRecord(null);

        setError(
          err.message ||
          "Failed to load individual information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadIndividual();

    return () => {
      active = false;
    };
  }, [
    personId,
    canEdit,
    isAdmin,
    reloadKey,
  ]);

  // ========================================
  // 2. UPDATE FORM FIELDS
  // ========================================

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  // ========================================
  // 3. COMMON DATABASE ACTION HANDLER
  // ========================================

  async function executeAction(
    action,
    successMessage
  ) {
    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await action();

      setSuccess(successMessage);

      setShowRemove(false);
      setConfirmCode("");

      refreshData();
    } catch (err) {
      setError(
        err.message ||
        "The requested action could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // 4. SAVE PERSONAL INFORMATION
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    const validationError =
      validateForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    await executeAction(
      () =>
        updateIndividualDetails(
          personId,
          form
        ),
      "Personal information updated successfully."
    );
  }

  // ========================================
  // 5. CHANGE FAMILY HEAD
  // ========================================

  async function handleChangeHead() {
    if (!record?.person || !newHeadId) {
      return;
    }

    const selectedMember =
      record.members.find(
        (member) => member.id === newHeadId
      );

    if (!selectedMember) {
      setError(
        "Please select an active family member."
      );
      return;
    }

    if (selectedMember.is_head) {
      setError(
        "This individual is already the family head."
      );
      return;
    }

    const confirmed = window.confirm(
      `Set ${selectedMember.full_name} as the new head of this family?`
    );

    if (!confirmed) return;

    await executeAction(
      () =>
        changeFamilyHead(
          record.person.family_id,
          newHeadId
        ),
      "Head of family changed successfully."
    );
  }

  // ========================================
  // 6. TRANSFER INDIVIDUAL
  // ========================================

  async function handleTransfer() {
    if (
      !record?.person ||
      !targetFamilyId
    ) {
      return;
    }

    const person = record.person;

    if (person.is_head) {
      setError(
        "Assign another family head before transferring this individual."
      );
      return;
    }

    if (targetFamilyId === person.family_id) {
      setError(
        "Please select a different destination family."
      );
      return;
    }

    const target = families.find(
      (family) => family.id === targetFamilyId
    );

    if (!target) {
      setError(
        "Please select a valid destination family."
      );
      return;
    }

    const confirmed = window.confirm(
      `Transfer ${person.full_name} to ${target.family_name} (${target.family_code})?`
    );

    if (!confirmed) return;

    await executeAction(
      () =>
        transferIndividual(
          person.id,
          targetFamilyId
        ),
      "Individual transferred successfully."
    );
  }

  // ========================================
  // 7. ARCHIVE INDIVIDUAL
  // ========================================

  async function handleArchive() {
    if (!record?.person) return;

    const person = record.person;

    if (person.is_head) {
      setError(
        "Assign another family head before removing this individual."
      );
      return;
    }

    if (confirmCode !== person.person_code) {
      setError(
        "The person code confirmation does not match."
      );
      return;
    }

    await executeAction(
      () =>
        archiveIndividual(
          person.id,
          confirmCode
        ),
      "Individual archived successfully."
    );
  }

  // ========================================
  // 8. RESTORE INDIVIDUAL
  // ========================================

  async function handleRestore() {
    if (!record?.person) return;

    const confirmed = window.confirm(
      `Restore ${record.person.full_name} to their family?`
    );

    if (!confirmed) return;

    await executeAction(
      () =>
        restoreIndividual(
          record.person.id
        ),
      "Individual restored successfully."
    );
  }

  // ========================================
  // PERMISSION SCREEN
  // ========================================

  if (!canEdit) {
    return (
      <div className="ca-pm-page">
        <section className="ca-pm-state">
          <ShieldAlert size={42} />

          <h2>Permission Required</h2>

          <p>
            Only approved Administrators and
            Editors can manage individual records.
          </p>

          <Link
            to="/people"
            className="ca-pm-secondary"
          >
            <ArrowLeft size={17} />
            Back to People
          </Link>
        </section>
      </div>
    );
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <div className="ca-pm-page">
        <section
          className="ca-pm-state"
          role="status"
        >
          <Users size={38} />

          <h2>Loading Individual</h2>

          <p>
            Please wait while we load the
            individual's information.
          </p>
        </section>
      </div>
    );
  }

  // ========================================
  // RECORD NOT FOUND
  // ========================================

  if (!record?.person) {
    return (
      <div className="ca-pm-page">
        <Link
          to="/people"
          className="ca-pm-back"
        >
          <ArrowLeft size={17} />
          Back to People
        </Link>

        <section className="ca-pm-state">
          <AlertCircle size={42} />

          <h2>Individual Unavailable</h2>

          <p>
            {error ||
              "This individual could not be found or is not accessible to your account."}
          </p>

          <button
            type="button"
            className="ca-pm-secondary"
            onClick={refreshData}
          >
            <RotateCcw size={17} />
            Try Again
          </button>
        </section>
      </div>
    );
  }

  // ========================================
  // DERIVED RECORD INFORMATION
  // ========================================

  const { person, members = [] } = record;

  const family = person.family;

  const familyActive = Boolean(
    family &&
    !family.is_archived &&
    family.location &&
    !family.location.is_archived
  );

  const canModify =
    !person.is_archived &&
    familyActive;

  const currentHead = members.find(
    (member) => member.is_head
  );

  const otherFamilies = families.filter(
    (item) => item.id !== person.family_id
  );

  const backLink = person.is_archived
    ? "/people/archived"
    : `/people/${person.id}`;

  // ========================================
  // MAIN PAGE
  // ========================================

  return (
    <div className="ca-pm-page">

      {/* BACK NAVIGATION */}

      <Link
        to={backLink}
        className="ca-pm-back"
      >
        <ArrowLeft size={17} />
        Back
      </Link>

      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <header className="ca-pm-header">
        <div className="ca-pm-avatar">
          <UserRound size={30} />
        </div>

        <div>
          <span className="ca-pm-eyebrow">
            INDIVIDUAL MANAGEMENT
          </span>

          <h1>{person.full_name}</h1>

          <p>
            {person.person_code}
            {" · "}
            {family?.family_name ||
              "Family unavailable"}
          </p>
        </div>

        <span
          className={
            person.is_archived
              ? "ca-pm-status is-archived"
              : "ca-pm-status"
          }
        >
          {person.is_archived
            ? "Archived"
            : "Active"}
        </span>
      </header>

      {/* ====================================
          STEP 11.3 - OFFLINE EDIT ACTION

          Available only for active people
          in active households.
      ==================================== */}

      {canModify && (
        <div className="ca-pm-actions">
          <Link
            to={`/offline?personId=${encodeURIComponent(
              person.id
            )}`}
            className="ca-pm-secondary"
            title="Save this person for encrypted offline editing"
          >
            <WifiOff size={17} />
            Offline Edit
          </Link>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div
          className="ca-pm-success"
          role="status"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <div
          className="ca-pm-error"
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* ARCHIVED HOUSEHOLD WARNING */}

      {!familyActive && (
        <div className="ca-pm-warning">
          <AlertCircle size={18} />

          <span>
            This person's household is archived
            or unavailable. Restore the household
            before modifying or restoring its
            members.
          </span>

          {isAdmin && family?.id && (
            <Link to={`/households/${family.id}`}>
              View Household
            </Link>
          )}
        </div>
      )}

      {/* ====================================
          CONTENT LAYOUT
      ==================================== */}

      <div className="ca-pm-layout">

        {/* MAIN CONTENT */}

        <main className="ca-pm-main">

          {/* ==============================
              EDIT PERSONAL INFORMATION
          ============================== */}

          {canModify && (
            <section className="ca-pm-card">

              <div className="ca-pm-heading">
                <UserRound size={21} />
                <h2>Edit Personal Information</h2>
              </div>

              <form
                className="ca-pm-form"
                onSubmit={handleSave}
              >
                <div className="ca-pm-grid">

                  {/* FULL NAME */}

                  <label className="ca-pm-wide">
                    Full Name *

                    <input
                      type="text"
                      value={form.fullName}
                      required
                      minLength={2}
                      maxLength={150}
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "fullName",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {/* DATE OF BIRTH */}

                  <label>
                    Date of Birth

                    <input
                      type="date"
                      value={form.dateOfBirth}
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "dateOfBirth",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {/* GENDER */}

                  <label>
                    Gender

                    <select
                      value={form.gender}
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "gender",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Not specified
                      </option>

                      <option value="male">
                        Male
                      </option>

                      <option value="female">
                        Female
                      </option>

                      <option value="other">
                        Other
                      </option>

                      <option value="prefer_not_to_say">
                        Prefer not to say
                      </option>
                    </select>
                  </label>

                  {/* RELATIONSHIP */}

                  <label>
                    Relationship to Head

                    <input
                      type="text"
                      value={form.relationshipToHead}
                      maxLength={100}
                      disabled={
                        saving ||
                        person.is_head
                      }
                      onChange={(event) =>
                        updateField(
                          "relationshipToHead",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {/* PHONE NUMBER */}

                  <label>
                    Phone Number

                    <input
                      type="tel"
                      value={form.phone}
                      maxLength={30}
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {/* NOTES */}

                  <label className="ca-pm-wide">
                    Notes

                    <textarea
                      rows={4}
                      value={form.notes}
                      maxLength={2000}
                      disabled={saving}
                      placeholder="Optional notes about this individual"
                      onChange={(event) =>
                        updateField(
                          "notes",
                          event.target.value
                        )
                      }
                    />
                  </label>

                </div>

                <div className="ca-pm-actions">
                  <button
                    type="submit"
                    className="ca-pm-primary"
                    disabled={saving}
                  >
                    <Save size={17} />

                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ==============================
              CHANGE HEAD OF FAMILY
          ============================== */}

          {canModify && (
            <section className="ca-pm-card">

              <div className="ca-pm-heading">
                <Users size={21} />
                <h2>Family Head Management</h2>
              </div>

              <p className="ca-pm-muted">
                Each active family must have
                exactly one active head.
                Changing the head updates the
                entire family.
              </p>

              <p className="ca-pm-muted">
                Current Head:{" "}
                <strong>
                  {currentHead?.full_name ||
                    "Not assigned"}
                </strong>
              </p>

              <label className="ca-pm-label">
                Choose New Family Head

                <select
                  value={newHeadId}
                  disabled={saving}
                  onChange={(event) =>
                    setNewHeadId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select family member
                  </option>

                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.full_name}
                      {member.is_head
                        ? " (Current Head)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <p className="ca-pm-muted">
                After changing the family head,
                review the relationship descriptions
                of the other family members.
              </p>

              <button
                type="button"
                className="ca-pm-secondary"
                disabled={
                  saving ||
                  !newHeadId ||
                  newHeadId === currentHead?.id
                }
                onClick={handleChangeHead}
              >
                <Users size={17} />
                Set Family Head
              </button>
            </section>
          )}

          {/* ==============================
              TRANSFER INDIVIDUAL
              ADMIN ONLY
          ============================== */}

          {isAdmin && canModify && (
            <section className="ca-pm-card">

              <div className="ca-pm-heading">
                <ArrowRightLeft size={21} />
                <h2>Transfer Individual</h2>
              </div>

              <p className="ca-pm-muted">
                Transfer this individual to a
                different active family.
                Their person code and individual
                identity will remain unchanged.
              </p>

              {person.is_head && (
                <div className="ca-pm-warning">
                  <AlertCircle size={18} />

                  You must assign another family
                  head before transferring this
                  individual.
                </div>
              )}

              <label className="ca-pm-label">
                Destination Family

                <select
                  value={targetFamilyId}
                  disabled={
                    saving ||
                    person.is_head
                  }
                  onChange={(event) =>
                    setTargetFamilyId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select destination family
                  </option>

                  {otherFamilies.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.family_code}
                      {" — "}
                      {item.family_name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="ca-pm-secondary"
                disabled={
                  saving ||
                  person.is_head ||
                  !targetFamilyId
                }
                onClick={handleTransfer}
              >
                <ArrowRightLeft size={17} />
                Confirm Transfer
              </button>
            </section>
          )}

          {/* ==============================
              REMOVE / ARCHIVE
              ADMIN ONLY
          ============================== */}

          {isAdmin && canModify && (
            <section className="ca-pm-card ca-pm-danger-zone">

              <div className="ca-pm-heading">
                <Archive size={21} />
                <h2>Remove Individual</h2>
              </div>

              <p>
                Removing an individual will
                archive their record.
                This does not permanently delete
                their information from Supabase.
              </p>

              {person.is_head ? (
                <div className="ca-pm-warning">
                  <AlertCircle size={18} />

                  You cannot remove the current
                  family head. Assign another
                  head first.
                </div>
              ) : (
                <>
                  {!showRemove ? (
                    <button
                      type="button"
                      className="ca-pm-danger"
                      disabled={saving}
                      onClick={() =>
                        setShowRemove(true)
                      }
                    >
                      <Archive size={17} />
                      Remove Individual
                    </button>
                  ) : (
                    <div className="ca-pm-confirm">

                      <p>
                        Enter the person code{" "}
                        <strong>
                          {person.person_code}
                        </strong>
                        {" "}to confirm removal.
                      </p>

                      <input
                        type="text"
                        value={confirmCode}
                        autoComplete="off"
                        disabled={saving}
                        placeholder="Enter person code"
                        onChange={(event) =>
                          setConfirmCode(
                            event.target.value
                          )
                        }
                      />

                      <div className="ca-pm-actions">
                        <button
                          type="button"
                          className="ca-pm-secondary"
                          disabled={saving}
                          onClick={() => {
                            setShowRemove(false);
                            setConfirmCode("");
                          }}
                        >
                          <X size={17} />
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="ca-pm-danger"
                          disabled={
                            saving ||
                            confirmCode !==
                              person.person_code
                          }
                          onClick={handleArchive}
                        >
                          <Archive size={17} />
                          Confirm Removal
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ==============================
              RESTORE ARCHIVED INDIVIDUAL
              ADMIN ONLY
          ============================== */}

          {isAdmin && person.is_archived && (
            <section className="ca-pm-card">

              <div className="ca-pm-heading">
                <RotateCcw size={21} />
                <h2>Restore Individual</h2>
              </div>

              <p className="ca-pm-muted">
                Restore this individual to their
                family. Once restored, the record
                will appear again in the active
                People Directory and household
                member lists.
              </p>

              {!familyActive && (
                <div className="ca-pm-warning">
                  <AlertCircle size={18} />
                  Restore the household first.
                </div>
              )}

              <button
                type="button"
                className="ca-pm-primary"
                disabled={
                  saving ||
                  !familyActive
                }
                onClick={handleRestore}
              >
                <RotateCcw size={17} />

                {saving
                  ? "Restoring..."
                  : "Restore Individual"}
              </button>
            </section>
          )}

        </main>

        {/* ==================================
            RIGHT SIDEBAR
        ================================== */}

        <aside className="ca-pm-sidebar">

          {/* FAMILY DETAILS */}

          <section className="ca-pm-card">
            <div className="ca-pm-heading">
              <House size={21} />
              <h2>Family Information</h2>
            </div>

            <p>
              <strong>
                {family?.family_name ||
                  "Unknown Family"}
              </strong>
            </p>

            <p className="ca-pm-muted">
              Family Code:{" "}
              {family?.family_code || "N/A"}
            </p>

            <p className="ca-pm-muted">
              Family Status:{" "}
              {familyActive
                ? "Active"
                : "Archived / Unavailable"}
            </p>

            {family?.id && (
              <Link
                to={`/households/${family.id}`}
                className="ca-pm-secondary"
              >
                <House size={17} />
                View Household
              </Link>
            )}
          </section>

          {/* ACTIVE FAMILY MEMBERS */}

          <section className="ca-pm-card">
            <div className="ca-pm-heading">
              <Users size={21} />
              <h2>Active Family Members</h2>
            </div>

            <div className="ca-pm-member-list">

              {members.length === 0 && (
                <p className="ca-pm-muted">
                  No active family members found.
                </p>
              )}

              {members.map((member) => (
                <div
                  key={member.id}
                  className="ca-pm-member"
                >
                  <UserRound size={17} />

                  <span>
                    {member.full_name}

                    {member.is_head && (
                      <strong>
                        {" "}· Head
                      </strong>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </aside>

      </div>
    </div>
  );
}
