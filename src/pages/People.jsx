
import { useEffect, useState } from "react";
import { UserRound, AlertCircle } from "lucide-react";
import { getIndividuals } from "../services/peopleService";

export default function People() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPeople() {
      try {
        const data = await getIndividuals();

        if (active) setPeople(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPeople();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="records-page">
      <div className="section-heading">
        <div>
          <h2>People Directory</h2>
          <p>Registered individuals and families</p>
        </div>
      </div>

      {loading && (
        <div className="page-card">
          Loading individuals...
        </div>
      )}

      {error && (
        <div className="page-card" role="alert">
          <AlertCircle size={22} color="#dc2626" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && people.length === 0 && (
        <div className="page-card">
          <h2>No individuals registered</h2>
          <p>No person records were found.</p>
        </div>
      )}

      {!loading && !error && people.length > 0 && (
        <>
          <p className="records-count">
            Showing {people.length} individuals
          </p>

          <div className="records-grid">
            {people.map((person) => (
              <article className="record-card" key={person.id}>
                <div className="record-icon">
                  <UserRound size={23} />
                </div>

                <div className="record-content">
                  <h3>{person.full_name}</h3>
                  <span>{person.person_code}</span>

                  <p>
                    Family: {person.family?.family_name ||
                      "Unknown"}
                  </p>

                  {person.is_head && (
                    <span className="record-tag">
                      Head of family
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
