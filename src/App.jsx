
import { lazy, Suspense } from "react";

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
import RequireAdmin from "./components/common/RequireAdmin";

// ==========================================
// LOADING COMPONENT
// ==========================================

import PageLoader from "./components/common/PageLoader";

// ==========================================
// AUTHENTICATION PAGES
// ==========================================

import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";

// ==========================================
// STEP 11.4 - LAZY-LOADED PAGES
// ==========================================

// DASHBOARD AND MAP

const Dashboard = lazy(
  () => import("./pages/Dashboard")
);

const MapExplorer = lazy(
  () => import("./pages/MapExplorer")
);

// HOUSEHOLD MANAGEMENT

const Households = lazy(
  () => import("./pages/Households")
);

const RegisterHousehold = lazy(
  () => import("./pages/RegisterHousehold")
);

const HouseholdProfile = lazy(
  () => import("./pages/HouseholdProfile")
);

// INDIVIDUAL MANAGEMENT

const People = lazy(
  () => import("./pages/People")
);

const RegisterIndividual = lazy(
  () => import("./pages/RegisterIndividual")
);

const IndividualProfile = lazy(
  () => import("./pages/IndividualProfile")
);

const ManageIndividual = lazy(
  () => import("./pages/ManageIndividual")
);

const ArchivedIndividuals = lazy(
  () => import("./pages/ArchivedIndividuals")
);

// REPORTS AND SETTINGS

const Reports = lazy(
  () => import("./pages/Reports")
);

const Settings = lazy(
  () => import("./pages/Settings")
);

// ADMINISTRATOR MANAGEMENT

const AdminUsers = lazy(
  () => import("./pages/AdminUsers")
);

// ==========================================
// MAIN APPLICATION
// ==========================================

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* PUBLIC ROUTES */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/set-password"
            element={<SetPassword />}
          />

          {/* PROTECTED APPLICATION */}

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>

              {/* DASHBOARD */}

              <Route
                index
                element={<Dashboard />}
              />

              {/* MAP EXPLORER */}

              <Route
                path="map"
                element={<MapExplorer />}
              />

              {/* HOUSEHOLDS */}

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

              {/* PEOPLE DIRECTORY */}

              <Route
                path="people"
                element={<People />}
              />

              {/* REGISTER INDIVIDUAL */}

              <Route
                path="people/new"
                element={<RegisterIndividual />}
              />

              {/* ARCHIVED INDIVIDUALS */}

              <Route
                path="people/archived"
                element={<ArchivedIndividuals />}
              />

              {/* MANAGE INDIVIDUAL */}

              <Route
                path="people/:personId/manage"
                element={<ManageIndividual />}
              />

              {/* INDIVIDUAL PROFILE */}

              <Route
                path="people/:personId"
                element={<IndividualProfile />}
              />

              {/* REPORTS */}

              <Route
                path="reports"
                element={<Reports />}
              />

              {/* ADMINISTRATOR MANAGEMENT */}

              <Route
                path="admin/users"
                element={
                  <RequireAdmin>
                    <AdminUsers />
                  </RequireAdmin>
                }
              />

              {/* SETTINGS */}

              <Route
                path="settings"
                element={<Settings />}
              />

            </Route>
          </Route>

          {/* UNKNOWN URLS */}

          <Route
            path="*"
            element={
              <Navigate to="/" replace />
            }
          />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
