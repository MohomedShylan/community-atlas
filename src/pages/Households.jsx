
import { useEffect, useState } from "react";
import { House, MapPin, AlertCircle } from "lucide-react";
import { Link } from "react-router";
import useAuth from "../hooks/useAuth";
import { getHouseholds } from "../services/householdService";

export default function Households() {
  const { profile } = useAuth();
  const canRegister = profile?.role === "admin" || profile?.role === "editor";

  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHouseholds() {
      try {
        const data = await getHouseholds();

        if (active) setHouseholds(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHouseholds();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="records-page">
      <div className="section-heading">
        <div>
          <h2>Households</h2>
          <p>Family records from Supabase</p>
        </div>

        {canRegister && (
          <Link to="/map" className="ca-outline-link">
            <MapPin size={17} />
            Register from Map
          </Link>
        )}
      </div>

      {loading && (
        <div className="page-card">
          Loading households...
        </div>
      )}

      {error && (
        <div className="page-card" role="alert">
          <AlertCircle size={22} color="#dc2626" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && households.length === 0 && (
        <div className="page-card">
          <h2>No families registered</h2>
          <p>Your database is currently empty.</p>
        </div>
      )}

      {!loading && !error && households.length > 0 && (
        <>
          <p className="records-count">
            Showing {households.length} most recent families
          </p>

          <div className="records-grid">
            {households.map((family) => (
              <article className="record-card" key={family.id}>
                <div className="record-icon">
                  <House size={23} />
                </div>

                <div className="record-content">
                  <h3>{family.family_name}</h3>
                  <span>{family.family_code}</span>

                  <p>
                    <MapPin size={15} />
                    {family.location?.address_line ||
                      "No address recorded"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
