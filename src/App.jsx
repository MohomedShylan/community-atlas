
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router";

import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";

import Dashboard from "./pages/Dashboard";
import MapExplorer from "./pages/MapExplorer";

import Households from "./pages/Households";
import RegisterHousehold from "./pages/RegisterHousehold";
import HouseholdProfile from "./pages/HouseholdProfile";

import People from "./pages/People";
import RegisterIndividual from "./pages/RegisterIndividual";

import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication pages */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/set-password"
          element={<SetPassword />}
        />

        {/* Protected application pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              index
              element={<Dashboard />}
            />

            <Route
              path="map"
              element={<MapExplorer />}
            />

            {/* Household management */}
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

            {/* Individual management */}
            <Route
              path="people"
              element={<People />}
            />

            <Route
              path="people/new"
              element={<RegisterIndividual />}
            />

            {/* Other application pages */}
            <Route
              path="reports"
              element={<Reports />}
            />

            <Route
              path="settings"
              element={<Settings />}
            />
          </Route>
        </Route>

        {/* Unknown URLs */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
