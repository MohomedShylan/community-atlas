
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Map as LibreMap,
  Marker,
  NavigationControl,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";

import workerUrl from
  "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import HouseholdMarker from "./HouseholdMarker";

setWorkerUrl(workerUrl);

const DEFAULT_CENTER = [80.7718, 7.8731];

// MapLibre coordinate order:
// [longitude, latitude]

export default function MapLibreMap({
  apiKey,
  locations,
  selectedLocationId,
  focusTarget,
  selectedPoint,
  onSelectLocation,
  onSelectPoint,
  onMapError,

  // NEW: Optional marker dragging.
  // Defaults to false for Map Explorer.
  allowDragSelectedPoint = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const fittedRef = useRef(false);

  const onSelectPointRef =
    useRef(onSelectPoint);

  const [map, setMap] = useState(null);

  useEffect(() => {
    onSelectPointRef.current =
      onSelectPoint;
  }, [onSelectPoint]);

  // ========================================
  // INITIALIZE MAP
  // ========================================

  useEffect(() => {
    if (
      !containerRef.current ||
      !apiKey
    ) {
      return;
    }

    const instance = new LibreMap({
      container: containerRef.current,

      style:
        `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(apiKey)}`,

      center: DEFAULT_CENTER,
      zoom: 7.2,
      minZoom: 3,
      maxZoom: 19,

      attributionControl: true,
    });

    mapRef.current = instance;
    fittedRef.current = false;

    instance.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
      }),
      "top-right"
    );

    const handleClick = (event) => {
      onSelectPointRef.current?.({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      });
    };

    const handleError = (event) => {
      console.error(
        "MapLibre error:",
        event.error
      );

      onMapError?.(
        event.error?.message ||
        "The map provider could not load a resource."
      );
    };

    instance.on(
      "click",
      handleClick
    );

    instance.on(
      "error",
      handleError
    );

    setMap(instance);

    return () => {
      instance.off(
        "click",
        handleClick
      );

      instance.off(
        "error",
        handleError
      );

      instance.remove();

      mapRef.current = null;
    };
  }, [apiKey, onMapError]);

  // ========================================
  // FIT REGISTERED LOCATIONS
  // ========================================

  useEffect(() => {
    if (
      !map ||
      !locations.length ||
      fittedRef.current
    ) {
      return;
    }

    const fitLocations = () => {
      if (fittedRef.current) return;

      fittedRef.current = true;

      if (locations.length === 1) {
        map.jumpTo({
          center: [
            locations[0].longitude,
            locations[0].latitude,
          ],
          zoom: 15,
        });
        return;
      }

      const bounds =
        new LngLatBounds();

      locations.forEach((location) => {
        bounds.extend([
          location.longitude,
          location.latitude,
        ]);
      });

      map.fitBounds(bounds, {
        padding: 55,
        maxZoom: 16,
        duration: 0,
      });
    };

    if (map.isStyleLoaded()) {
      fitLocations();
    } else {
      map.once(
        "load",
        fitLocations
      );
    }

    return () => {
      map.off(
        "load",
        fitLocations
      );
    };
  }, [map, locations]);

  // ========================================
  // FOCUS MAP ON TARGET
  // ========================================

  useEffect(() => {
    if (
      !map ||
      !focusTarget
    ) {
      return;
    }

    map.flyTo({
      center: [
        focusTarget.lng,
        focusTarget.lat,
      ],
      zoom:
        focusTarget.zoom ?? 16,
      essential: true,
    });
  }, [map, focusTarget]);

  // ========================================
  // SELECTED POINT MARKER
  //
  // Supports dragging when explicitly
  // enabled by the Location Editor.
  // ========================================

  useEffect(() => {
    if (
      !map ||
      !selectedPoint
    ) {
      return;
    }

    const element =
      document.createElement("div");

    element.className =
      "ca-selected-point";

    if (
      selectedPoint.kind === "place"
    ) {
      element.classList.add(
        "is-search-result"
      );
    }

    const marker = new Marker({
      element,
      anchor: "bottom",

      // NEW
      draggable:
        allowDragSelectedPoint,
    })
      .setLngLat([
        selectedPoint.lng,
        selectedPoint.lat,
      ])
      .addTo(map);

    // NEW: Update coordinates after drag.

    if (allowDragSelectedPoint) {
      marker.on("dragend", () => {
        const position =
          marker.getLngLat();

        onSelectPointRef.current?.({
          lng: position.lng,
          lat: position.lat,
        });
      });
    }

    return () => {
      marker.remove();
    };
  }, [
    map,
    selectedPoint,
    allowDragSelectedPoint,
  ]);

  // ========================================
  // MAP DISPLAY
  // ========================================

  return (
    <div className="ca-map-container">

      <div
        ref={containerRef}
        className="ca-map-canvas"
        aria-label="Interactive household map"
      />

      {map &&
        locations.map((location) => (
          <HouseholdMarker
            key={location.id}
            map={map}
            location={location}
            selected={
              selectedLocationId ===
              location.id
            }
            onSelect={onSelectLocation}
          />
        ))}

    </div>
  );
}
