
import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  ArrowLeft,
  Archive,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getArchivedIndividuals,
} from "../services/individualManagementService";

const PAGE_SIZE = 12;

export default function ArchivedIndividuals() {
  const { profile } = useAuth();

  const isAdmin =
    profile?.role === "admin" &&
    profile?.is_active === true;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD ARCHIVED INDIVIDUALS
  // ==========================================

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadArchivedIndividuals() {
      setLoading(true);
      setError("");

      try {
        const result = await getArchivedIndividuals({
          page,
          pageSize: PAGE_SIZE,
        });

        if (!active) return;

        setItems(result.items ?? []);
        setTotal(result.total ?? 0);
        setTotalPages(result.totalPages ?? 1);
      } catch (err) {
        if (!active) return;

        setError(
          err.message ||
          "Failed to load archived individuals."
        );

        setItems([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadArchivedIndividuals();

    return () => {
      active = false;
    };
  }, [isAdmin, page]);

  // ==========================================
  // PERMISSION SCREEN
  // ==========================================

  if (!isAdmin) {
    return (
      <div className="ca-pm-page">
        <section className="ca-pm-state">
          <ShieldAlert size={42} />

          <h2>Administrator Access Required</h2>

          <p>
            Only Administrators can view and
            restore archived individuals.
          </p>

          <Link
            to="/people"
            className="ca-pm-secondary"
          >
            Back to People
          </Link>
        </section>
      </div>
    );
  }

  // ==========================================
  // ARCHIVED INDIVIDUALS PAGE
  // ==========================================

  return (
    <div className="ca-pm-page">

      {/* BACK BUTTON */}
      <Link
        to="/people"
        className="ca-pm-back"
      >
        <ArrowLeft size={17} />
        Back to People
      </Link>

      {/* HEADER */}
      <header className="ca-pm-header">
        <div className="ca-pm-avatar">
          <Archive size={28} />
        </div>

        <div>
          <span className="ca-pm-eyebrow">
            ADMINISTRATOR MANAGEMENT
          </span>

          <h1>Archived Individuals</h1>

          <p>
            {total} archived individual records
          </p>
        </div>
      </header>

      {/* LOADING */}
      {loading && (
        <section
          className="ca-pm-state"
          role="status"
        >
          Loading archived individuals...
        </section>
      )}

      {/* ERROR */}
      {error && !loading && (
        <div
          className="ca-pm-error"
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading &&
        !error &&
        items.length === 0 && (
          <section className="ca-pm-state">
            <Archive size={42} />

            <h2>No Archived Individuals</h2>

            <p>
              There are no archived records
              to display.
            </p>
          </section>
        )}

      {/* ARCHIVED RECORDS */}
      {!loading &&
        !error &&
        items.length > 0 && (
          <>
            <div className="ca-pm-archived-list">
              {items.map((person) => (
                <article
                  key={person.id}
                  className="ca-pm-archived-item"
                >
                  <div>
                    <h3>{person.full_name}</h3>

                    <p>
                      {person.person_code}
                      {" · "}
                      {person.family?.family_name ||
                        "Family unavailable"}
                    </p>

                    {person.family?.is_archived && (
                      <span className="ca-pm-status is-archived">
                        Household also archived
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/people/${person.id}/manage`}
                    className="ca-pm-secondary"
                  >
                    <Archive size={16} />
                    Manage / Restore
                  </Link>
                </article>
              ))}
            </div>

            {/* PAGINATION */}
            <nav
              className="ca-pm-pagination"
              aria-label="Archived people pagination"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => current - 1)
                }
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next
                <ChevronRight size={17} />
              </button>
            </nav>
          </>
        )}

    </div>
  );
}
