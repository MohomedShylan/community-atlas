
import { useState } from "react";
import {
  Link,
  useLocation,
} from "react-router";

import {
  Menu,
  MapPinned,
  ChevronRight,
  LogOut,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";

const pageTitles = {
  "/": "Dashboard",
  "/map": "Map Explorer",
  "/households": "Households",
  "/people": "People",
  "/reports": "Reports",
  "/settings": "Settings",
};

export default function Navbar({
  onMenuClick,
  isMenuOpen,
}) {
  const location = useLocation();

  const {
    user,
    profile,
    signOut,
  } = useAuth();

  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const pageTitle =
    pageTitles[location.pathname] || "Community Atlas";

  const displayName =
    profile?.display_name ||
    user?.email ||
    "User";

  const initials = displayName
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const roleLabel = {
    admin: "Administrator",
    editor: "Editor",
    viewer: "Viewer",
  }[profile?.role] || "User";

  const handleSignOut = async () => {
    setSigningOut(true);
    setError("");

    try {
      await signOut();
    } catch (err) {
      setError(err.message || "Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          aria-expanded={isMenuOpen}
        >
          <Menu size={23} />
        </button>

        <Link to="/" className="mobile-brand">
          <MapPinned size={22} />
          <span>Community Atlas</span>
        </Link>

        <div className="topbar-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={15} />
          <strong>{pageTitle}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-user">
          <div className="user-avatar">
            {initials || "U"}
          </div>

          <div className="user-info">
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <button
          type="button"
          className="topbar-logout"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={19} />
        </button>

        {error && (
          <span
            className="topbar-auth-error"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    </header>
  );
}
