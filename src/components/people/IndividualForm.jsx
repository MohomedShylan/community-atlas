
import { useEffect, useMemo, useState } from "react";

import {
  UserRound,
  House,
  CalendarDays,
  Save,
  AlertCircle,
  Info,
} from "lucide-react";

import {
  getFamilyRegistrationStatus,
} from "../../services/peopleService";

const initialValues = {
  familyId: "",
  fullName: "",
  dateOfBirth: "",
  gender: "",
  relationshipToHead: "",
  phone: "",
  notes: "",
  isHead: false,
};

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function IndividualForm({
  families,
  initialFamilyId = "",
  onSave,
  saving = false,
}) {
  const [form, setForm] = useState({
    ...initialValues,
    familyId: initialFamilyId,
  });

  const [familyStatus, setFamilyStatus] =
    useState(null);

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [statusError, setStatusError] =
    useState("");

  const [error, setError] = useState("");

  const selectedFamily = useMemo(
    () =>
      families.find(
        (family) => family.id === form.familyId
      ) ?? null,
    [families, form.familyId]
  );

  // Only use a URL's family ID if it matches
  // one of the currently available families.
  useEffect(() => {
    if (
      initialFamilyId &&
      families.some(
        (family) => family.id === initialFamilyId
      )
    ) {
      setForm((current) => ({
        ...current,
        familyId: initialFamilyId,
      }));
    }
  }, [initialFamilyId, families]);

  // Check existing members and whether the
  // family already has a head.
  useEffect(() => {
    if (!form.familyId) {
      setFamilyStatus(null);
      setStatusError("");
      return;
    }

    let active = true;

    setFamilyStatus(null);
    setStatusError("");
    setStatusLoading(true);

    getFamilyRegistrationStatus(form.familyId)
      .then((data) => {
        if (!active) return;

        setFamilyStatus(data);

        if (data.hasHead) {
          setForm((current) => ({
            ...current,
            isHead: false,
          }));
        }
      })
      .catch((err) => {
        if (active) {
          setStatusError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setStatusLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form.familyId]);

  function update(field, value) {
    setError("");

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectFamily(event) {
    const id = event.target.value;

    setForm((current) => ({
      ...current,
      familyId: id,
      isHead: false,
    }));

    setFamilyStatus(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (saving || statusLoading || statusError) {
      return;
    }

    if (!selectedFamily) {
      setError("Please select a valid active family.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError(
        "Full name must contain at least 2 characters."
      );
      return;
    }

    if (
      form.relationshipToHead.trim().length < 2
    ) {
      setError(
        "Enter the person's relationship to the head of family."
      );
      return;
    }

    if (
      form.dateOfBirth &&
      form.dateOfBirth > getToday()
    ) {
      setError(
        "Date of birth cannot be in the future."
      );
      return;
    }

    if (
      !familyStatus ||
      familyStatus.activeCount >= 25
    ) {
      setError(
        "This family cannot accept more members."
      );
      return;
    }

    if (
      !familyStatus.hasHead &&
      !form.isHead
    ) {
      setError(
        "This family has no head. Select the new person as head of family."
      );
      return;
    }

    if (
      familyStatus.hasHead &&
      form.isHead
    ) {
      setError(
        "This family already has a head of family."
      );
      return;
    }

    try {
      await onSave({
        ...form,
        fullName: form.fullName.trim(),
        relationshipToHead:
          form.relationshipToHead.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      });
    } catch (err) {
      setError(
        err.message ||
          "Individual registration failed."
      );
    }
  }

  return (
    <form
      className="ca-ind-form"
      onSubmit={handleSubmit}
    >
      {/* FAMILY SELECTION */}
      <section className="ca-ind-section">
        <div className="ca-ind-section-header">
          <div className="ca-ind-section-icon">
            <House size={21} />
          </div>

          <div>
            <h2>Select Family</h2>
            <p>
              Choose the household this person
              belongs to.
            </p>
          </div>
        </div>

        <div className="ca-ind-field">
          <label htmlFor="ind-family">
            Registered Family <span>*</span>
          </label>

          <select
            id="ind-family"
            value={form.familyId}
            onChange={selectFamily}
            required
            disabled={saving}
          >
            <option value="">
              Select a family
            </option>

            {families.map((family) => (
              <option
                value={family.id}
                key={family.id}
              >
                {family.family_code}
                {" — "}
                {family.family_name}
              </option>
            ))}
          </select>
        </div>

        {selectedFamily && (
          <div className="ca-ind-family-summary">
            <strong>
              {selectedFamily.family_name}
            </strong>

            <span>
              {selectedFamily.family_code}
            </span>

            <p>
              {[
                selectedFamily.location?.address_line,
                selectedFamily.location?.village,
                selectedFamily.location?.district,
              ]
                .filter(Boolean)
                .join(", ") ||
                "Address unavailable"}
            </p>
          </div>
        )}

        {statusLoading && (
          <p className="ca-ind-muted" role="status">
            Checking family records...
          </p>
        )}

        {statusError && (
          <div
            className="ca-ind-alert"
            role="alert"
          >
            <AlertCircle size={17} />
            {statusError}
          </div>
        )}

        {familyStatus && (
          <p className="ca-ind-muted">
            Active members:{" "}
            <strong>
              {familyStatus.activeCount}
            </strong>
            {" · "}
            {familyStatus.hasHead
              ? "Family head already registered"
              : "No family head registered"}
          </p>
        )}
      </section>

      {/* PERSONAL INFORMATION */}
      <section className="ca-ind-section">
        <div className="ca-ind-section-header">
          <div className="ca-ind-section-icon">
            <UserRound size={21} />
          </div>

          <div>
            <h2>Personal Information</h2>
            <p>
              Enter information about the
              new individual.
            </p>
          </div>
        </div>

        <div className="ca-ind-grid">
          <div className="ca-ind-field ca-ind-wide">
            <label htmlFor="ind-name">
              Full Name <span>*</span>
            </label>

            <input
              id="ind-name"
              type="text"
              value={form.fullName}
              onChange={(event) =>
                update("fullName", event.target.value)
              }
              placeholder="Enter full name"
              maxLength={150}
              required
              disabled={saving}
            />
          </div>

          <div className="ca-ind-field">
            <label htmlFor="ind-dob">
              <CalendarDays
                size={15}
                aria-hidden="true"
              />
              Date of Birth
            </label>

            <input
              id="ind-dob"
              type="date"
              value={form.dateOfBirth}
              max={getToday()}
              onChange={(event) =>
                update(
                  "dateOfBirth",
                  event.target.value
                )
              }
              disabled={saving}
            />
          </div>

          <div className="ca-ind-field">
            <label htmlFor="ind-gender">
              Gender (Optional)
            </label>

            <select
              id="ind-gender"
              value={form.gender}
              onChange={(event) =>
                update("gender", event.target.value)
              }
              disabled={saving}
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
          </div>

          <div className="ca-ind-field">
            <label htmlFor="ind-relationship">
              Relationship to Head
              <span>*</span>
            </label>

            <input
              id="ind-relationship"
              type="text"
              value={form.relationshipToHead}
              onChange={(event) =>
                update(
                  "relationshipToHead",
                  event.target.value
                )
              }
              placeholder="Head, spouse, child, parent..."
              maxLength={100}
              required
              disabled={saving}
            />
          </div>

          <div className="ca-ind-field">
            <label htmlFor="ind-phone">
              Contact Number
            </label>

            <input
              id="ind-phone"
              type="tel"
              value={form.phone}
              onChange={(event) =>
                update("phone", event.target.value)
              }
              placeholder="Optional phone number"
              maxLength={30}
              disabled={saving}
            />
          </div>

          <div className="ca-ind-field ca-ind-wide">
            <label htmlFor="ind-notes">
              Notes
            </label>

            <textarea
              id="ind-notes"
              value={form.notes}
              onChange={(event) =>
                update("notes", event.target.value)
              }
              placeholder="Optional non-sensitive notes"
              rows={4}
              maxLength={2000}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      {/* FAMILY ROLE */}
      <section className="ca-ind-section">
        <div className="ca-ind-section-header">
          <div className="ca-ind-section-icon">
            <UserRound size={21} />
          </div>

          <div>
            <h2>Family Role</h2>
            <p>
              Each family should have one
              active head of family.
            </p>
          </div>
        </div>

        <label className="ca-ind-checkbox">
          <input
            type="checkbox"
            checked={form.isHead}
            disabled={
              saving ||
              !familyStatus ||
              familyStatus.hasHead
            }
            onChange={(event) =>
              update(
                "isHead",
                event.target.checked
              )
            }
          />

          <span>
            Register this person as the head
            of family
          </span>
        </label>

        <div className="ca-ind-information">
          <Info size={17} />

          <p>
            {familyStatus?.hasHead
              ? "This family already has a head. To change the head, use the household editing feature from Step 7.2."
              : "If the family has no existing head, select this checkbox before saving."}
          </p>
        </div>
      </section>

      {/* ERRORS AND SAVE */}
      {error && (
        <div
          className="ca-ind-alert"
          role="alert"
        >
          <AlertCircle size={18} />
          <p>{error}</p>
        </div>
      )}

      <div className="ca-ind-actions">
        <button
          type="submit"
          className="ca-ind-primary"
          disabled={
            saving ||
            statusLoading ||
            !!statusError ||
            !selectedFamily ||
            !familyStatus ||
            familyStatus.activeCount >= 25
          }
        >
          <Save size={18} />

          {saving
            ? "Registering..."
            : "Register Individual"}
        </button>
      </div>
    </form>
  );
}
