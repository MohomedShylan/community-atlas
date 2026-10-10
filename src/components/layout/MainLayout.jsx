
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile navigation when a route changes.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Close with Escape and prevent background scrolling.
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar
        isOpen={isSidebarOpen}
        onNavigate={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          type="button"
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        <Navbar
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main id="main-content" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
