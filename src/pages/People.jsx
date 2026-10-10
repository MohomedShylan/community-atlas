
import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router";

import {
  Users,
  Search,
  UserPlus,
  House,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getActiveFamilies,
  getPeoplePage,
} from "../services/peopleService";

const PAGE_SIZE = 12;

export default function People() {
  const { profile } = useAuth();

  const canEdit =
    profile?.role === "admin" ||
    profile?.role === "editor";

  const [families, setFamilies] = useState([]);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("");

  const [page, setPage] = useState(1);

  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [familyError, setFamilyError] =
    useState("");

  // ----------------------------------------
  // Load family filter options
  // ----------------------------------------

  useEffect(() => {
    let active = true;

    getActiveFamilies()
      .then((data) => {
        if (active) setFamilies(data);
      })
      .catch((err) => {
        if (active) setFamilyError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  // ----------------------------------------
  // Debounce search to reduce API requests
  // ----------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ----------------------------------------
  // Load people from Supabase
  // ----------------------------------------

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getPeoplePage({
      page,
      pageSize: PAGE_SIZE,
      search,
      familyId,
    })
      .then((result) => {
        if (!active) return;

        setPeople(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
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
  }, [page, search, familyId]);

  function handleFamilyChange(event) {
    setFamilyId(event.target.value);
    setPage(1);
  }

  const firstItem =
    total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(
    page * PAGE_SIZE,
    total
  );

  return (
    <div className="records-page ca-people-page">
      {/* PAGE HEADER */}
      <header className="section-heading ca-people-heading">
        <div>
          <span className="ca-ind-eyebrow">
            COMMUNITY RECORDS
          </span>

          <h2>People Management</h2>

          <p>
            Search registered individuals
            and their associated families.
          </p>
        </div>

        {canEdit && (
          <Link
            to="/people/new"
            className="ca-ind-primary"
          >
            <UserPlus size={18} />
            Register Individual
          </Link>
        )}
      </header>

      {/* SEARCH AND FILTERS */}
      <section className="ca-people-filters">
        <div className="ca-people-search">
          <Search size={18} />

          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Search person name or code"
            aria-label="Search individuals"
          />
        </div>

        <select
          value={familyId}
          onChange={handleFamilyChange}
          aria-label="Filter by family"
        >
          <option value="">
            All Families
          </option>

          {families.map((family) => (
            <option
              key={family.id}
              value={family.id}
            >
              {family.family_code}
              {" — "}
              {family.family_name}
            </option>
          ))}
        </select>
      </section>

      {familyError && (
        <div
          className="ca-ind-alert"
          role="alert"
        >
          <AlertCircle size={17} />
          Family filter: {familyError}
        </div>
      )}

      {/* SUMMARY */}
      <div className="ca-people-summary">
        <div>
          <Users size={19} />

          <span>
            {loading
              ? "Loading people..."
              : `${total} matching individuals`}
          </span>
        </div>

        <span>
          Page {page} of {totalPages}
        </span>
      </div>

      {/* LOADING / ERROR */}
      {loading && (
        <div
          className="page-card"
          role="status"
        >
          Loading registered individuals...
        </div>
      )}

      {error && (
        <div
          className="page-card"
          role="alert"
        >
          <AlertCircle
            size={22}
            color="#dc2626"
          />

          <p>{error}</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading &&
        !error &&
        people.length === 0 && (
          <div className="ca-ind-state">
            <Users size={42} />

            <h2>No Individuals Found</h2>

            <p>
              Try changing your search or
              family filter.
            </p>

            {canEdit && (
              <Link
                to="/people/new"
                className="ca-ind-primary"
              >
                Register Individual
              </Link>
            )}
          </div>
        )}

      {/* PEOPLE GRID */}
      {!loading &&
        !error &&
        people.length > 0 && (
          <>
            <div className="ca-people-grid">
              {people.map((person) => (
                <article
                  key={person.id}
                  className="ca-person-card"
                >
                  <div className="ca-person-top">
                    <div className="ca-person-avatar">
                      <Users size={22} />
                    </div>

                    <div className="ca-person-identity">
                      <h3>
                        {person.full_name}
                      </h3>

                      <span>
                        {person.person_code}
                      </span>
                    </div>
                  </div>

                  {person.is_head && (
                    <span className="ca-person-head">
                      Head of Family
                    </span>
                  )}

                  <div className="ca-person-details">
                    <p>
                      <House size={16} />

                      <span>
                        {person.family?.family_name ||
                          "Family unavailable"}
                      </span>
                    </p>

                    <p>
                      <Users size={16} />

                      <span>
                        {person.relationship_to_head ||
                          "Relationship not recorded"}
                      </span>
                    </p>

                    <p>
                      <MapPin size={16} />

                      <span>
                        {[
                          person.family?.location
                            ?.village,
                          person.family?.location
                            ?.district,
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          "Location unavailable"}
                      </span>
                    </p>

                    {person.date_of_birth && (
                      <p>
                        <CalendarDays size={16} />

                        <span>
                          Born: {person.date_of_birth}
                        </span>
                      </p>
                    )}
                  </div>

                  <Link
                    className="ca-person-family-link"
                    to={`/households/${person.family_id}`}
                  >
                    View Household
                    <ChevronRight size={16} />
                  </Link>
                </article>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="ca-people-pagination">
              <span>
                Showing {firstItem}–{lastItem}
                {" of "}
                {total}
              </span>

              <div>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <strong>
                  {page} / {totalPages}
                </strong>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                    )
                  }
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
