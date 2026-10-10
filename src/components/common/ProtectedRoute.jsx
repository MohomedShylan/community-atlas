
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import useAuth from "../../hooks/useAuth";
import ApprovalPending from "./ApprovalPending";
import { supabase } from "../../lib/supabase";

export default function ProtectedRoute() {
  const {
    session,
    profile,
    loading,
  } = useAuth();

  const location = useLocation();

  if (!supabase) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <h1>Configuration required</h1>
          <p>
            Supabase credentials are missing.
            Please check your .env.local file.
          </p>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading" role="status">
          <div className="auth-spinner" />
          <p>Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (!profile?.is_active) {
    return <ApprovalPending />;
  }

  return <Outlet />;
}
