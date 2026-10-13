
import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  Settings2,
  UserRound,
  Mail,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CalendarDays,
  Fingerprint,
  Info,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

import "../styles/settings.css";

const PRIVACY_KEY =
  "community-atlas-settings-hide-account-details";

function getInitialPrivacyPreference() {
  try {
    const value = localStorage.getItem(PRIVACY_KEY);

    // Mask account identifiers by default.
    return value === null ? true : value === "true";
  } catch {
    return true;
  }
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRole(role) {
  const labels = {
    admin: "Administrator",
    editor: "Editor",
    viewer: "Viewer",
  };

  return labels[role] || "Not assigned";
}

function formatApproval(status) {
  if (!status) return "Not available";

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1).replace(/_/g, " ")
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  children,
}) {
  return (
    <div className="ca-settings-info-row">
      <div className="ca-settings-info-icon">
        <Icon size={18} />
      </div>

      <div className="ca-settings-info-content">
        <span className="ca-settings-info-label">
          {label}
        </span>

        {children || (
          <strong className="ca-settings-info-value">
            {value}
          </strong>
        )}
      </div>
    </div>
  );
}

function SettingsMessage({
  type = "success",
  children,
}) {
  const isError = type === "error";

  return (
    <div
      className={
        `ca-settings-message ${
          isError ? "is-error" : "is-success"
        }`
      }
      role={isError ? "alert" : "status"}
    >
      {isError ? (
        <AlertCircle size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}

      <span>{children}</span>
    </div>
  );
}

// ==========================================
// MAIN SETTINGS PAGE
// ==========================================

export default function Settings() {
  const navigate = useNavigate();

  const { user, profile } = useAuth();

  const userId = user?.id ?? null;

  const [verifiedUser, setVerifiedUser] =
    useState(null);

  const [checkingSession, setCheckingSession] =
    useState(false);

  const [sessionMessage, setSessionMessage] =
    useState("");

  const [sessionError, setSessionError] =
    useState("");

  const [lastVerified, setLastVerified] =
    useState(null);

  // PASSWORD CHANGE STATE

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  // SESSION ACTION STATE

  const [signingOut, setSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState("");

  // LOCAL DISPLAY PREFERENCE

  const [hideAccountDetails, setHideAccountDetails] =
    useState(getInitialPrivacyPreference);

  const [preferenceError, setPreferenceError] =
    useState("");

  // ========================================
  // KEEP ACCOUNT DATA IN SYNC WITH AUTH
  // ========================================

  useEffect(() => {
    setVerifiedUser(null);
    setLastVerified(null);
    setSessionMessage("");
    setSessionError("");
    setPasswordError("");
    setPasswordSuccess("");
    setNewPassword("");
    setConfirmPassword("");
  }, [userId]);

  const account =
    verifiedUser?.id === userId
      ? verifiedUser
      : user;

  const email =
    account?.email || "Not available";

  const displayName =
    profile?.full_name ||
    profile?.display_name ||
    account?.user_metadata?.full_name ||
    account?.user_metadata?.name ||
    "Staff Member";

  const role = profile?.role;

  const approvalStatus =
    profile?.approval_status;

  const accountActive =
    profile?.is_active;

  const emailVerified =
    Boolean(account?.email_confirmed_at);

  const displayedEmail =
    hideAccountDetails
      ? "Hidden — turn off privacy mode to view"
      : email;

  const displayedUserId =
    hideAccountDetails
      ? "Hidden — turn off privacy mode to view"
      : userId || "Not available";

  const passwordValid =
    newPassword.length >= 12;

  const passwordsMatch =
    newPassword !== "" &&
    newPassword === confirmPassword;

  // ========================================
  // VERIFY CURRENT SESSION
  // ========================================

  async function handleVerifySession() {
    if (!userId || checkingSession) return;

    setCheckingSession(true);
    setSessionError("");
    setSessionMessage("");

    try {
      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (
        !data.user ||
        data.user.id !== userId
      ) {
        throw new Error(
          "Your account session has changed. Please sign in again."
        );
      }

      setVerifiedUser(data.user);
      setLastVerified(new Date().toISOString());

      setSessionMessage(
        "Your Supabase authentication session has been verified."
      );
    } catch (error) {
      setSessionError(
        error.message ||
        "Unable to verify your session."
      );
    } finally {
      setCheckingSession(false);
    }
  }

  // ========================================
  // CHANGE ACCOUNT PASSWORD
  // ========================================

  async function handleChangePassword(event) {
    event.preventDefault();

    if (!userId || changingPassword) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 12) {
      setPasswordError(
        "Your new password must contain at least 12 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "The passwords do not match."
      );
      return;
    }

    if (!navigator.onLine) {
      setPasswordError(
        "An internet connection is required to change your password."
      );
      return;
    }

    setChangingPassword(true);

    try {
      // Verify the signed-in identity before
      // attempting an authenticated update.
      const {
        data: identity,
        error: identityError,
      } = await supabase.auth.getUser();

      if (identityError) {
        throw identityError;
      }

      if (identity.user?.id !== userId) {
        throw new Error(
          "The signed-in account has changed. Please sign in again."
        );
      }

      // Supabase handles the actual password
      // change and server-side security checks.
      const {
        error,
      } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmation(false);

      setPasswordSuccess(
        "Your password has been updated successfully."
      );
    } catch (error) {
      setPasswordError(
        error.message ||
        "Unable to update your password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  // ========================================
  // UPDATE LOCAL PRIVACY PREFERENCE
  // ========================================

  function handlePrivacyChange(checked) {
    setHideAccountDetails(checked);
    setPreferenceError("");

    try {
      localStorage.setItem(
        PRIVACY_KEY,
        String(checked)
      );
    } catch {
      setPreferenceError(
        "The preference changed for this session but could not be saved on this device."
      );
    }
  }

  // ========================================
  // SIGN OUT OF CURRENT DEVICE
  // ========================================

  async function handleSignOut() {
    if (signingOut) return;

    if (
      (newPassword || confirmPassword) &&
      !window.confirm(
        "Discard the password fields and sign out?"
      )
    ) {
      return;
    }

    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (error) throw error;

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      setSignOutError(
        error.message ||
        "Unable to sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  // ========================================
  // NOT SIGNED IN
  // ========================================

  if (!userId) {
    return (
      <div className="ca-settings-page">
        <div className="ca-settings-card ca-settings-empty">
          <LockKeyhole size={38} />

          <h2>Sign in required</h2>

          <p>
            Sign in to view your account settings.
          </p>

          <Link
            to="/login"
            className="ca-settings-primary-link"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ca-settings-page">

      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <header className="ca-settings-header">
        <div className="ca-settings-header-icon">
          <Settings2 size={25} />
        </div>

        <div>
          <span className="ca-settings-eyebrow">
            COMMUNITY ATLAS
          </span>

          <h1>Settings</h1>

          <p>
            Manage your account security,
            view staff permissions, and adjust
            personal display preferences.
          </p>
        </div>
      </header>

      {/* ====================================
          ACCOUNT OVERVIEW
      ==================================== */}

      <section className="ca-settings-card">
        <div className="ca-settings-card-heading">
          <div>
            <h2>My Account</h2>

            <p>
              Information associated with your
              signed-in Community Atlas account.
            </p>
          </div>

          <UserRound size={22} />
        </div>

        <div className="ca-settings-profile">
          <div
            className="ca-settings-avatar"
            aria-hidden="true"
          >
            {displayName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join("")
              .toUpperCase()}
          </div>

          <div>
            <strong>{displayName}</strong>

            <span>
              {formatRole(role)}
            </span>
          </div>
        </div>

        <div className="ca-settings-info-grid">

          <SettingsRow
            icon={Mail}
            label="Email Address"
            value={displayedEmail}
          />

          <SettingsRow
            icon={ShieldCheck}
            label="Staff Role"
            value={formatRole(role)}
          />

          <SettingsRow
            icon={CheckCircle2}
            label="Account Status"
            value={
              accountActive === true
                ? "Active"
                : accountActive === false
                  ? "Inactive"
                  : "Not available"
            }
          />

          <SettingsRow
            icon={ShieldCheck}
            label="Approval Status"
            value={formatApproval(
              approvalStatus
            )}
          />

          <SettingsRow
            icon={Mail}
            label="Email Verification"
            value={
              emailVerified
                ? "Verified"
                : "Not verified"
            }
          />

          <SettingsRow
            icon={Fingerprint}
            label="Account ID"
            value={displayedUserId}
          />

        </div>

        <p className="ca-settings-note">
          <Info size={16} />

          Your staff role, account approval,
          and activation status are managed by
          authorized Administrators. They
          cannot be changed from this page.
        </p>

        {role === "admin" && (
          <Link
            to="/admin/users"
            className="ca-settings-text-link"
          >
            <ShieldCheck size={16} />
            Open Staff Administration
          </Link>
        )}
      </section>

      {/* ====================================
          LOGIN AND SESSION DETAILS
      ==================================== */}

      <section className="ca-settings-card">
        <div className="ca-settings-card-heading">
          <div>
            <h2>Session Information</h2>

            <p>
              Check your authentication session
              and account sign-in information.
            </p>
          </div>

          <Clock3 size={22} />
        </div>

        <div className="ca-settings-info-grid">

          <SettingsRow
            icon={CalendarDays}
            label="Account Created"
            value={formatDate(
              account?.created_at
            )}
          />

          <SettingsRow
            icon={Clock3}
            label="Last Sign In"
            value={formatDate(
              account?.last_sign_in_at
            )}
          />

          <SettingsRow
            icon={CheckCircle2}
            label="Last Session Verification"
            value={formatDate(lastVerified)}
          />

        </div>

        {sessionMessage && (
          <SettingsMessage>
            {sessionMessage}
          </SettingsMessage>
        )}

        {sessionError && (
          <SettingsMessage type="error">
            {sessionError}
          </SettingsMessage>
        )}

        <button
          type="button"
          className="ca-settings-secondary-button"
          disabled={checkingSession}
          onClick={handleVerifySession}
        >
          <RefreshCw size={17} />

          {checkingSession
            ? "Verifying..."
            : "Verify Session"}
        </button>
      </section>

      {/* ====================================
          PASSWORD AND SECURITY
      ==================================== */}

      <section className="ca-settings-card">
        <div className="ca-settings-card-heading">
          <div>
            <h2>Change Password</h2>

            <p>
              Update the password used to sign
              in to your Community Atlas account.
            </p>
          </div>

          <KeyRound size={22} />
        </div>

        <form
          className="ca-settings-password-form"
          onSubmit={handleChangePassword}
        >

          <label htmlFor="ca-new-password">
            New Password
          </label>

          <div className="ca-settings-password-input">
            <input
              id="ca-new-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={newPassword}
              minLength={12}
              required
              autoComplete="new-password"
              placeholder="Enter a new password"

              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              aria-pressed={showPassword}
              onClick={() =>
                setShowPassword(
                  (value) => !value
                )
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <label htmlFor="ca-confirm-password">
            Confirm New Password
          </label>

          <div className="ca-settings-password-input">
            <input
              id="ca-confirm-password"
              type={
                showConfirmation
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              minLength={12}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"

              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              aria-label={
                showConfirmation
                  ? "Hide confirmation"
                  : "Show confirmation"
              }
              aria-pressed={showConfirmation}
              onClick={() =>
                setShowConfirmation(
                  (value) => !value
                )
              }
            >
              {showConfirmation ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <p className="ca-settings-helper">
            Use at least 12 characters.
            Choose a unique password you don't
            use for other accounts.
          </p>

          {newPassword &&
            !passwordValid && (
              <p className="ca-settings-validation">
                Enter at least 12 characters.
              </p>
            )}

          {confirmPassword &&
            !passwordsMatch && (
              <p className="ca-settings-validation">
                Passwords do not match.
              </p>
            )}

          {passwordError && (
            <SettingsMessage type="error">
              {passwordError}
            </SettingsMessage>
          )}

          {passwordSuccess && (
            <SettingsMessage>
              {passwordSuccess}
            </SettingsMessage>
          )}

          <button
            type="submit"
            className="ca-settings-primary-button"
            disabled={
              changingPassword ||
              signingOut ||
              !passwordValid ||
              !passwordsMatch
            }
          >
            <KeyRound size={17} />

            {changingPassword
              ? "Updating Password..."
              : "Update Password"}
          </button>

        </form>

        <p className="ca-settings-note">
          <LockKeyhole size={16} />

          Password updates are processed through
          Supabase Authentication. Depending on
          your project's security settings,
          additional verification may be required.
        </p>
      </section>

      {/* ====================================
          PRIVACY DISPLAY PREFERENCE
      ==================================== */}

      <section className="ca-settings-card">
        <div className="ca-settings-card-heading">
          <div>
            <h2>Privacy Preferences</h2>

            <p>
              Control how account information
              appears on this device.
            </p>
          </div>

          <EyeOff size={22} />
        </div>

        <label className="ca-settings-toggle-row">
          <div>
            <strong>
              Hide Account Identifiers
            </strong>

            <span>
              Mask your email address and account
              ID on the Settings page.
            </span>
          </div>

          <input
            type="checkbox"
            checked={hideAccountDetails}
            onChange={(event) =>
              handlePrivacyChange(
                event.target.checked
              )
            }
          />
        </label>

        {preferenceError && (
          <SettingsMessage type="error">
            {preferenceError}
          </SettingsMessage>
        )}

        <p className="ca-settings-note">
          <Info size={16} />

          This preference is stored only in
          the current browser. It does not
          encrypt account information or hide
          records elsewhere in Community Atlas.
        </p>
      </section>

      {/* ====================================
          SIGN OUT
      ==================================== */}

      <section className="ca-settings-card ca-settings-signout">
        <div className="ca-settings-card-heading">
          <div>
            <h2>Sign Out</h2>

            <p>
              End your Community Atlas session
              on this device.
            </p>
          </div>

          <LogOut size={22} />
        </div>

        {signOutError && (
          <SettingsMessage type="error">
            {signOutError}
          </SettingsMessage>
        )}

        <button
          type="button"
          className="ca-settings-signout-button"
          disabled={
            signingOut ||
            changingPassword
          }
          onClick={handleSignOut}
        >
          <LogOut size={17} />

          {signingOut
            ? "Signing Out..."
            : "Sign Out of This Device"}
        </button>

        <p className="ca-settings-note">
          Signing out here does not
          automatically sign out sessions
          on your other devices.
        </p>
      </section>

      {/* PAGE FOOTER */}

      <footer className="ca-settings-footer">
        <ShieldCheck size={15} />

        Community Atlas Account Settings
      </footer>

    </div>
  );
}
