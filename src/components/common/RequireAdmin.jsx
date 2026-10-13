
import { Link } from "react-router";

import {
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

export default function RequireAdmin({
  children,
}) {
  const { profile } = useAuth();

  const isAdmin =
    profile?.role === "admin" &&
    profile?.is_active === true &&
    profile?.approval_status === "approved";

  if (!isAdmin) {
    return (
      <section
        className="ca-admin-state"
        role="alert"
      >
        <ShieldAlert size={42} />

        <h2>Administrator Access Required</h2>

        <p>
          Your account does not have permission
          to access Administrator management.
        </p>

        <Link
          to="/"
          className="ca-admin-secondary"
        >
          <ArrowLeft size={17} />
          Return to Dashboard
        </Link>
      </section>
    );
  }

  return children;
}
