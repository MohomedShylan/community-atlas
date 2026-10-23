
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MapPin, Save } from "lucide-react";

import MapLibreMap from "../map/MapLibreMap";

import "maplibre-gl/dist/maplibre-gl.css";
import "../../styles/map.css";

const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY;

const EMPTY_EDIT_MAP_LOCATIONS = [];

// ==========================================
// COORDINATE VALIDATION
// ==========================================

function isValidPoint(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    latitude != null &&
    longitude != null &&
    String(latitude).trim() !== "" &&
    String(longitude).trim() !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// ==========================================
// EDIT HOUSEHOLD LOCATION
// ==========================================

export default function HouseholdLocationEditor({
  location,
  familyCount,
  saving,
  onSave,
}) {
  // EXISTING SAVED VALUES

  const [addressLine, setAddressLine] = useState(
    location.address_line ?? ""
  );

  const [latitude, setLatitude] = useState(
    String(location.latitude ?? "")
  );

  const [longitude, setLongitude] = useState(
    String(location.longitude ?? "")
  );

  const [confirmShared, setConfirmShared] =
    useState(false);

  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");

  // PLACE SEARCH

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  // OPTIONAL ADDRESS LOOKUP

  const [
    suggestedAddress,
    setSuggestedAddress,
  ] = useState("");

  const [
    lookingUpAddress,
    setLookingUpAddress,
  ] = useState(false);

  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      reverseAbortRef.current?.abort();
    };
  }, []);

  // ========================================
  // START MAP AT CURRENT LOCATION
  // ========================================

  const [mapFocus, setMapFocus] = useState(
    () =>
      isValidPoint(
        location.latitude,
        location.longitude
      )
        ? {
            lat: Number(location.latitude),
            lng: Number(location.longitude),
            zoom: 16,
          }
        : null
  );

  const selectedPoint = useMemo(
    () =>
      isValidPoint(latitude, longitude)
        ? {
            lat: Number(latitude),
            lng: Number(longitude),
            kind: "manual",
          }
        : null,
    [latitude, longitude]
  );

  const handleMapError = useCallback(
    (message) => {
      setMapError(
        message || "The map could not be loaded."
      );
    },
    []
  );

  // ========================================
  // UPDATE GPS FROM MAP
  // ========================================

  const updateCoordinates = useCallback(
    ({ lat, lng }) => {
      if (!isValidPoint(lat, lng)) return;

      reverseAbortRef.current?.abort();

      setLookingUpAddress(false);

      setLatitude(
        Number(lat).toFixed(6)
      );

      setLongitude(
        Number(lng).toFixed(6)
      );

      setSuggestedAddress("");
      setMapError("");
    },
    []
  );

  // ========================================
  // CENTER MAP ON MANUALLY ENTERED GPS
  // ========================================

  function focusOnCoordinates() {
    if (!isValidPoint(latitude, longitude)) {
      setError(
        "Enter valid latitude and longitude first."
      );
      return;
    }

    setError("");

    setMapFocus({
      lat: Number(latitude),
      lng: Number(longitude),
      zoom: 16,
    });
  }

  // ========================================
  // SEARCH PUBLIC PLACES USING MAPTILER
  // ========================================

  async function handlePlaceSearch() {
    const query = searchQuery.trim();

    if (
      !MAPTILER_API_KEY ||
      query.length < 2
    ) {
      return;
    }

    searchAbortRef.current?.abort();

    const controller = new AbortController();

    searchAbortRef.current = controller;

    setSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const url = new URL(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`
      );

      url.searchParams.set(
        "key",
        MAPTILER_API_KEY
      );

      url.searchParams.set("country", "lk");
      url.searchParams.set("limit", "5");
      url.searchParams.set(
        "autocomplete",
        "false"
      );

      const response = await fetch(
        url,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Place search failed (${response.status}).`
        );
      }

      const json = await response.json();

      const places = (
        json.features ?? []
      )
        .filter(
          (feature) =>
            Array.isArray(feature.center) &&
            feature.center.length >= 2
        )
        .map((feature) => ({
          id: feature.id,

          lat: Number(
            feature.center[1]
          ),

          lng: Number(
            feature.center[0]
          ),

          label: String(
            feature.place_name ??
            feature.text ??
            "Unnamed place"
          ),
        }))
        .filter((place) =>
          isValidPoint(
            place.lat,
            place.lng
          )
        );

      if (!controller.signal.aborted) {
        setSearchResults(places);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setSearchError(
          err.message ||
          "Place search failed."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }

  // ========================================
  // CHOOSE PUBLIC SEARCH RESULT
  // ========================================

  function choosePlace(place) {
    updateCoordinates(place);

    setMapFocus({
      lat: place.lat,
      lng: place.lng,
      zoom: 16,
    });

    setSuggestedAddress(
      place.label.slice(0, 300)
    );

    setSearchQuery(place.label);
    setSearchResults([]);
  }

  // ========================================
  // OPTIONAL NEARBY ADDRESS LOOKUP
  //
  // Does not overwrite saved address.
  // User must accept the suggestion.
  // ========================================

  async function findNearbyAddress() {
    if (
      !MAPTILER_API_KEY ||
      !selectedPoint
    ) {
      setSearchError(
        "Select a valid map point first."
      );
      return;
    }

    reverseAbortRef.current?.abort();

    const controller = new AbortController();

    reverseAbortRef.current = controller;

    setLookingUpAddress(true);
    setSearchError("");
    setSuggestedAddress("");

    try {
      const url = new URL(
        `https://api.maptiler.com/geocoding/${selectedPoint.lng},${selectedPoint.lat}.json`
      );

      url.searchParams.set(
        "key",
        MAPTILER_API_KEY
      );

      url.searchParams.set(
        "limit",
        "1"
      );

      const response = await fetch(
        url,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Address lookup failed (${response.status}).`
        );
      }

      const json = await response.json();

      const result = (
        json.features ?? []
      ).find(
        (feature) =>
          feature.place_name ||
          feature.text
      );

      const label = String(
        result?.place_name ??
        result?.text ??
        ""
      ).trim();

      if (!label) {
        throw new Error(
          "No nearby address found. Enter it manually."
        );
      }

      if (!controller.signal.aborted) {
        setSuggestedAddress(
          label.slice(0, 300)
        );
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setSearchError(
          err.message ||
          "Address lookup failed."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLookingUpAddress(false);
      }
    }
  }

  // ========================================
  // SAVE EXISTING LOCATION
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (
      !addressLine.trim() ||
      !isValidPoint(
        latitude,
        longitude
      )
    ) {
      setError(
        "Enter a street address and valid GPS coordinates."
      );
      return;
    }

    // Preserve existing shared-location
    // confirmation behavior.

    if (
      familyCount > 1 &&
      !confirmShared
    ) {
      setError(
        "Confirm that changes to this location affect all families sharing it."
      );
      return;
    }

    try {
      await onSave({
        addressLine:
          addressLine.trim(),

        latitude:
          Number(latitude),

        longitude:
          Number(longitude),

        // Important: preserve these database
        // fields even though they are hidden.

        village:
          location.village ?? null,

        district:
          location.district ?? null,

        confirmShared,
      });
    } catch (err) {
      setError(
        err.message ||
        "Could not update location."
      );
    }
  }

  // ========================================
  // RENDER EDIT LOCATION FORM
  // ========================================

  return (
    <form
      className="ca-edit-form ca-location-edit-form"
      onSubmit={handleSubmit}
    >
      <h2>
        Edit location: {location.location_code}
      </h2>

      <p className="ca-edit-muted">
        Changing this location moves the map
        marker for every family linked to it.
      </p>

      {/* STREET ADDRESS */}

      <div className="ca-edit-grid">
        <label className="ca-edit-wide">
          Street address

          <input
            required
            maxLength={300}
            value={addressLine}
            disabled={saving}
            onChange={(event) =>
              setAddressLine(
                event.target.value
              )
            }
          />
        </label>
      </div>

      {/* MAP LOCATION PICKER */}

      <div className="ca-location-picker">
        <h3>
          <MapPin size={18} />
          Choose location on map
        </h3>

        <p className="ca-edit-muted">
          Click anywhere on the map or drag
          the yellow marker to update the
          coordinates. You can also search
          for a nearby public place.
        </p>

        {MAPTILER_API_KEY ? (
          <>
            {/* PUBLIC PLACE SEARCH */}

            <div className="ca-location-search-row">
              <input
                type="search"
                aria-label="Search a public place"
                placeholder="Search a road, town, or public place in Sri Lanka"
                maxLength={120}
                value={searchQuery}
                disabled={saving}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    event.preventDefault();

                    void handlePlaceSearch();
                  }
                }}
              />

              <button
                type="button"
                className="ca-edit-secondary"
                disabled={
                  saving ||
                  searching ||
                  searchQuery.trim().length < 2
                }
                onClick={() =>
                  void handlePlaceSearch()
                }
              >
                {searching
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>

            {/* SEARCH RESULTS */}

            {searchResults.length > 0 && (
              <div className="ca-location-search-results">
                {searchResults.map(
                  (place, index) => (
                    <button
                      type="button"
                      key={`${place.id ?? "place"}-${index}`}
                      disabled={saving}
                      onClick={() =>
                        choosePlace(place)
                      }
                    >
                      <MapPin size={15} />
                      {place.label}
                    </button>
                  )
                )}
              </div>
            )}

            {/* INTERACTIVE MAP */}

            <div className="ca-map-area ca-location-picker-map">
              <MapLibreMap
                apiKey={MAPTILER_API_KEY}
                locations={
                  EMPTY_EDIT_MAP_LOCATIONS
                }
                selectedLocationId={null}
                focusTarget={mapFocus}
                selectedPoint={selectedPoint}
                onSelectPoint={updateCoordinates}
                onMapError={handleMapError}
                allowDragSelectedPoint
              />
            </div>

            {/* MAP TOOLS */}

            <div className="ca-location-picker-tools">
              <button
                type="button"
                className="ca-edit-secondary"
                disabled={
                  saving ||
                  !selectedPoint
                }
                onClick={focusOnCoordinates}
              >
                Center map on coordinates
              </button>

              <button
                type="button"
                className="ca-edit-secondary"
                disabled={
                  saving ||
                  lookingUpAddress ||
                  !selectedPoint
                }
                onClick={() =>
                  void findNearbyAddress()
                }
              >
                {lookingUpAddress
                  ? "Finding address..."
                  : "Find nearby address"}
              </button>
            </div>

            {/* OPTIONAL ADDRESS SUGGESTION */}

            {suggestedAddress && (
              <div className="ca-location-address-suggestion">
                <p>
                  <strong>
                    Suggested address:
                  </strong>{" "}
                  {suggestedAddress}
                </p>

                <button
                  className="ca-edit-secondary"
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setAddressLine(
                      suggestedAddress
                    )
                  }
                >
                  Use this address
                </button>
              </div>
            )}

            {mapError && (
              <p
                className="ca-edit-warning"
                role="status"
              >
                Map warning: {mapError}
              </p>
            )}

            <p className="ca-edit-muted">
              Address suggestions may be
              approximate. Review the street
              address before saving. Selecting
              a map point does not change it
              automatically.
            </p>
          </>
        ) : (
          <p
            className="ca-edit-warning"
            role="status"
          >
            Map unavailable:
            VITE_MAPTILER_API_KEY is not
            configured. You can still edit
            coordinates manually below.
          </p>
        )}

        {searchError && (
          <p
            className="ca-edit-error"
            role="alert"
          >
            {searchError}
          </p>
        )}
      </div>

      {/* GPS COORDINATES */}

      <div className="ca-edit-grid">
        <label>
          Latitude

          <input
            required
            type="number"
            step="any"
            min="-90"
            max="90"
            value={latitude}
            disabled={saving}
            onChange={(event) =>
              setLatitude(
                event.target.value
              )
            }
          />
        </label>

        <label>
          Longitude

          <input
            required
            type="number"
            step="any"
            min="-180"
            max="180"
            value={longitude}
            disabled={saving}
            onChange={(event) =>
              setLongitude(
                event.target.value
              )
            }
          />
        </label>
      </div>

      {/* SHARED-LOCATION CONFIRMATION */}

      {familyCount > 1 && (
        <label className="ca-edit-warning">
          <input
            type="checkbox"
            checked={confirmShared}
            disabled={saving}
            onChange={(event) =>
              setConfirmShared(
                event.target.checked
              )
            }
          />

          This location is shared by{" "}
          {familyCount} active families.
          I understand changes will affect
          all of them.
        </label>
      )}

      {/* SAVE ERROR */}

      {error && (
        <p
          className="ca-edit-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* SAVE LOCATION */}

      <button
        type="submit"
        className="ca-edit-primary"
        disabled={saving}
      >
        <Save size={16} />
        {saving
          ? "Saving..."
          : "Save location"}
      </button>
    </form>
  );
}
