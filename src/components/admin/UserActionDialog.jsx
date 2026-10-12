
import { useState } from "react";

import {
  AlertTriangle,
  X,
  Check,
} from "lucide-react";

function getActionDetails(action) {
  if (action.type === "approve") {
    return {
      title:
        action.user.approval_status === "suspended"
          ? "Reactivate Account"
          : "Approve Account",

      description:
        "This user will be able to access Community Atlas using their assigned role.",

      confirmation: "APPROVE",
      dangerous: false,
    };
  }

  if (action.type === "suspend") {
    return {
      title: "Suspend Account",
      description:
        "This user's application access will be disabled. Their community records will not be deleted.",
      confirmation: "SUSPEND",
      dangerous: true,
    };
  }

  return {
    title: "Change User Role",
    description:
      `Change ${action.user.email || "this user"} from ${action.user.role} to ${action.newRole}.`,

    confirmation:
      action.newRole === "admin"
        ? "GRANT ADMIN"
        : "CHANGE ROLE",

    dangerous:
      action.newRole === "admin",
  };
}

export default function UserActionDialog({
  action,
  saving,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] =
    useState("");
  const [error, setError] = useState("");

  if (!action) return null;

  const details = getActionDetails(action);

  const isValid =
    reason.trim().length >= 8 &&
    reason.trim().length <= 300 &&
    confirmation.trim() ===
      details.confirmation;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValid || saving) return;

    setError("");

    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(
        err.message ||
          "The requested change failed."
      );
    }
  }

  return (
    <div className="ca-admin-modal-backdrop">
      <section
        className="ca-admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ca-admin-dialog-title"
      >
        <div className="ca-admin-modal-top">
          <div className="ca-admin-modal-icon">
            <AlertTriangle size={22} />
          </div>

          <button
            type="button"
            className="ca-admin-icon-button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>

        <h2 id="ca-admin-dialog-title">
          {details.title}
        </h2>

        <p className="ca-admin-muted">
          {details.description}
        </p>

        <div className="ca-admin-modal-user">
          <strong>
            {action.user.email || "No email"}
          </strong>

          <span>
            Current role: {action.user.role}
          </span>

          <span>
            Status: {action.user.approval_status}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="ca-admin-field">
            Reason for this action

            <textarea
              value={reason}
              rows={3}
              minLength={8}
              maxLength={300}
              required
              disabled={saving}
              autoFocus
              placeholder="Explain why this account is being changed..."
              onChange={(event) =>
                setReason(event.target.value)
              }
            />
          </label>

          <label className="ca-admin-field">
            Type{" "}
            <strong>
              {details.confirmation}
            </strong>
            {" "}to confirm

            <input
              type="text"
              value={confirmation}
              autoComplete="off"
              disabled={saving}
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
              placeholder={details.confirmation}
              required
            />
          </label>

          {error && (
            <p
              className="ca-admin-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="ca-admin-modal-actions">
            <button
              type="button"
              className="ca-admin-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={
                details.dangerous
                  ? "ca-admin-danger"
                  : "ca-admin-primary"
              }
              disabled={!isValid || saving}
            >
              <Check size={17} />

              {saving
                ? "Saving..."
                : "Confirm Change"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
