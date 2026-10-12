
import {
  useEffect,
  useMemo,
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
  SlidersHorizontal,
  RotateCcw,
  Archive,
  UserRound,
  ArrowDownWideNarrow,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  searchPeople,
  getPeopleSearchOptions,
} from "../services/peopleSearchService";

const PAGE_SIZE = 12;

const emptyOptions = {
  families: [],
  districts: [],
  villages: [],
};

export default function People() {
  const { profile } = useAuth();

  const isAdmin =
    profile?.role === "admin";

  const canEdit =
    isAdmin ||
    profile?.role === "editor";

  // ========================================
  // SEARCH AND FILTER STATES
  // ========================================

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [familyId, setFamilyId] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [village, setVillage] =
    useState("");

  const [ageGroup, setAgeGroup] =
    useState("all");

  const [gender, setGender] =
    useState("all");

  const [status, setStatus] =
    useState("active");

  const [sort, setSort] =
    useState("name_asc");

  const [page, setPage] =
    useState(1);

  const [showFilters, setShowFilters] =
    useState(true);

  // ========================================
  // DATA STATES
  // ========================================

  const [options, setOptions] =
    useState(emptyOptions);

  const [people, setPeople] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [optionsError, setOptionsError] =
    useState("");

  // ========================================
  // LOAD FILTER OPTIONS
  // ========================================

  useEffect(() => {
    let active = true;

    getPeopleSearchOptions()
      .then((data) => {
        if (active) {
          setOptions(data);
        }
      })
      .catch((err) => {
        if (active) {
          setOptionsError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // DEBOUNCED SEARCH
  // ========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ========================================
  // RESTRICT STATUS FILTER FOR NON-ADMINS
  // ========================================

  useEffect(() => {
    if (!isAdmin && status !== "active") {
      setStatus("active");
      setPage(1);
    }
  }, [isAdmin, status]);

  // ========================================
  // FETCH SEARCH RESULTS
  // ========================================

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    searchPeople({
      search,
      familyId,
      district,
      village,
      ageGroup,
      gender,

      status:
        isAdmin ? status : "active",

      sort,
      page,
      pageSize: PAGE_SIZE,
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
          setPeople([]);
          setTotal(0);
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
  }, [
    search,
    familyId,
    district,
    village,
    ageGroup,
    gender,
    status,
    sort,
    page,
    isAdmin,
  ]);

  // ========================================
  // AVAILABLE VILLAGES BY DISTRICT
  // ========================================

  const availableVillages = useMemo(
    () =>
      options.villages.filter(
        (item) =>
          !district ||
          item.district.toLowerCase() ===
            district.toLowerCase()
      ),
    [options.villages, district]
  );

  // ========================================
  // FILTER HELPERS
  // ========================================

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function changeDistrict(value) {
    setDistrict(value);
    setVillage("");
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");

    setFamilyId("");
    setDistrict("");
    setVillage("");

    setAgeGroup("all");
    setGender("all");
    setStatus("active");
    setSort("name_asc");

    setPage(1);
  }

  const hasFilters =
    searchInput.trim() !== "" ||
    familyId !== "" ||
    district !== "" ||
    village !== "" ||
    ageGroup !== "all" ||
    gender !== "all" ||
    status !== "active" ||
    sort !== "name_asc";

  const firstItem =
    total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(
    page * PAGE_SIZE,
    total
  );

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="records-page ca-adv-page">
      {/* PAGE HEADER */}
      <header className="section-heading ca-adv-header">
        <div>
          <span className="ca-ind-eyebrow">
            COMMUNITY RECORDS
          </span>

          <h2>People Management</h2>

          <p>
            Search, explore, and manage
            registered individuals.
          </p>
        </div>

        <div className="ca-adv-header-actions">
          {isAdmin && (
            <Link
              to="/people/archived"
              className="ca-adv-outline"
            >
              <Archive size={17} />
              Archived People
            </Link>
          )}

          {canEdit && (
            <Link
              to="/people/new"
              className="ca-ind-primary"
            >
              <UserPlus size={18} />
              Register Individual
            </Link>
          )}
        </div>
      </header>

      {/* MAIN SEARCH */}
      <section className="ca-adv-search-panel">
        <div className="ca-adv-search-row">
          <div className="ca-adv-search-field">
            <Search size={19} />

            <input
              type="search"
              value={searchInput}
              maxLength={120}
              placeholder="Search name, person code, family or address..."
              aria-label="Search registered people"
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="ca-adv-filter-toggle"
            aria-expanded={showFilters}
            onClick={() =>
              setShowFilters((current) => !current)
            }
          >
            <SlidersHorizontal size={17} />
            Filters
          </button>
        </div>

        {/* ADVANCED FILTERS */}
        {showFilters && (
          <div className="ca-adv-filters">
            {/* FAMILY */}
            <label>
              Family
              <select
                value={familyId}
                onChange={(event) =>
                  changeFilter(
                    setFamilyId,
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Families
                </option>

                {options.families.map((family) => (
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
            </label>

            {/* DISTRICT */}
            <label>
              District
              <select
                value={district}
                onChange={(event) =>
                  changeDistrict(event.target.value)
                }
              >
                <option value="">
                  All Districts
                </option>

                {options.districts.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            {/* VILLAGE */}
            <label>
              Village
              <select
                value={village}
                onChange={(event) =>
                  changeFilter(
                    setVillage,
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Villages
                </option>

                {availableVillages.map((item) => (
                  <option
                    key={`${item.district}-${item.name}`}
                    value={item.name}
                  >
                    {item.name}
                    {!district && item.district
                      ? ` (${item.district})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* AGE */}
            <label>
              Age Group
              <select
                value={ageGroup}
                onChange={(event) =>
                  changeFilter(
                    setAgeGroup,
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Ages
                </option>
                <option value="child">
                  Children (0–17)
                </option>
                <option value="adult">
                  Adults (18–59)
                </option>
                <option value="senior">
                  Seniors (60+)
                </option>
                <option value="unknown">
                  Date of Birth Unknown
                </option>
              </select>
            </label>

            {/* GENDER */}
            <label>
              Gender
              <select
                value={gender}
                onChange={(event) =>
                  changeFilter(
                    setGender,
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All / Not Filtered
                </option>
                <option value="male">
                  Male
                </option>
                <option value="female">
                  Female
                </option>
                <option value="other">
                  Other
                </option>
                <option value="prefer_not_to_say">
                  Prefer not to say
                </option>
                <option value="unspecified">
                  Not Recorded
                </option>
              </select>
            </label>

            {/* STATUS */}
            {isAdmin && (
              <label>
                Record Status
                <select
                  value={status}
                  onChange={(event) =>
                    changeFilter(
                      setStatus,
                      event.target.value
                    )
                  }
                >
                  <option value="active">
                    Active Only
                  </option>
                  <option value="archived">
                    Archived Only
                  </option>
                  <option value="all">
                    Active and Archived
                  </option>
                </select>
              </label>
            )}

            {/* SORT */}
            <label>
              Sort Results
              <select
                value={sort}
                onChange={(event) =>
                  changeFilter(
                    setSort,
                    event.target.value
                  )
                }
              >
                <option value="name_asc">
                  Name A–Z
                </option>
                <option value="name_desc">
                  Name Z–A
                </option>
                <option value="code_asc">
                  Person Code
                </option>
                <option value="youngest">
                  Youngest First
                </option>
                <option value="oldest">
                  Oldest First
                </option>
              </select>
            </label>
          </div>
        )}

        {/* RESET BUTTON */}
        {hasFilters && (
          <div className="ca-adv-filter-footer">
            <button
              type="button"
              onClick={resetFilters}
            >
              <RotateCcw size={16} />
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {optionsError && (
        <div
          className="ca-ind-alert"
          role="alert"
        >
          <AlertCircle size={18} />
          Could not load filter options:
          {" "}
          {optionsError}
        </div>
      )}

      {/* RESULT SUMMARY */}
      <div className="ca-adv-summary">
        <div>
          <Users size={19} />

          <strong>
            {loading
              ? "Searching..."
              : `${total} matching people`}
          </strong>
        </div>

        <div>
          <ArrowDownWideNarrow size={16} />
          Page {page} of {totalPages}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          className="page-card"
          role="status"
        >
          Searching individual records...
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
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

      {/* EMPTY RESULTS */}
      {!loading &&
        !error &&
        people.length === 0 && (
          <div className="ca-ind-state">
            <Search size={42} />

            <h2>No Matching Individuals</h2>

            <p>
              Try another name, family, district,
              or age group.
            </p>

            <button
              type="button"
              className="ca-adv-outline"
              onClick={resetFilters}
            >
              <RotateCcw size={17} />
              Reset Search
            </button>
          </div>
        )}

      {/* SEARCH RESULTS */}
      {!loading &&
        !error &&
        people.length > 0 && (
          <>
            <div className="ca-people-grid">
              {people.map((person) => (
                <article
                  className="ca-person-card"
                  key={person.id}
                >
                  <div className="ca-person-top">
                    <div className="ca-person-avatar">
                      <UserRound size={22} />
                    </div>

                    <div className="ca-person-identity">
                      <h3>{person.full_name}</h3>
                      <span>{person.person_code}</span>
                    </div>
                  </div>

                  <div className="ca-adv-badges">
                    {person.is_archived && (
                      <span className="ca-adv-archived">
                        Archived
                      </span>
                    )}

                    {person.is_head &&
                      !person.is_archived && (
                        <span className="ca-person-head">
                          Head of Family
                        </span>
                      )}
                  </div>

                  <div className="ca-person-details">
                    <p>
                      <House size={16} />
                      <span>
                        {person.family.family_name}
                        {" · "}
                        {person.family.family_code}
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
                          person.family.location.village,
                          person.family.location.district,
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          "Location not recorded"}
                      </span>
                    </p>

                    <p>
                      <CalendarDays size={16} />
                      <span>
                        {person.age_years === null
                          ? "Age not recorded"
                          : `${person.age_years} years`}
                      </span>
                    </p>
                  </div>

                  {/* PROFILE NAVIGATION */}
                  <div className="ca-ip-directory-actions">
                    {person.is_archived ? (
                      isAdmin && (
                        <Link
                          className="ca-ip-directory-profile"
                          to={`/people/${person.id}/manage`}
                        >
                          <Archive size={16} />
                          Manage / Restore
                          <ChevronRight size={16} />
                        </Link>
                      )
                    ) : (
                      <Link
                        className="ca-ip-directory-profile"
                        to={`/people/${person.id}`}
                      >
                        <UserRound size={16} />
                        View Profile
                        <ChevronRight size={16} />
                      </Link>
                    )}

                    <Link
                      className="ca-person-family-link"
                      to={`/households/${person.family_id}`}
                    >
                      <House size={16} />
                      View Household
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* SERVER-SIDE PAGINATION */}
            <nav
              className="ca-adv-pagination"
              aria-label="People search pages"
            >
              <span>
                Showing {firstItem}–{lastItem}
                {" of "}
                {total} people
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    loading || page <= 1
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1)
                    )
                  }
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
                    loading || page >= totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      current + 1
                    )
                  }
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </nav>
          </>
        )}
    </div>
  );
}
