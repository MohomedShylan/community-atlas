
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import {
  MapPinned,
  MapPin,
  House,
  Users,
  Search,
  Info,
  AlertCircle,
  Navigation,
  ArrowLeft,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import useDebouncedValue from "../hooks/useDebouncedValue";

import {
  measureRequest,
} from "../utils/measureRequest";

import MapLibreMap from "../components/map/MapLibreMap";
import LocationSearch from "../components/map/LocationSearch";

import {
  getMappedLocations,
  getLocationFamiliesAndMembers,
} from "../services/locationService";

const mapTilerKey =
  import.meta.env.VITE_MAPTILER_API_KEY;

// ==========================================
// MAIN MAP EXPLORER
// ==========================================

export default function MapExplorer() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // ========================================
  // ROLE PERMISSIONS
  // ========================================

  const canRegister =
    profile?.is_active === true &&
    (
      profile?.role === "admin" ||
      profile?.role === "editor"
    );

  // ========================================
  // MAP LOCATION STATES
  // ========================================

  const [locations, setLocations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [mapError, setMapError] =
    useState("");

  // ========================================
  // MAP SELECTION
  // ========================================

  const [selectedId, setSelectedId] =
    useState(null);

  const [selectedPoint, setSelectedPoint] =
    useState(null);

  const [focusTarget, setFocusTarget] =
    useState(null);

  // ========================================
  // HOUSEHOLD DETAILS
  // ========================================

  const [details, setDetails] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  // ========================================
  // LOCATION DIRECTORY SEARCH
  // ========================================

  const [filter, setFilter] =
    useState("");

  const debouncedFilter =
    useDebouncedValue(filter, 200);

  // ========================================
  // 1. LOAD REGISTERED LOCATIONS
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await measureRequest(
          "Map locations",
          () => getMappedLocations()
        );

        if (active) {
          setLocations(
            Array.isArray(data) ? data : []
          );
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err.message ||
            "Failed to load registered locations."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // 2. SELECTED REGISTERED LOCATION
  // ========================================

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          location.id === selectedId
      ) ?? null,
    [locations, selectedId]
  );

  // ========================================
  // 3. FILTER LOCATION DIRECTORY
  // ========================================

  const filteredLocations = useMemo(() => {
    const term =
      debouncedFilter.trim().toLowerCase();

    if (!term) {
      return locations;
    }

    return locations.filter((location) =>
      [
        location.location_code,
        location.address_line,
        location.village,
        location.district,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        )
    );
  }, [locations, debouncedFilter]);

  // ========================================
  // 4. GROUP MEMBERS BY FAMILY
  // ========================================

  const membersByFamily = useMemo(() => {
    const grouped = new Map();

    for (const person of details?.people ?? []) {
      const familyId = person.family_id;

      if (!grouped.has(familyId)) {
        grouped.set(familyId, []);
      }

      grouped.get(familyId).push(person);
    }

    return grouped;
  }, [details]);

  // ========================================
  // 5. LOAD SELECTED LOCATION DETAILS
  // ========================================

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      setDetailsError("");
      setDetailsLoading(false);
      return;
    }

    let active = true;

    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);

    measureRequest(
      "Selected location details",
      () =>
        getLocationFamiliesAndMembers(
          selectedId
        )
    )
      .then((data) => {
        if (active) {
          setDetails(data);
        }
      })
      .catch((err) => {
        if (active) {
          setDetailsError(
            err.message ||
            "Failed to load household details."
          );
        }
      })
      .finally(() => {
        if (active) {
          setDetailsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  // ========================================
  // 6. SELECT AN EXISTING LOCATION
  // ========================================

  const handleSelectLocation = useCallback(
    (locationId) => {
      const location = locations.find(
        (item) => item.id === locationId
      );

      if (!location) return;

      setSelectedId(locationId);
      setSelectedPoint(null);

      setFocusTarget({
        lng: Number(location.longitude),
        lat: Number(location.latitude),
        zoom: 16,
      });
    },
    [locations]
  );

  // ========================================
  // 7. SELECT A NEW POINT ON THE MAP
  // ========================================

  const handleSelectPoint = useCallback(
    (point) => {
      setSelectedId(null);
      setSelectedPoint({
        ...point,
        kind: "manual",
        label: "Selected map coordinates",
      });
    },
    []
  );

  // ========================================
  // 8. SELECT A PUBLIC SEARCH RESULT
  // ========================================

  const handleSelectPlace = useCallback(
    (place) => {
      setSelectedId(null);

      setSelectedPoint({
        lng: place.lng,
        lat: place.lat,
        kind: "place",
        label: place.label,
      });

      setFocusTarget({
        lng: place.lng,
        lat: place.lat,
        zoom: 15,
      });
    },
    []
  );

  // ========================================
  // 9. REGISTER A HOUSEHOLD AT NEW POINT
  // ========================================

  function handleRegisterNewLocation() {
    if (!canRegister || !selectedPoint) {
      return;
    }

    const lat = Number(selectedPoint.lat);
    const lng = Number(selectedPoint.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setMapError(
        "The selected GPS coordinates are invalid."
      );
      return;
    }

    // Pass coordinates to the existing
    // household registration page.
    //
    // No database record is created here.
    navigate("/households/new", {
      state: {
        point: {
          lat,
          lng,
        },
      },
    });
  }

  // ========================================
  // 10. ADD ANOTHER FAMILY TO EXISTING
  //     REGISTERED LOCATION
  // ========================================

  function handleRegisterExistingLocation() {
    if (!canRegister || !selectedLocation) {
      return;
    }

    // Reuse the existing registered location.
    // The registration form must consume
    // this navigation state.
    navigate("/households/new", {
      state: {
        existingLocation: {
          id: selectedLocation.id,
          location_code:
            selectedLocation.location_code,
          address_line:
            selectedLocation.address_line,
        },
      },
    });
  }

  // ========================================
  // 11. CLEAR MAP SELECTION
  // ========================================

  function handleClearSelection() {
    setSelectedId(null);
    setSelectedPoint(null);
    setDetails(null);
    setDetailsError("");
  }

  // ========================================
  // 12. MAP ERROR HANDLER
  // ========================================

  const handleMapError = useCallback(
    (message) => {
      setMapError(message);
    },
    []
  );

  // ========================================
  // MAIN PAGE
  // ========================================

  return (
    <div className="ca-map-page">

      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <header className="ca-map-header">
        <div>
          <span className="ca-eyebrow">
            COMMUNITY GEOGRAPHIC SYSTEM
          </span>

          <h1>Map Explorer</h1>

          <p>
            Locate registered households, select
            new coordinates, and register families.
          </p>
        </div>

        <div className="ca-map-count">
          <MapPinned size={22} />

          <div>
            <strong>
              {locations.length}
            </strong>

            <span>
              Mapped locations loaded
            </span>
          </div>
        </div>
      </header>

      {/* ====================================
          REGISTER HOUSEHOLD GUIDANCE
      ==================================== */}

      {canRegister && (
        <div className="ca-map-notice">
          <House size={18} />

          <span>
            To register a new household, click
            an empty point on the map. To add a
            family to an existing location,
            select its green marker.
          </span>
        </div>
      )}

      {/* ====================================
          LOADING MESSAGE
      ==================================== */}

      {loading && (
        <div
          className="ca-map-notice"
          role="status"
        >
          Loading registered locations...
        </div>
      )}

      {/* ====================================
          LOCATION ERROR
      ==================================== */}

      {loadError && (
        <div
          className="ca-map-error"
          role="alert"
        >
          <AlertCircle size={17} />
          {loadError}
        </div>
      )}

      {/* ====================================
          MAP + DETAILS LAYOUT
      ==================================== */}

      <div className="ca-map-layout">

        {/* MAP COLUMN */}

        <section className="ca-map-card">

          <div className="ca-map-card-header">
            <strong>
              <Navigation size={18} />
              Interactive Map
            </strong>

            <span>
              MapLibre + MapTiler
            </span>
          </div>

          {/* PUBLIC PLACE SEARCH */}

          {mapTilerKey && (
            <LocationSearch
              apiKey={mapTilerKey}
              onSelectPlace={handleSelectPlace}
            />
          )}

          {/* INTERACTIVE MAP */}

          <div className="ca-map-area">

            {!mapTilerKey ? (
              <div className="ca-map-empty">
                <MapPin size={38} />

                <h3>
                  Map configuration required
                </h3>

                <p>
                  Add VITE_MAPTILER_API_KEY
                  to your .env.local file.
                </p>

                {canRegister && (
                  <Link
                    to="/households/new"
                    className="ca-edit-secondary"
                  >
                    Register Household Manually
                  </Link>
                )}
              </div>
            ) : (
              <MapLibreMap
                apiKey={mapTilerKey}
                locations={locations}
                selectedLocationId={selectedId}
                selectedPoint={selectedPoint}
                focusTarget={focusTarget}
                onSelectLocation={handleSelectLocation}
                onSelectPoint={handleSelectPoint}
                onMapError={handleMapError}
              />
            )}

          </div>

          {/* MAP ERROR */}

          {mapError && (
            <div
              className="ca-map-error"
              role="alert"
            >
              <AlertCircle size={17} />
              {mapError}
            </div>
          )}

          {/* MAP FOOTER */}

          <div className="ca-map-footer">
            <Info size={16} />

            <span>
              Green markers represent saved
              locations. Clicking an empty point
              selects coordinates without
              immediately creating a record.
            </span>
          </div>
        </section>

        {/* ====================================
            LOCATION DETAILS
        ==================================== */}

        <aside
          className="ca-location-panel"
          aria-label="Location details"
        >

          {/* EXISTING LOCATION SELECTED */}

          {selectedLocation ? (
            <>

              {/* LOCATION HEADING */}

              <div className="ca-panel-heading">
                <div className="ca-panel-icon">
                  <House size={23} />
                </div>

                <div>
                  <small>
                    REGISTERED LOCATION
                  </small>

                  <h2>
                    {selectedLocation.location_code}
                  </h2>
                </div>
              </div>

              {/* LOCATION ADDRESS */}

              <p className="ca-location-address">
                <MapPin size={16} />

                <span>
                  {[
                    selectedLocation.address_line,
                    selectedLocation.village,
                    selectedLocation.district,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </p>

              {/* GPS COORDINATES */}

              <div className="ca-coordinates">
                <small>
                  GPS COORDINATES
                </small>

                <strong>
                  {Number(
                    selectedLocation.latitude
                  ).toFixed(6)}
                  {", "}
                  {Number(
                    selectedLocation.longitude
                  ).toFixed(6)}
                </strong>
              </div>

              {/* ==================================
                  RESTORED REGISTRATION BUTTON
                  FOR EXISTING LOCATIONS
              ================================== */}

              {canRegister && (
                <button
                  type="button"
                  className="ca-register-action"
                  onClick={
                    handleRegisterExistingLocation
                  }
                >
                  <House size={18} />

                  Add Another Family Here
                </button>
              )}

              {/* LOCATION DETAILS LOADING */}

              {detailsLoading && (
                <p
                  className="ca-muted"
                  role="status"
                >
                  Loading family information...
                </p>
              )}

              {/* LOCATION DETAILS ERROR */}

              {detailsError && (
                <div
                  className="ca-map-error"
                  role="alert"
                >
                  {detailsError}
                </div>
              )}

              {/* FAMILY AND MEMBER DETAILS */}

              {details && !detailsLoading && (
                <>

                  {/* FAMILY STATISTICS */}

                  <div className="ca-family-stats">

                    <div>
                      <House size={18} />

                      <strong>
                        {details.families.length}
                      </strong>

                      <span>
                        Families
                      </span>
                    </div>

                    <div>
                      <Users size={18} />

                      <strong>
                        {details.people.length}
                      </strong>

                      <span>
                        Individuals
                      </span>
                    </div>

                  </div>

                  {/* NO FAMILIES */}

                  {details.families.length === 0 && (
                    <p className="ca-muted">
                      No active families are registered
                      at this location.
                    </p>
                  )}

                  {/* FAMILY CARDS */}

                  {details.families.map((family) => {
                    const members =
                      membersByFamily.get(
                        family.id
                      ) ?? [];

                    return (
                      <article
                        key={family.id}
                        className="ca-family-card"
                      >

                        {/* FAMILY HEADER */}

                        <div className="ca-family-heading">

                          <h3>
                            {family.family_name}
                          </h3>

                          <span>
                            {family.family_code}
                          </span>

                          <Link
                            className="ca-edit-secondary"
                            to={`/households/${family.id}`}
                          >
                            View Household
                            {canRegister
                              ? " / Edit"
                              : ""}
                          </Link>

                        </div>

                        {/* FAMILY MEMBERS */}

                        <p className="ca-member-title">
                          Members ({members.length})
                        </p>

                        {members.length === 0 && (
                          <p className="ca-muted">
                            No registered members.
                          </p>
                        )}

                        <ul className="ca-member-list">

                          {members.map((person) => (
                            <li key={person.id}>

                              <div className="ca-member-icon">
                                <Users size={15} />
                              </div>

                              <div>
                                <strong>
                                  {person.full_name}
                                </strong>

                                <span>
                                  {person.relationship_to_head ||
                                    "Member"}

                                  {person.is_head
                                    ? " · Head of family"
                                    : ""}
                                </span>
                              </div>

                            </li>
                          ))}

                        </ul>

                      </article>
                    );
                  })}

                </>
              )}

            </>

          ) : selectedPoint ? (

            /* ==================================
                NEW LOCATION SELECTED
            ================================== */

            <div className="ca-point-details">

              <div className="ca-panel-icon">
                <MapPin size={24} />
              </div>

              <h2>
                {selectedPoint.kind === "place"
                  ? "Public Place Selected"
                  : "New Location Selected"}
              </h2>

              <p>
                {selectedPoint.label}
              </p>

              {/* SELECTED COORDINATES */}

              <div className="ca-coordinates">
                <small>
                  LATITUDE, LONGITUDE
                </small>

                <strong>
                  {Number(
                    selectedPoint.lat
                  ).toFixed(6)}
                  {", "}
                  {Number(
                    selectedPoint.lng
                  ).toFixed(6)}
                </strong>
              </div>

              {/* ==================================
                  RESTORED REGISTRATION BUTTON
                  FOR NEW LOCATIONS
              ================================== */}

              {canRegister && (
                <button
                  type="button"
                  className="ca-register-action"
                  onClick={
                    handleRegisterNewLocation
                  }
                >
                  <House size={18} />

                  Register Household Here
                </button>
              )}

              {/* COPY COORDINATES */}

              <button
                type="button"
                className="ca-copy-button"
                onClick={() => {
                  const coordinates =
                    `${Number(selectedPoint.lat).toFixed(6)}, ` +
                    `${Number(selectedPoint.lng).toFixed(6)}`;

                  navigator.clipboard
                    .writeText(coordinates)
                    .catch((err) => {
                      console.error(
                        "Could not copy coordinates:",
                        err.message
                      );
                    });
                }}
              >
                Copy Coordinates
              </button>

              <p className="ca-muted">
                This location has not been saved
                to Supabase yet. Complete the
                household registration form to
                create the new family.
              </p>

            </div>

          ) : (

            /* ==================================
                LOCATION DIRECTORY
            ================================== */

            <>

              <div className="ca-panel-heading">

                <div className="ca-panel-icon">
                  <MapPin size={24} />
                </div>

                <div>
                  <small>
                    LOCATION DIRECTORY
                  </small>

                  <h2>
                    Registered Locations
                  </h2>
                </div>

              </div>

              <p className="ca-muted">
                Select a green marker or click
                an empty point on the map to begin.
              </p>

              {/* DIRECTORY SEARCH */}

              <div className="ca-directory-search">
                <Search size={17} />

                <input
                  type="search"
                  value={filter}
                  onChange={(event) =>
                    setFilter(
                      event.target.value
                    )
                  }
                  placeholder="Location code or address"
                  aria-label="Search registered locations"
                />
              </div>

              {/* REGISTERED LOCATION LIST */}

              <div className="ca-directory-list">

                {filteredLocations.map(
                  (location) => (
                    <button
                      type="button"
                      className="ca-directory-item"
                      key={location.id}
                      onClick={() =>
                        handleSelectLocation(
                          location.id
                        )
                      }
                    >

                      <MapPin size={18} />

                      <div>
                        <strong>
                          {location.location_code}
                        </strong>

                        <span>
                          {location.address_line}
                        </span>
                      </div>

                    </button>
                  )
                )}

                {!loading &&
                  filteredLocations.length === 0 && (
                    <p className="ca-muted">
                      No registered locations found.
                    </p>
                  )}

              </div>

            </>
          )}

          {/* BACK TO DIRECTORY */}

          {(selectedLocation || selectedPoint) && (
            <button
              type="button"
              className="ca-back-button"
              onClick={
                handleClearSelection
              }
            >
              <ArrowLeft size={16} />

              Back to Location Directory
            </button>
          )}

        </aside>
      </div>
    </div>
  );
}
