
import { useEffect, useState } from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import {
  ArrowLeft,
  CheckCircle2,
  UserRoundPlus,
  Users,
  House,
  ShieldAlert,
  AlertCircle,
  Plus,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import IndividualForm from
  "../components/people/IndividualForm";

import {
  getActiveFamilies,
  registerIndividual,
} from "../services/peopleService";

export default function RegisterIndividual() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();

  const preferredFamilyId =
    searchParams.get("familyId") || "";

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "editor";

  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadFamilies() {
      try {
        const data = await getActiveFamilies();

        if (active) {
          setFamilies(data);
        }
      } catch (err) {
        if (active) {
          setLoadError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFamilies();

    return () => {
      active = false;
    };
  }, [canEdit]);

  async function handleSave(formData) {
    if (!canEdit || saving) {
      throw new Error(
        "Registration is not available."
      );
    }

    setSaving(true);

    try {
      const saved = await registerIndividual(
        formData
      );

      setResult(saved);
    } finally {
      setSaving(false);
    }
  }

  function registerAnother() {
    setResult(null);
    setFormVersion((value) => value + 1);
  }

  // ========================================
  // PERMISSION REQUIRED
  // ========================================

  if (!canEdit) {
    return (
      <div className="ca-ind-page">
        <div className="ca-ind-state">
          <ShieldAlert size={44} />

          <h2>Permission Required</h2>

          <p>
            Only approved Administrators and
            Editors can register individuals.
          </p>

          <Link
            to="/people"
            className="ca-ind-outline"
          >
            Return to People
          </Link>
        </div>
      </div>
    );
  }

  // ========================================
  // SUCCESS SCREEN
  // ========================================

  if (result) {
    return (
      <div className="ca-ind-page">
        <section className="ca-ind-success">
          <CheckCircle2 size={53} />

          <h1>
            Individual Registered Successfully
          </h1>

          <p>
            The new individual has been saved
            to your Supabase database.
          </p>

          <div className="ca-ind-success-grid">
            <div>
              <span>Person Code</span>
              <strong>
                {result.person_code}
              </strong>
            </div>

            <div>
              <span>Full Name</span>
              <strong>
                {result.full_name}
              </strong>
            </div>

            <div>
              <span>Family</span>
              <strong>
                {result.family_code}
              </strong>
            </div>
          </div>

          <div className="ca-ind-success-actions">
            <button
              type="button"
              className="ca-ind-primary"
              onClick={registerAnother}
            >
              <Plus size={18} />
              Register Another Person
            </button>

            <Link
              className="ca-ind-outline"
              to="/people"
            >
              <Users size={18} />
              View People Directory
            </Link>

            <Link
              className="ca-ind-outline"
              to={`/households/${result.family_id}`}
            >
              <House size={18} />
              View Family
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ========================================
  // REGISTRATION PAGE
  // ========================================

  return (
    <div className="ca-ind-page">
      <Link
        className="ca-ind-back"
        to="/people"
      >
        <ArrowLeft size={17} />
        Back to People
      </Link>

      <header className="ca-ind-page-heading">
        <span>
          COMMUNITY ATLAS / PEOPLE MANAGEMENT
        </span>

        <h1>Register New Individual</h1>

        <p>
          Register a person under an existing
          household. Required information is
          marked with an asterisk (*).
        </p>
      </header>

      {loading && (
        <div
          className="ca-ind-state"
          role="status"
        >
          Loading available families...
        </div>
      )}

      {loadError && (
        <div
          className="ca-ind-alert"
          role="alert"
        >
          <AlertCircle size={18} />
          {loadError}
        </div>
      )}

      {!loading &&
        !loadError &&
        families.length === 0 && (
          <div className="ca-ind-state">
            <House size={41} />

            <h2>
              No Active Families Available
            </h2>

            <p>
              Register a household using
              Map Explorer before adding
              individuals.
            </p>

            <Link
              to="/map"
              className="ca-ind-primary"
            >
              Open Map Explorer
            </Link>
          </div>
        )}

      {!loading &&
        !loadError &&
        families.length > 0 && (
          <IndividualForm
            key={formVersion}
            families={families}
            initialFamilyId={
              preferredFamilyId
            }
            saving={saving}
            onSave={handleSave}
          />
        )}
    </div>
  );
}
