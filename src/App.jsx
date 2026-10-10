
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
import IndividualProfile from "./pages/IndividualProfile";

import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/set-password"
          element={<SetPassword />}
        />

        {/* Authenticated application */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              index
              element={<Dashboard />}
            />

            {/* MAP */}
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

            {/* PEOPLE */}
            <Route
              path="people"
              element={<People />}
            />

            <Route
              path="people/new"
              element={<RegisterIndividual />}
            />

            <Route
              path="people/:personId"
              element={<IndividualProfile />}
            />

            {/* OTHER PAGES */}
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
