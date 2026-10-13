
import { useEffect, useMemo, useState } from "react";
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
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ArrowDownWideNarrow,
  Eye,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  searchPeople,
  getPeopleSearchOptions,
} from "../services/peopleSearchService";

import {
  archiveIndividual,
  restoreIndividual,
} from "../services/individualManagementService";

const PAGE_SIZE = 12;

const EMPTY_OPTIONS = {
  families: [],
  districts: [],
  villages: [],
};

export default function People() {
  const { profile } = useAuth();

  // ========================================
  // PERMISSIONS
  // ========================================

  const isAdmin =
    profile?.is_active === true &&
    profile?.role === "admin";

  const canEdit =
    profile?.is_active === true &&
    (
      profile?.role === "admin" ||
      profile?.role === "editor"
    );

  // ========================================
  // FILTER OPTIONS
  // ========================================

  const [options, setOptions] =
    useState(EMPTY_OPTIONS);

  const [optionsError, setOptionsError] =
    useState("");

  // ========================================
  // SEARCH AND FILTER STATES
  // ========================================

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");

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

  const [showFilters, setShowFilters] =
    useState(true);

  const [page, setPage] = useState(1);

  // ========================================
  // DIRECTORY DATA
  // ========================================

  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [busyPersonId, setBusyPersonId] =
    useState(null);

  // ========================================
  // REMOVE PERSON DIALOG
  // ========================================

  const [removeTarget, setRemoveTarget] =
    useState(null);

  const [confirmCode, setConfirmCode] =
    useState("");

  // ========================================
  // 1. LOAD FILTER OPTIONS
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
  // 2. DEBOUNCED SEARCH
  // ========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ========================================
  // 3. RESTRICT ARCHIVED STATUS
  // ========================================

  useEffect(() => {
    if (!isAdmin && status !== "active") {
      setStatus("active");
      setPage(1);
    }
  }, [isAdmin, status]);

  // ========================================
  // 4. LOAD PEOPLE FROM SUPABASE
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
      status: isAdmin ? status : "active",
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;

        if (page > result.totalPages) {
          setPage(result.totalPages);
          return;
        }

        setPeople(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err.message || "Could not load people."
        );

        setPeople([]);
        setTotal(0);
        setTotalPages(1);
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
    refreshKey,
  ]);

  // ========================================
  // 5. AVAILABLE VILLAGES
  // ========================================

  const availableVillages = useMemo(
    () =>
      options.villages.filter(
        (item) =>
          !district ||
          item.district?.toLowerCase() ===
            district.toLowerCase()
      ),
    [options.villages, district]
  );

  // ========================================
  // 6. FILTER HELPERS
  // ========================================

  function changeFilter(setter, value) {
    setter(value);
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

  // ========================================
  // 7. OPEN REMOVE CONFIRMATION
  // ========================================

  function openRemove(person) {
    if (
      !isAdmin ||
      person.is_archived ||
      person.is_head
    ) {
      return;
    }

    setActionError("");
    setConfirmCode("");
    setRemoveTarget(person);
  }

  // ========================================
  // 8. REMOVE INDIVIDUAL
  // ========================================

  async function handleRemove(event) {
    event.preventDefault();

    if (
      !isAdmin ||
      !removeTarget ||
      busyPersonId
    ) {
      return;
    }

    if (
      confirmCode.trim() !==
      removeTarget.person_code
    ) {
      return;
    }

    const person = removeTarget;

    setBusyPersonId(person.id);
    setActionError("");
    setNotice("");

    try {
      await archiveIndividual(
        person.id,
        person.person_code
      );

      setRemoveTarget(null);
      setConfirmCode("");

      setNotice(
        `${person.full_name} was archived successfully.`
      );

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setActionError(
        err.message ||
        "Could not remove individual."
      );
    } finally {
      setBusyPersonId(null);
    }
  }

  // ========================================
  // 9. RESTORE INDIVIDUAL
  // ========================================

  async function handleRestore(person) {
    if (!isAdmin || busyPersonId) return;

    const confirmed = window.confirm(
      `Restore ${person.full_name} (${person.person_code})?`
    );

    if (!confirmed) return;

    setBusyPersonId(person.id);
    setActionError("");
    setNotice("");

    try {
      await restoreIndividual(person.id);

      setNotice(
        `${person.full_name} was restored successfully.`
      );

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setActionError(
        err.message ||
        "Could not restore individual."
      );
    } finally {
      setBusyPersonId(null);
    }
  }

  // ========================================
  // 10. PAGINATION AND FILTER STATUS
  // ========================================

  const hasFilters = Boolean(
    searchInput.trim() ||
    familyId ||
    district ||
    village ||
    ageGroup !== "all" ||
    gender !== "all" ||
    status !== "active" ||
    sort !== "name_asc"
  );

  const firstItem = total
    ? (page - 1) * PAGE_SIZE + 1
    : 0;

  const lastItem = Math.min(
    page * PAGE_SIZE,
    total
  );

  // ========================================
  // 11. PEOPLE PAGE
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
            Add, view, edit and manage registered
            community members.
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
              Add Person
            </Link>
          )}
        </div>
      </header>

      {/* SEARCH AND FILTERS */}

      <section className="ca-adv-search-panel">
        <div className="ca-adv-search-row">
          <div className="ca-adv-search-field">
            <Search size={19} />

            <input
              type="search"
              value={searchInput}
              maxLength={120}
              placeholder="Search name, person code, family or address..."
              aria-label="Search people"
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
              setShowFilters(
                (value) => !value
              )
            }
          >
            <SlidersHorizontal size={17} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="ca-adv-filters">

            {/* FAMILY FILTER */}
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
                    value={family.id}
                    key={family.id}
                  >
                    {family.family_code}
                    {" — "}
                    {family.family_name}
                  </option>
                ))}
              </select>
            </label>

            {/* DISTRICT FILTER */}
            <label>
              District

              <select
                value={district}
                onChange={(event) => {
                  setDistrict(event.target.value);
                  setVillage("");
                  setPage(1);
                }}
              >
                <option value="">
                  All Districts
                </option>

                {options.districts.map((name) => (
                  <option
                    value={name}
                    key={name}
                  >
                    {name}
                  </option>
                ))}
              </select>
            </label>

            {/* VILLAGE FILTER */}
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
                    value={item.name}
                    key={`${item.district}-${item.name}`}
                  >
                    {item.name}

                    {!district && item.district
                      ? ` (${item.district})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* AGE FILTER */}
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

            {/* GENDER FILTER */}
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
                  All Genders
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

            {/* ADMIN STATUS FILTER */}
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

            {/* SORT FILTER */}
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

      {/* NOTIFICATIONS */}

      {optionsError && (
        <div className="ca-ind-alert" role="alert">
          <AlertCircle size={17} />
          Filter options: {optionsError}
        </div>
      )}

      {notice && (
        <div
          className="ca-people-feedback is-success"
          role="status"
        >
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      {actionError && (
        <div
          className="ca-people-feedback is-error"
          role="alert"
        >
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {/* RESULTS SUMMARY */}

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
          Loading people...
        </div>
      )}

      {/* FETCH ERROR */}

      {!loading && error && (
        <div
          className="page-card"
          role="alert"
        >
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* EMPTY RESULTS */}

      {!loading &&
        !error &&
        people.length === 0 && (
          <div className="ca-ind-state">
            <Search size={40} />

            <h2>No Matching Individuals</h2>

            <p>
              Try different filters or register
              a new person.
            </p>

            <button
              type="button"
              className="ca-adv-outline"
              onClick={resetFilters}
            >
              <RotateCcw size={16} />
              Clear Filters
            </button>
          </div>
        )}

      {/* PEOPLE CARDS */}

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

                  {/* PERSON IDENTITY */}
                  <div className="ca-person-top">
                    <div className="ca-person-avatar">
                      <UserRound size={22} />
                    </div>

                    <div className="ca-person-identity">
                      <h3>{person.full_name}</h3>
                      <span>{person.person_code}</span>
                    </div>
                  </div>

                  {/* STATUS */}
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

                  {/* PERSONAL DETAILS */}
                  <div className="ca-person-details">
                    <p>
                      <House size={16} />

                      <span>
                        {person.family?.family_name ||
                          "Family unavailable"}

                        {person.family?.family_code
                          ? ` · ${person.family.family_code}`
                          : ""}
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
                          person.family?.location?.village,
                          person.family?.location?.district,
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          "Location not recorded"}
                      </span>
                    </p>

                    <p>
                      <CalendarDays size={16} />

                      <span>
                        {person.age_years == null
                          ? "Age not recorded"
                          : `${person.age_years} years`}
                      </span>
                    </p>
                  </div>

                  {/* ==================================
                      DIRECT MANAGEMENT ACTIONS
                  ================================== */}

                  <div className="ca-people-card-actions">

                    {/* VIEW PROFILE */}
                    {!person.is_archived ? (
                      <Link
                        className="ca-people-action-btn"
                        to={`/people/${person.id}`}
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    ) : isAdmin ? (
                      <Link
                        className="ca-people-action-btn"
                        to={`/people/${person.id}/manage`}
                      >
                        <Eye size={16} />
                        Manage
                      </Link>
                    ) : null}

                    {/* EDIT PERSON */}
                    {canEdit &&
                      !person.is_archived && (
                        <Link
                          className="ca-people-action-btn is-edit"
                          to={`/people/${person.id}/manage`}
                        >
                          <Pencil size={16} />
                          Edit
                        </Link>
                      )}

                    {/* REMOVE PERSON */}
                    {isAdmin &&
                      !person.is_archived && (
                        <button
                          type="button"
                          className="ca-people-action-btn is-danger"
                          disabled={
                            Boolean(busyPersonId) ||
                            person.is_head
                          }
                          title={
                            person.is_head
                              ? "Assign another family head first"
                              : "Archive this person"
                          }
                          onClick={() =>
                            openRemove(person)
                          }
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}

                    {/* RESTORE PERSON */}
                    {isAdmin &&
                      person.is_archived && (
                        <button
                          type="button"
                          className="ca-people-action-btn is-restore"
                          disabled={Boolean(busyPersonId)}
                          onClick={() =>
                            handleRestore(person)
                          }
                        >
                          <RotateCcw size={16} />

                          {busyPersonId === person.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                      )}

                    {/* VIEW HOUSEHOLD */}
                    <Link
                      className="ca-people-action-btn is-household"
                      to={`/households/${person.family_id}`}
                    >
                      <House size={16} />
                      Household
                    </Link>

                  </div>

                  {isAdmin &&
                    person.is_head &&
                    !person.is_archived && (
                      <p className="ca-people-head-hint">
                        Change the family head
                        before removal.
                      </p>
                    )}

                </article>
              ))}
            </div>

            {/* PAGINATION */}
            <nav
              className="ca-adv-pagination"
              aria-label="People results pages"
            >
              <span>
                Showing {firstItem}–{lastItem}
                {" of "}
                {total} people
              </span>

              <div>
                <button
                  type="button"
                  disabled={page <= 1 || loading}
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
                    page >= totalPages ||
                    loading
                  }
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </nav>
          </>
        )}

      {/* ======================================
          REMOVE CONFIRMATION DIALOG
      ====================================== */}

      {isAdmin && removeTarget && (
        <div className="ca-people-modal-backdrop">
          <section
            className="ca-people-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ca-people-remove-title"
          >
            <div className="ca-people-modal-heading">
              <h2 id="ca-people-remove-title">
                Remove Individual
              </h2>

              <button
                type="button"
                onClick={() =>
                  setRemoveTarget(null)
                }
                disabled={Boolean(busyPersonId)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <p>
              You're about to archive{" "}
              <strong>
                {removeTarget.full_name}
              </strong>
              . This does not permanently delete
              their record.
            </p>

            <p>
              Type the person code{" "}
              <strong>
                {removeTarget.person_code}
              </strong>
              {" "}to confirm.
            </p>

            <form onSubmit={handleRemove}>
              <label htmlFor="ca-people-confirm-code">
                Person Code
              </label>

              <input
                id="ca-people-confirm-code"
                autoFocus
                autoComplete="off"
                value={confirmCode}
                disabled={Boolean(busyPersonId)}
                onChange={(event) =>
                  setConfirmCode(event.target.value)
                }
                placeholder={removeTarget.person_code}
              />

              {actionError && (
                <p
                  className="ca-people-modal-error"
                  role="alert"
                >
                  {actionError}
                </p>
              )}

              <div className="ca-people-modal-actions">
                <button
                  type="button"
                  disabled={Boolean(busyPersonId)}
                  onClick={() =>
                    setRemoveTarget(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="is-danger"
                  disabled={
                    Boolean(busyPersonId) ||
                    confirmCode.trim() !==
                      removeTarget.person_code
                  }
                >
                  <Archive size={16} />

                  {busyPersonId
                    ? "Removing..."
                    : "Confirm Removal"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
