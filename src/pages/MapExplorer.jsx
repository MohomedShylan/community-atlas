
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

import {
  getMappedLocations,
  getLocationFamiliesAndMembers,
} from "../services/locationService";

const mapTilerKey =
  import.meta.env.VITE_MAPTILER_API_KEY;

export default function MapExplorer() {
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

  // Load mapped household locations.
  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const data = await getMappedLocations();

        if (active) setLocations(data);
      } catch (err) {
        if (active) setLoadError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    return () => {
      active = false;
    };
  }, []);

  // Find the currently selected registered location.
  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) => location.id === selectedId
      ) ?? null,
    [locations, selectedId]
  );

  // Search among records already loaded from Supabase.
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

  // Fetch family information after selecting a marker.
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
        if (active) setDetails(data);
      })
      .catch((err) => {
        if (active) setDetailsError(err.message);
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

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

  // Choose a new point by clicking the map.
  const handleSelectPoint = useCallback((point) => {
    setSelectedId(null);
    setSelectedPoint({
      ...point,
      kind: "manual",
      label: "Selected map coordinates",
    });
  }, []);

  // Choose a public search result.
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

  const handleClearSelection = () => {
    setSelectedId(null);
    setSelectedPoint(null);
    setDetails(null);
    setDetailsError("");
  };

  const handleMapError = useCallback((message) => {
    setMapError(message);
  }, []);

  return (
    <div className="ca-map-page">
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

      {loading && (
        <div className="ca-map-notice" role="status">
          Loading registered locations...
        </div>
      )}

      {loadError && (
        <div className="ca-map-error" role="alert">
          <AlertCircle size={17} />
          {loadError}
        </div>
      )}

      <div className="ca-map-layout">
        {/* MAP COLUMN */}
        <section className="ca-map-card">
          <div className="ca-map-card-header">
            <strong>
              <Navigation size={18} />
              Interactive Map
            </strong>

            <span>MapLibre + MapTiler</span>
          </div>

          {mapTilerKey && (
            <LocationSearch
              apiKey={mapTilerKey}
              onSelectPlace={handleSelectPlace}
            />
          )}

          <div className="ca-map-area">
            {!mapTilerKey ? (
              <div className="ca-map-empty">
                <MapPin size={38} />
                <h3>Map configuration required</h3>

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

          {mapError && (
            <div className="ca-map-error" role="alert">
              <AlertCircle size={17} />
              {mapError}
            </div>
          )}

          <div className="ca-map-footer">
            <Info size={16} />
            <span>
              Green markers are saved locations.
              Clicking anywhere else selects
              coordinates without saving them.
            </span>
          </div>
        </section>

        {/* DETAILS COLUMN */}
        <aside
          className="ca-location-panel"
          aria-label="Location details"
        >
          {selectedLocation ? (
            <>
              <div className="ca-panel-heading">
                <div className="ca-panel-icon">
                  <House size={23} />
                </div>

                <div>
                  <small>REGISTERED LOCATION</small>
                  <h2>{selectedLocation.location_code}</h2>
                </div>
              </div>

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

              <div className="ca-coordinates">
                <small>GPS COORDINATES</small>
                <strong>
                  {selectedLocation.latitude.toFixed(6)}
                  {", "}
                  {selectedLocation.longitude.toFixed(6)}
                </strong>
              </div>

              {detailsLoading && (
                <p className="ca-muted">
                  Loading family information...
                </p>
              )}

              {detailsError && (
                <div className="ca-map-error" role="alert">
                  {detailsError}
                </div>
              )}

              {details && !detailsLoading && (
                <>
                  <div className="ca-family-stats">
                    <div>
                      <House size={18} />
                      <strong>{details.families.length}</strong>
                      <span>Families</span>
                    </div>

                    <div>
                      <Users size={18} />
                      <strong>{details.people.length}</strong>
                      <span>Individuals</span>
                    </div>
                  </div>

                  {details.families.length === 0 && (
                    <p className="ca-muted">
                      No active families are registered
                      at this location.
                    </p>
                  )}

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
                        <div className="ca-family-heading">
                          <h3>{family.family_name}</h3>
                          <span>{family.family_code}</span>
                        </div>

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
                <small>LATITUDE, LONGITUDE</small>

                <strong>
                  {selectedPoint.lat.toFixed(6)}
                  {", "}
                  {selectedPoint.lng.toFixed(6)}
                </strong>
              </div>

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
                We'll add location registration in Step 7.
              </p>
            </div>
          ) : (
            <>
              <div className="ca-panel-heading">
                <div className="ca-panel-icon">
                  <MapPin size={24} />
                </div>

                <div>
                  <small>LOCATION DIRECTORY</small>
                  <h2>Registered Locations</h2>
                </div>
              </div>

              <p className="ca-muted">
                Select a green marker or search your
                registered addresses below.
              </p>

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
