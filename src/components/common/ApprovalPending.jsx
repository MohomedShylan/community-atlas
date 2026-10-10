
import { useState } from "react";
import {
  Clock3,
  ShieldAlert,
  RefreshCw,
  LogOut,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

export default function ApprovalPending() {
  const {
    user,
    profileError,
    refreshProfile,
    signOut,
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    setBusy(true);
    setError("");

    try {
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setError("");

    try {
      await signOut();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card auth-status-card">
        <div className="auth-logo">
          {profileError ? (
            <ShieldAlert size={27} />
          ) : (
            <Clock3 size={27} />
          )}
        </div>

        <h1>
          {profileError
            ? "Account verification problem"
            : "Awaiting administrator approval"}
        </h1>

        <p>
          {profileError
            ? "We could not verify your application permissions."
            : "Your account is authenticated, but an administrator must approve access to Community Atlas."}
        </p>

        <div className="auth-identity">
          <span>Signed in as</span>
          <strong>{user?.email || "Unknown account"}</strong>
        </div>

        {profileError && (
          <p className="auth-error" role="alert">
            {profileError}
          </p>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="auth-submit"
          onClick={handleRefresh}
          disabled={busy}
        >
          <RefreshCw size={17} />
          {busy ? "Checking..." : "Check Approval Status"}
        </button>

        <button
          type="button"
          className="auth-secondary-button"
          onClick={handleSignOut}
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </section>
    </div>
  );
}
