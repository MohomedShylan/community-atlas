
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

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import useAuth from "../hooks/useAuth";

import MapLibreMap from "../components/map/MapLibreMap";
import LocationSearch from "../components/map/LocationSearch";

import {
  getMappedLocations,
  getLocationFamiliesAndMembers,
} from "../services/locationService";

const mapTilerKey =
  import.meta.env.VITE_MAPTILER_API_KEY;

export default function MapExplorer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const locationIdFromUrl =
    searchParams.get("locationId");

  const { profile } = useAuth();

  const canRegister =
    profile?.role === "admin" ||
    profile?.role === "editor";

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mapError, setMapError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] =
    useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [filter, setFilter] = useState("");

  // ==========================================
  // 1. LOAD REGISTERED MAP LOCATIONS
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const data = await getMappedLocations();

        if (active) {
          setLocations(data);
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

    loadLocations();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // 2. SELECTED REGISTERED LOCATION
  // ==========================================

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) => location.id === selectedId
      ) ?? null,
    [locations, selectedId]
  );

  // ==========================================
  // 3. SEARCH REGISTERED LOCATIONS
  // ==========================================

  const filteredLocations = useMemo(() => {
    const term = filter.trim().toLowerCase();

    return locations.filter((location) =>
      [
        location.location_code,
        location.address_line,
        location.village,
        location.district,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(term)
        )
    );
  }, [locations, filter]);

  // ==========================================
  // 4. FETCH FAMILY AND MEMBER DETAILS
  // ==========================================

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

    getLocationFamiliesAndMembers(selectedId)
      .then((data) => {
        if (active) {
          setDetails(data);
        }
      })
      .catch((err) => {
        if (active) {
          setDetailsError(err.message);
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

  // ==========================================
  // 5. SELECT A HOUSEHOLD MARKER
  // ==========================================

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

  // ==========================================
  // 6. SELECT LOCATION FROM INDIVIDUAL PROFILE
  // ==========================================

  // Example URL:
  // /map?locationId=LOCATION_UUID
  //
  // This automatically selects the household
  // and zooms into its saved GPS coordinates.

  useEffect(() => {
    if (
      !locationIdFromUrl ||
      loading ||
      loadError
    ) {
      return;
    }

    const locationExists = locations.some(
      (location) =>
        location.id === locationIdFromUrl
    );

    if (locationExists) {
      handleSelectLocation(locationIdFromUrl);
    }
  }, [
    locationIdFromUrl,
    loading,
    loadError,
    locations,
    handleSelectLocation,
  ]);

  const linkedLocationMissing = Boolean(
    locationIdFromUrl &&
      !loading &&
      !loadError &&
      !locations.some(
        (location) =>
          location.id === locationIdFromUrl
      )
  );

  // ==========================================
  // 7. SELECT COORDINATES BY CLICKING MAP
  // ==========================================

  const handleSelectPoint = useCallback((point) => {
    setSelectedId(null);

    setSelectedPoint({
      ...point,
      kind: "manual",
      label: "Selected map coordinates",
    });
  }, []);

  // ==========================================
  // 8. SELECT PUBLIC PLACE SEARCH RESULT
  // ==========================================

  const handleSelectPlace = useCallback((place) => {
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
  }, []);

  // ==========================================
  // 9. CLEAR SELECTED LOCATION
  // ==========================================

  const handleClearSelection = () => {
    setSelectedId(null);
    setSelectedPoint(null);
    setDetails(null);
    setDetailsError("");
  };

  // ==========================================
  // 10. HANDLE MAP ERRORS
  // ==========================================

  const handleMapError = useCallback((message) => {
    setMapError(message);
  }, []);

  // ==========================================
  // MAIN COMPONENT
  // ==========================================

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
            Locate registered households and view
            their authorized family information.
          </p>
        </div>

        <div className="ca-map-count">
          <MapPinned size={22} />

          <div>
            <strong>{locations.length}</strong>
            <span>Mapped locations loaded</span>
          </div>
        </div>
      </header>

      {/* LOCATION LOADING STATUS */}
      {loading && (
        <div
          className="ca-map-notice"
          role="status"
        >
          Loading registered locations...
        </div>
      )}

      {/* LOCATION LOAD ERROR */}
      {loadError && (
        <div
          className="ca-map-error"
          role="alert"
        >
          <AlertCircle size={17} />
          {loadError}
        </div>
      )}

      {/* INVALID / ARCHIVED PROFILE LOCATION */}
      {linkedLocationMissing && (
        <div
          className="ca-map-error"
          role="alert"
        >
          <AlertCircle size={17} />

          <span>
            The requested household location is not
            mapped, is archived, or is not available
            to your account.
          </span>
        </div>
      )}

      <div className="ca-map-layout">
        {/* ====================================
            LEFT COLUMN - INTERACTIVE MAP
        ==================================== */}

        <section className="ca-map-card">
          <div className="ca-map-card-header">
            <strong>
              <Navigation size={18} />
              Interactive Map
            </strong>

            <span>MapLibre + MapTiler</span>
          </div>

          {/* PUBLIC PLACE SEARCH */}
          {mapTilerKey && (
            <LocationSearch
              apiKey={mapTilerKey}
              onSelectPlace={handleSelectPlace}
            />
          )}

          {/* MAP AREA */}
          <div className="ca-map-area">
            {!mapTilerKey ? (
              <div className="ca-map-empty">
                <MapPin size={38} />

                <h3>
                  Map configuration required
                </h3>

                <p>
                  Add VITE_MAPTILER_API_KEY to
                  your .env.local file.
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
            RIGHT COLUMN - LOCATION DETAILS
        ==================================== */}

        <aside
          className="ca-location-panel"
          aria-label="Location details"
        >
          {/* REGISTERED LOCATION SELECTED */}
          {selectedLocation ? (
            <>
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

              {/* ADDRESS */}
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
                  {selectedLocation.latitude.toFixed(6)}
                  {", "}
                  {selectedLocation.longitude.toFixed(6)}
                </strong>
              </div>

              {/* ADD FAMILY TO EXISTING LOCATION */}
              {canRegister && (
                <button
                  type="button"
                  className="ca-register-action"
                  onClick={() =>
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
                    })
                  }
                >
                  <House size={18} />
                  Add Another Family Here
                </button>
              )}

              {/* DETAILS LOADING */}
              {detailsLoading && (
                <p className="ca-muted">
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

                  {/* FAMILY LIST */}
                  {details.families.map((family) => {
                    const members = details.people.filter(
                      (person) =>
                        person.family_id === family.id
                    );

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

                          <Link
                            className="ca-edit-secondary"
                            to={`/households/${family.id}`}
                          >
                            View household
                            {canRegister
                              ? " / Edit"
                              : ""}
                          </Link>

                          <span>
                            {family.family_code}
                          </span>
                        </div>

                        {/* MEMBERS COUNT */}
                        <p className="ca-member-title">
                          Members ({members.length})
                        </p>

                        {members.length === 0 && (
                          <p className="ca-muted">
                            No registered members.
                          </p>
                        )}

                        {/* INDIVIDUAL MEMBERS */}
                        <ul className="ca-member-list">
                          {members.map((person) => (
                            <li key={person.id}>
                              <div className="ca-member-icon">
                                <Users size={15} />
                              </div>

                              <div>
                                {/* STEP 8.2 - PROFILE LINK */}
                                <strong>
                                  <Link
                                    to={`/people/${person.id}`}
                                    className="ca-ip-name-link"
                                  >
                                    {person.full_name}
                                  </Link>
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
            /* ====================================
               NEW MAP LOCATION SELECTED
            ==================================== */

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

              {/* COORDINATES */}
              <div className="ca-coordinates">
                <small>
                  LATITUDE, LONGITUDE
                </small>

                <strong>
                  {selectedPoint.lat.toFixed(6)}
                  {", "}
                  {selectedPoint.lng.toFixed(6)}
                </strong>
              </div>

              {/* REGISTER HOUSEHOLD */}
              {canRegister && (
                <button
                  type="button"
                  className="ca-register-action"
                  onClick={() =>
                    navigate("/households/new", {
                      state: {
                        point: {
                          lat: selectedPoint.lat,
                          lng: selectedPoint.lng,
                        },
                      },
                    })
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
                  navigator.clipboard
                    .writeText(
                      `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`
                    )
                    .catch(console.error);
                }}
              >
                Copy Coordinates
              </button>

              <p className="ca-muted">
                Nothing has been saved to Supabase.
                Authorized editors can register
                a household using this point.
              </p>
            </div>
          ) : (
            /* ====================================
               REGISTERED LOCATION DIRECTORY
            ==================================== */

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
                Select a green marker or search your
                registered addresses below.
              </p>

              {/* DIRECTORY SEARCH */}
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

              {/* DIRECTORY LIST */}
              <div className="ca-directory-list">
                {filteredLocations.map((location) => (
                  <button
                    type="button"
                    className="ca-directory-item"
                    key={location.id}
                    onClick={() =>
                      handleSelectLocation(location.id)
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
                ))}

                {!loading &&
                  filteredLocations.length === 0 && (
                    <p className="ca-muted">
                      No registered locations found.
                    </p>
                  )}
              </div>
            </>
          )}

          {/* BACK TO LOCATION DIRECTORY */}
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
