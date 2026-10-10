
import { useState } from "react";
import {
  Link,
  useLocation,
} from "react-router";

import {
  ArrowLeft,
  CheckCircle2,
  House,
  MapPinned,
  ShieldAlert,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import HouseholdForm from
  "../components/households/HouseholdForm";

import {
  registerHousehold,
} from "../services/householdService";

export default function RegisterHousehold() {
  const location = useLocation();
  const { profile } = useAuth();

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const selectedPoint =
    location.state?.point ?? null;

  const existingLocation =
    location.state?.existingLocation ?? null;

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "editor";

  if (!canEdit) {
    return (
      <div className="page-card">
        <ShieldAlert size={32} color="#dc2626" />

        <h2>Permission required</h2>

        <p>
          Your account does not have permission
          to register or edit households.
        </p>

        <Link to="/households">
          Back to Households
        </Link>
      </div>
    );
  }

  const handleSave = async (formData) => {
    setSaving(true);

    try {
      const saved = await registerHousehold(formData);
      setResult(saved);
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="ca-registration-page">
        <section className="ca-registration-success">
          <CheckCircle2 size={48} />

          <h1>Household registered successfully</h1>

          <p>
            The location, family, and individual
            records have been saved to Supabase.
          </p>

          <div className="ca-success-details">
            <div>
              <span>Location Code</span>
              <strong>{result.location_code}</strong>
            </div>

            <div>
              <span>Family Code</span>
              <strong>{result.family_code}</strong>
            </div>

            <div>
              <span>Family Members</span>
              <strong>{result.member_count}</strong>
            </div>
          </div>

          <div className="ca-success-links">
            <Link
              to="/map"
              className="ca-save-household"
            >
              <MapPinned size={18} />
              Open Map
            </Link>

            <Link
              to="/households"
              className="ca-outline-link"
            >
              <House size={18} />
              View Households
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="ca-registration-page">
      <Link
        to="/map"
        className="ca-registration-back"
      >
        <ArrowLeft size={17} />
        Back to Map Explorer
      </Link>

      <div className="ca-registration-heading">
        <span>HOUSEHOLD MANAGEMENT</span>
        <h1>Register New Household</h1>

        <p>
          Enter a family's details and associated
          members. Required fields are marked
          with an asterisk.
        </p>
      </div>

      <HouseholdForm
        selectedPoint={selectedPoint}
        existingLocation={existingLocation}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
}
