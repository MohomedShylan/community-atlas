
import { NavLink } from "react-router";

import {
  LayoutDashboard,
  MapPinned,
  House,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

// STEP 10 - Authentication hook
import useAuth from "../../hooks/useAuth";

// ==========================================
// WORKSPACE NAVIGATION
// ==========================================

const navigationItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Map Explorer",
    path: "/map",
    icon: MapPinned,
  },
  {
    label: "Households",
    path: "/households",
    icon: House,
  },
  {
    label: "People",
    path: "/people",
    icon: Users,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
  },
];

// ==========================================
// SIDEBAR COMPONENT
// ==========================================

function Sidebar({ isOpen, onNavigate }) {

  // STEP 10 - Get authenticated user profile
  const { profile } = useAuth();

  // Only approved Administrators can see
  // the Administration navigation link.
  const isAdmin =
    profile?.role === "admin" &&
    profile?.is_active === true;

  return (
    <aside
      id="app-sidebar"
      className={`sidebar ${isOpen ? "is-open" : ""}`}
      aria-label="Application sidebar"
    >

      {/* ====================================
          SIDEBAR HEADER
      ==================================== */}

      <div className="sidebar-header">
        <div className="sidebar-logo">
          <MapPinned
            size={26}
            strokeWidth={2.2}
          />
        </div>

        <div className="sidebar-brand">
          <h2>Community Atlas</h2>
          <span>Family Management</span>
        </div>
      </div>

      {/* ====================================
          SIDEBAR CONTENT
      ==================================== */}

      <div className="sidebar-content">

        {/* WORKSPACE SECTION */}

        <p className="sidebar-section-title">
          WORKSPACE
        </p>

        <nav
          className="sidebar-nav"
          aria-label="Main navigation"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Icon
                  size={19}
                  strokeWidth={1.9}
                />

                <span>{item.label}</span>

                <ChevronRight
                  className="sidebar-link-arrow"
                  size={16}
                />
              </NavLink>
            );
          })}
        </nav>

        {/* ====================================
            SYSTEM SECTION
        ==================================== */}

        <p className="sidebar-section-title sidebar-settings-title">
          SYSTEM
        </p>

        <nav
          className="sidebar-nav"
          aria-label="System navigation"
        >

          {/* ==================================
              STEP 10 - ADMINISTRATION LINK

              Visible only to approved
              Administrators.
          ================================== */}

          {isAdmin && (
            <NavLink
              to="/admin/users"
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <ShieldCheck
                size={19}
                strokeWidth={1.9}
              />

              <span>Administration</span>

              <ChevronRight
                className="sidebar-link-arrow"
                size={16}
              />
            </NavLink>
          )}

          {/* SETTINGS */}

          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Settings
              size={19}
              strokeWidth={1.9}
            />

            <span>Settings</span>

            <ChevronRight
              className="sidebar-link-arrow"
              size={16}
            />
          </NavLink>

        </nav>
      </div>

      {/* ====================================
          SIDEBAR FOOTER
      ==================================== */}

      <div className="sidebar-footer">
        <div className="sidebar-footer-icon">
          <ShieldCheck size={20} />
        </div>

        <div>
          <strong>Workspace Preview</strong>
          <p>Sample data only</p>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
