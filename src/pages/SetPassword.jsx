
import { useEffect, useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router";

import {
  LockKeyhole,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// Share an in-flight invitation verification
// between development-mode effect reruns.
const invitationRequests = new Map();

function verifyInvitation(tokenHash) {
  if (!invitationRequests.has(tokenHash)) {
    const request = supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });

    invitationRequests.set(tokenHash, request);
  }

  return invitationRequests.get(tokenHash);
}

export default function SetPassword() {
  const navigate = useNavigate();

  // Capture the token once before removing it
  // from the browser's address bar.
  const [invitation] = useState(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    return {
      tokenHash: params.get("token_hash"),
      type: params.get("type"),
    };
  });

  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (
      !supabase ||
      !invitation.tokenHash ||
      invitation.type !== "invite"
    ) {
      setStatus("invalid");
      return;
    }

    // Remove the one-time token from the visible URL.
    window.history.replaceState(
      window.history.state,
      "",
      "/set-password"
    );

    verifyInvitation(invitation.tokenHash)
      .then(({ error: verificationError }) => {
        if (!active) return;

        if (verificationError) {
          setError(verificationError.message);
          setStatus("invalid");
          return;
        }

        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message);
        setStatus("invalid");
      });

    return () => {
      active = false;
    };
  }, [invitation]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (status !== "ready") return;

    if (password.length < 12) {
      setError(
        "Your password must contain at least 12 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) throw updateError;

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      navigate("/login", {
        replace: true,
        state: {
          passwordCreated: true,
        },
      });
    } catch (err) {
      setError(err.message || "Password setup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "verifying") {
    return (
      <div className="auth-page">
        <div className="auth-loading" role="status">
          <div className="auth-spinner" />
          <p>Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-logo">
            <AlertCircle size={27} />
          </div>

          <h1>Invitation unavailable</h1>

          <p>
            The invitation is invalid, expired,
            already used, or could not be verified.
          </p>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <p>
            Contact your administrator to request
            a new invitation.
          </p>

          <Link
            to="/login"
            className="auth-secondary-button"
          >
            Return to Login
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <LockKeyhole size={27} />
        </div>

        <div className="auth-heading">
          <span>COMMUNITY ATLAS</span>
          <h1>Create your password</h1>

          <p>
            Your invitation has been verified.
            Create a password to finish setting up
            your account.
          </p>
        </div>

        <div className="auth-success">
          <CheckCircle2 size={17} />
          Invitation verified successfully
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="new-password">
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              placeholder="At least 12 characters"
              autoComplete="new-password"
              minLength={12}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={12}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            <CheckCircle2 size={18} />
            {submitting
              ? "Saving Password..."
              : "Create Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
