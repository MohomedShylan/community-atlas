
import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  ArrowLeft,
  AlertCircle,
  UserRound,
  Users,
  House,
  MapPin,
  CalendarDays,
  Phone,
  FileText,
  BadgeCheck,
  ChevronRight,
  RefreshCw,
  UserPlus,
  MapPinned,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getIndividualProfile,
} from "../services/personProfileService";

// ==========================================
// HELPERS
// ==========================================

function formatDate(dateString) {
  if (!dateString) {
    return "Not recorded";
  }

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-LK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function calculateAge(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - year;

  const birthdayNotReached =
    today.getMonth() + 1 < month ||
    (
      today.getMonth() + 1 === month &&
      today.getDate() < day
    );

  if (birthdayNotReached) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatGender(gender) {
  const labels = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };

  return labels[gender] || "Not recorded";
}

function ProfileField({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="ca-ip-field">
      <div className="ca-ip-field-icon">
        <Icon size={18} />
      </div>

      <div>
        <dt>{label}</dt>

        <dd>
          {value === null ||
          value === undefined ||
          value === ""
            ? "Not recorded"
            : value}
        </dd>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PROFILE PAGE
// ==========================================

export default function IndividualProfile() {
  const { personId } = useParams();
  const { profile } = useAuth();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const canRegister =
    profile?.role === "admin" ||
    profile?.role === "editor";

  // ----------------------------------------
  // Load the selected individual
  // ----------------------------------------

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setRecord(null);

    getIndividualProfile(personId)
      .then((data) => {
        if (active) {
          setRecord(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [personId, revision]);

  // ----------------------------------------
  // Loading state
  // ----------------------------------------

  if (loading) {
    return (
      <div
        className="page-card ca-ip-state"
        role="status"
      >
        Loading individual profile...
      </div>
    );
  }

  // ----------------------------------------
  // Error state
  // ----------------------------------------

  if (error) {
    return (
      <div className="ca-ip-page">
        <Link
          to="/people"
          className="ca-ip-back"
        >
          <ArrowLeft size={17} />
          Back to People
        </Link>

        <section
          className="ca-ip-state"
          role="alert"
        >
          <AlertCircle size={38} />

          <h2>Unable to Load Profile</h2>

          <p>{error}</p>

          <button
            type="button"
            className="ca-ip-button"
            onClick={() =>
              setRevision((value) => value + 1)
            }
          >
            <RefreshCw size={17} />
            Try Again
          </button>
        </section>
      </div>
    );
  }

  // ----------------------------------------
  // Missing / archived person
  // ----------------------------------------

  if (!record) {
    return (
      <div className="ca-ip-page">
        <Link
          to="/people"
          className="ca-ip-back"
        >
          <ArrowLeft size={17} />
          Back to People
        </Link>

        <section className="ca-ip-state">
          <UserRound size={42} />

          <h2>Individual Not Available</h2>

          <p>
            This record could not be found,
            has been archived, or is not
            available to your account.
          </p>

          <Link
            to="/people"
            className="ca-ip-button"
          >
            Return to People
          </Link>
        </section>
      </div>
    );
  }

  const {
    person,
    family,
    location,
    relatedMembers,
  } = record;

  const age = calculateAge(
    person.date_of_birth
  );

  const hasCoordinates =
    location.latitude !== null &&
    location.latitude !== undefined &&
    location.longitude !== null &&
    location.longitude !== undefined &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude));

  const mapUrl =
    `/map?locationId=${encodeURIComponent(location.id)}`;

  const address = [
    location.address_line,
    location.village,
    location.district,
  ]
    .filter(Boolean)
    .join(", ");

  const phoneHref = person.phone
    ? person.phone.replace(/[^\d+]/g, "")
    : "";

  // ----------------------------------------
  // Profile interface
  // ----------------------------------------

  return (
    <div className="ca-ip-page">
      <Link
        to="/people"
        className="ca-ip-back"
      >
        <ArrowLeft size={17} />
        Back to People Directory
      </Link>

      {/* PROFILE HEADER */}
      <header className="ca-ip-header">
        <div className="ca-ip-avatar">
          <UserRound size={35} />
        </div>

        <div className="ca-ip-header-info">
          <span className="ca-ip-eyebrow">
            INDIVIDUAL PROFILE
          </span>

          <h1>{person.full_name}</h1>

          <div className="ca-ip-tags">
            <span className="ca-ip-code">
              {person.person_code}
            </span>

            {person.is_head && (
              <span className="ca-ip-head-badge">
                <BadgeCheck size={14} />
                Head of Family
              </span>
            )}
          </div>
        </div>

        <div className="ca-ip-header-actions">
          <Link
            className="ca-ip-button-secondary"
            to={`/households/${family.id}`}
          >
            <House size={17} />
            View Household
          </Link>

          {hasCoordinates && (
            <Link
              className="ca-ip-button"
              to={mapUrl}
            >
              <MapPin size={17} />
              View on Map
            </Link>
          )}
        </div>
      </header>

      <div className="ca-ip-layout">
        {/* MAIN COLUMN */}
        <div className="ca-ip-main">
          {/* PERSONAL INFORMATION */}
          <section className="ca-ip-card">
            <div className="ca-ip-card-heading">
              <UserRound size={21} />
              <h2>Personal Information</h2>
            </div>

            <dl className="ca-ip-fields-grid">
              <ProfileField
                icon={UserRound}
                label="Full Name"
                value={person.full_name}
              />

              <ProfileField
                icon={BadgeCheck}
                label="Person Code"
                value={person.person_code}
              />

              <ProfileField
                icon={CalendarDays}
                label="Date of Birth"
                value={formatDate(
                  person.date_of_birth
                )}
              />

              <ProfileField
                icon={CalendarDays}
                label="Age"
                value={
                  age === null
                    ? "Not recorded"
                    : `${age} years`
                }
              />

              <ProfileField
                icon={UserRound}
                label="Gender"
                value={formatGender(
                  person.gender
                )}
              />

              <ProfileField
                icon={Users}
                label="Relationship to Head"
                value={
                  person.relationship_to_head
                }
              />

              <ProfileField
                icon={Phone}
                label="Contact Number"
                value={
                  phoneHref ? (
                    <a href={`tel:${phoneHref}`}>
                      {person.phone}
                    </a>
                  ) : (
                    "Not recorded"
                  )
                }
              />

              <ProfileField
                icon={House}
                label="Family Role"
                value={
                  person.is_head
                    ? "Head of Family"
                    : "Family Member"
                }
              />
            </dl>
          </section>

          {/* ADDITIONAL NOTES */}
          <section className="ca-ip-card">
            <div className="ca-ip-card-heading">
              <FileText size={21} />
              <h2>Additional Notes</h2>
            </div>

            <p className="ca-ip-notes">
              {person.notes ||
                "No additional notes have been recorded."}
            </p>
          </section>

          {/* OTHER FAMILY MEMBERS */}
          <section className="ca-ip-card">
            <div className="ca-ip-card-heading">
              <Users size={21} />
              <h2>Other Family Members</h2>
            </div>

            <p className="ca-ip-muted">
              {relatedMembers.length}
              {" other active "}
              {relatedMembers.length === 1
                ? "member"
                : "members"}
              {" registered in this family."}
            </p>

            {relatedMembers.length === 0 ? (
              <p className="ca-ip-muted">
                No other active family members
                are registered.
              </p>
            ) : (
              <div className="ca-ip-member-list">
                {relatedMembers.map((member) => (
                  <Link
                    key={member.id}
                    className="ca-ip-member"
                    to={`/people/${member.id}`}
                  >
                    <div className="ca-ip-member-avatar">
                      <UserRound size={18} />
                    </div>

                    <div className="ca-ip-member-text">
                      <strong>
                        {member.full_name}
                      </strong>

                      <span>
                        {member.person_code}
                        {" · "}
                        {member.is_head
                          ? "Head of Family"
                          : member.relationship_to_head ||
                            "Family Member"}
                      </span>
                    </div>

                    <ChevronRight size={17} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="ca-ip-sidebar">
          {/* FAMILY CARD */}
          <section className="ca-ip-card">
            <div className="ca-ip-card-heading">
              <House size={21} />
              <h2>Registered Family</h2>
            </div>

            <div className="ca-ip-family-summary">
              <div className="ca-ip-family-icon">
                <House size={26} />
              </div>

              <h3>{family.family_name}</h3>

              <span>{family.family_code}</span>
            </div>

            <div className="ca-ip-stat">
              <Users size={17} />

              <span>Active family members</span>

              <strong>
                {relatedMembers.length + 1}
              </strong>
            </div>

            <Link
              className="ca-ip-sidebar-link"
              to={`/households/${family.id}`}
            >
              View Complete Household
              <ChevronRight size={17} />
            </Link>

            {canRegister && (
              <Link
                className="ca-ip-sidebar-link"
                to={
                  `/people/new?familyId=${encodeURIComponent(family.id)}`
                }
              >
                <UserPlus size={17} />
                Register Family Member
              </Link>
            )}
          </section>

          {/* LOCATION CARD */}
          <section className="ca-ip-card">
            <div className="ca-ip-card-heading">
              <MapPinned size={21} />
              <h2>Household Location</h2>
            </div>

            <div className="ca-ip-location">
              <span className="ca-ip-code">
                {location.location_code}
              </span>

              <p>
                <MapPin size={17} />
                {address || "Address not recorded"}
              </p>

              <div className="ca-ip-coordinates">
                <small>GPS COORDINATES</small>

                <strong>
                  {hasCoordinates
                    ? `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`
                    : "Not recorded"}
                </strong>
              </div>
            </div>

            {hasCoordinates ? (
              <Link
                className="ca-ip-button ca-ip-map-link"
                to={mapUrl}
              >
                <MapPin size={17} />
                View Household on Map
              </Link>
            ) : (
              <p className="ca-ip-muted">
                No GPS coordinates are available
                for this household.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
