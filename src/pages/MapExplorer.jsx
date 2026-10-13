
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

import MapLibreMap from "../components/map/MapLibreMap";
import LocationSearch from "../components/map/LocationSearch";

import useDebouncedValue from "../hooks/useDebouncedValue";

import {
  measureRequest,
} from "../utils/measureRequest";

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
  // ========================================
  // LOCATION STATES
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
  // DIRECTORY SEARCH
  // ========================================

  const [filter, setFilter] =
    useState("");

  const debouncedFilter =
    useDebouncedValue(filter, 200);

  // ========================================
  // 1. LOAD MAP LOCATIONS
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
            "Failed to load map locations."
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
  // 2. FIND SELECTED LOCATION
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
  // 4. GROUP FAMILY MEMBERS ONCE
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
  // 5. FETCH SELECTED LOCATION DETAILS
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
            "Failed to load household information."
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
  // 6. SELECT REGISTERED LOCATION
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
        lng: location.longitude,
        lat: location.latitude,
        zoom: 16,
      });
    },
    [locations]
  );

  // ========================================
  // 7. SELECT A NEW MAP POINT
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
  // 8. SELECT PUBLIC PLACE SEARCH RESULT
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
  // 9. CLEAR SELECTION
  // ========================================

  const handleClearSelection = () => {
    setSelectedId(null);
    setSelectedPoint(null);
    setDetails(null);
    setDetailsError("");
  };

  // ========================================
  // 10. MAP ERROR HANDLER
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

      {/* PAGE HEADER */}

      <header className="ca-map-header">
        <div>
          <span className="ca-eyebrow">
            COMMUNITY GEOGRAPHIC SYSTEM
          </span>

          <h1>Map Explorer</h1>

          <p>
            Locate registered households and
            view their authorized family information.
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

      {/* LOCATION LOADING */}

      {loading && (
        <div
          className="ca-map-notice"
          role="status"
        >
          Loading registered locations...
        </div>
      )}

      {/* LOCATION ERROR */}

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
          MAP AND DETAILS LAYOUT
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

          {/* MAP CONTAINER */}

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
              Green markers are saved locations.
              Clicking anywhere else selects
              coordinates without saving them.
            </span>
          </div>
        </section>

        {/* ====================================
            LOCATION DETAILS COLUMN
        ==================================== */}

        <aside
          className="ca-location-panel"
          aria-label="Location details"
        >

          {/* SELECTED REGISTERED LOCATION */}

          {selectedLocation ? (
            <>

              {/* LOCATION HEADER */}

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

              {/* COORDINATES */}

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

              {/* LOADING DETAILS */}

              {detailsLoading && (
                <p
                  className="ca-muted"
                  role="status"
                >
                  Loading family information...
                </p>
              )}

              {/* DETAILS ERROR */}

              {detailsError && (
                <div
                  className="ca-map-error"
                  role="alert"
                >
                  {detailsError}
                </div>
              )}

              {/* FAMILIES AND MEMBERS */}

              {details && !detailsLoading && (
                <>

                  {/* FAMILY STATISTICS */}

                  <div className="ca-family-stats">
                    <div>
                      <House size={18} />

                      <strong>
                        {details.families.length}
                      </strong>

                      <span>Families</span>
                    </div>

                    <div>
                      <Users size={18} />

                      <strong>
                        {details.people.length}
                      </strong>

                      <span>Individuals</span>
                    </div>
                  </div>

                  {/* EMPTY FAMILIES */}

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

                        {/* FAMILY HEADING */}

                        <div className="ca-family-heading">
                          <h3>
                            {family.family_name}
                          </h3>

                          <span>
                            {family.family_code}
                          </span>
                        </div>

                        <p className="ca-member-title">
                          Members ({members.length})
                        </p>

                        {/* EMPTY MEMBERS */}

                        {members.length === 0 && (
                          <p className="ca-muted">
                            No registered members.
                          </p>
                        )}

                        {/* MEMBER LIST */}

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

            /* MANUALLY SELECTED POINT */

            <div className="ca-point-details">
              <div className="ca-panel-icon">
                <MapPin size={24} />
              </div>

              <h2>
                {selectedPoint.kind === "place"
                  ? "Public place selected"
                  : "New location selected"}
              </h2>

              <p>
                {selectedPoint.label}
              </p>

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

              <button
                type="button"
                className="ca-copy-button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(
                      `${Number(selectedPoint.lat).toFixed(6)}, ${Number(selectedPoint.lng).toFixed(6)}`
                    )
                    .catch((err) => {
                      console.error(
                        "Coordinate copy failed:",
                        err.message
                      );
                    });
                }}
              >
                Copy Coordinates
              </button>

              <p className="ca-muted">
                Nothing has been saved to Supabase.
              </p>
            </div>

          ) : (

            /* REGISTERED LOCATION DIRECTORY */

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
                Select a green marker or search
                your registered addresses below.
              </p>

              {/* SEARCH INPUT */}

              <div className="ca-directory-search">
                <Search size={17} />

                <input
                  type="search"
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value)
                  }
                  placeholder="Location code or address"
                  aria-label="Search registered locations"
                />
              </div>

              {/* LOCATION SEARCH RESULTS */}

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
              onClick={handleClearSelection}
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
