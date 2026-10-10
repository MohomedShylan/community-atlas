
import { useState } from "react";
import {
  Navigate,
  useLocation,
} from "react-router";

import {
  MapPinned,
  LockKeyhole,
  LogIn,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import useAuth from "../hooks/useAuth";
import ApprovalPending from "../components/common/ApprovalPending";

export default function Login() {
  const {
    session,
    profile,
    loading,
  } = useAuth();

  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestedPath = location.state?.from?.pathname;

  const destination =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? requestedPath
      : "/";

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      // AuthContext receives SIGNED_IN,
      // verifies the account and loads its profile.
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading" role="status">
          <div className="auth-spinner" />
          <p>Checking your account...</p>
        </div>
      </div>
    );
  }

  if (session && profile?.is_active) {
    return <Navigate to={destination} replace />;
  }

  if (session) {
    return <ApprovalPending />;
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <MapPinned size={30} />
        </div>

        <div className="auth-heading">
          <span>COMMUNITY ATLAS</span>
          <h1>Welcome back</h1>

          <p>
            Sign in to access your family and
            location management workspace.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label htmlFor="login-email">
              Email Address
            </label>

            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
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
            <LogIn size={18} />

            {submitting
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <div className="auth-bottom">
          <LockKeyhole size={15} />
          <span>
            Authorized staff access only
          </span>
        </div>
      </section>
    </div>
  );
}
