
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router";

// ==========================================
// LAYOUT AND ROUTE PROTECTION
// ==========================================

import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

// ==========================================
// AUTHENTICATION PAGES
// ==========================================

import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";

// ==========================================
// DASHBOARD AND MAP
// ==========================================

import Dashboard from "./pages/Dashboard";
import MapExplorer from "./pages/MapExplorer";

// ==========================================
// HOUSEHOLD MANAGEMENT
// ==========================================

import Households from "./pages/Households";
import RegisterHousehold from "./pages/RegisterHousehold";
import HouseholdProfile from "./pages/HouseholdProfile";

// ==========================================
// INDIVIDUAL MANAGEMENT
// ==========================================

import People from "./pages/People";
import RegisterIndividual from "./pages/RegisterIndividual";
import IndividualProfile from "./pages/IndividualProfile";

// Step 8.3 - Individual Lifecycle Management
import ManageIndividual from "./pages/ManageIndividual";
import ArchivedIndividuals from "./pages/ArchivedIndividuals";

// ==========================================
// REPORTS AND SETTINGS
// ==========================================

import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import OfflineWorkspace from "./pages/OfflineWorkspace";
// ==========================================
// STEP 10 - ADMINISTRATOR MANAGEMENT
// ==========================================

import AdminUsers from "./pages/AdminUsers";
import RequireAdmin from "./components/common/RequireAdmin";
// ==========================================
// MAIN APPLICATION
// ==========================================

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================
            PUBLIC ROUTES
        ==================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/set-password"
          element={<SetPassword />}
        />

        {/* ====================================
            PROTECTED APPLICATION
        ==================================== */}

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>

            {/* ================================
                DASHBOARD
            ================================ */}

            <Route
              index
              element={<Dashboard />}
            />

            {/* ================================
                MAP EXPLORER
            ================================ */}

            <Route
              path="map"
              element={<MapExplorer />}
            />

            {/* ================================
                HOUSEHOLD MANAGEMENT
            ================================ */}

            <Route
              path="households"
              element={<Households />}
            />

            <Route
              path="households/new"
              element={<RegisterHousehold />}
            />

            <Route
              path="households/:familyId"
              element={<HouseholdProfile />}
            />

            {/* ================================
                PEOPLE MANAGEMENT
            ================================ */}

            {/* Step 8.4 - People Directory */}
            <Route
              path="people"
              element={<People />}
            />

            {/* Step 8.1 - Register Individual */}
            <Route
              path="people/new"
              element={<RegisterIndividual />}
            />

            {/* Step 8.3 - Archived Individuals */}
            <Route
              path="people/archived"
              element={<ArchivedIndividuals />}
            />

            {/* Step 8.3 - Manage Individual */}
            <Route
              path="people/:personId/manage"
              element={<ManageIndividual />}
            />

            {/* Step 8.2 - Individual Profile */}
            <Route
              path="people/:personId"
              element={<IndividualProfile />}
            />

            {/* ================================
                REPORTS AND ANALYTICS
            ================================ */}

            {/* Step 9 - Reports */}
            <Route
              path="reports"
              element={<Reports />}
            />

            {/* ================================
                ADMINISTRATOR MANAGEMENT
            ================================ */}

            {/* Step 10 - Staff and Audit Logs */}
            <Route
              path="admin/users"
                 element={
                  <RequireAdmin>
                    <AdminUsers />
                  </RequireAdmin>
  }
/>

            {/* ================================
                APPLICATION SETTINGS
            ================================ */}

            <Route
              path="settings"
              element={<Settings />}
            />

          </Route>
        </Route>

        {/* ====================================
            FALLBACK ROUTE
        ==================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

        <Route
  path="/offline"
  element={<OfflineWorkspace />}
/>

      </Routes>
    </BrowserRouter>
  );
}
