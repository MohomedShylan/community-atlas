
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

// ============================================
// FIX: MAPLIBRE WORKER FOR VITE
//
// This import tells Vite to bundle the
// MapLibre worker and its dependencies.
//
// Important: use ?worker&url, NOT ?url.
// ============================================

import maplibreWorkerUrl from
  "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// ============================================
// MAP CONFIGURATION
// ============================================

const SOURCE_ID =
  "ca-dashboard-locations";

const CLUSTER_LAYER_ID =
  "ca-dashboard-clusters";

const CLUSTER_COUNT_LAYER_ID =
  "ca-dashboard-cluster-count";

const POINT_LAYER_ID =
  "ca-dashboard-points";

const DEFAULT_CENTER = [80.75, 7.87];

const EMPTY_GEOJSON = {
  type: "FeatureCollection",
  features: [],
};

// ============================================
// VALIDATE LOCATION COORDINATES
// ============================================

function isValidLocation(location) {
  if (
    location?.latitude == null ||
    location?.longitude == null
  ) {
    return false;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

// ============================================
// BUILD GEOJSON
// ============================================

function buildGeoJSON(locations = []) {
  const features = [];

  for (const location of locations) {
    if (!isValidLocation(location)) {
      continue;
    }

    features.push({
      type: "Feature",

      geometry: {
        type: "Point",

        coordinates: [
          Number(location.longitude),
          Number(location.latitude),
        ],
      },

      // Do not expose personal information
      // in the map source.
      properties: {},
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ============================================
// FIT MAP TO REGISTERED LOCATIONS
// ============================================

function fitMapToLocations(map, geojson) {
  const coordinates = geojson.features.map(
    (feature) => feature.geometry.coordinates
  );

  if (coordinates.length === 0) {
    map.jumpTo({
      center: DEFAULT_CENTER,
      zoom: 7,
    });

    return;
  }

  if (coordinates.length === 1) {
    map.jumpTo({
      center: coordinates[0],
      zoom: 13,
    });

    return;
  }

  // Avoid excessively zooming in when
  // multiple locations share coordinates.
  const first = coordinates[0];

  const samePosition = coordinates.every(
    ([lng, lat]) =>
      lng === first[0] &&
      lat === first[1]
  );

  if (samePosition) {
    map.jumpTo({
      center: first,
      zoom: 13,
    });

    return;
  }

  const bounds = new maplibregl.LngLatBounds(
    first,
    first
  );

  for (const point of coordinates) {
    bounds.extend(point);
  }

  map.fitBounds(bounds, {
    padding: 45,
    maxZoom: 13,
    duration: 0,
  });
}

// ============================================
// CREATE GEOJSON MARKER LAYERS
// ============================================

function addLocationLayers(map) {
  // ========================================
  // CLUSTER CIRCLES
  // ========================================

  map.addLayer({
    id: CLUSTER_LAYER_ID,

    type: "circle",

    source: SOURCE_ID,

    filter: [
      "has",
      "point_count",
    ],

    paint: {
      "circle-color": "#087f69",

      "circle-radius": [
        "step",
        ["get", "point_count"],
        17,
        10,
        22,
        50,
        28,
      ],

      "circle-opacity": 0.95,

      "circle-stroke-width": 2,

      "circle-stroke-color": "#ffffff",
    },
  });

  // ========================================
  // CLUSTER COUNT LABELS
  // ========================================

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,

    type: "symbol",

    source: SOURCE_ID,

    filter: [
      "has",
      "point_count",
    ],

    layout: {
      "text-field": [
        "get",
        "point_count_abbreviated",
      ],

      "text-size": 12,

      "text-allow-overlap": true,
    },

    paint: {
      "text-color": "#ffffff",
    },
  });

  // ========================================
  // INDIVIDUAL LOCATION CIRCLES
  // ========================================

  map.addLayer({
    id: POINT_LAYER_ID,

    type: "circle",

    source: SOURCE_ID,

    filter: [
      "!",
      ["has", "point_count"],
    ],

    paint: {
      "circle-radius": 7,

      "circle-color": "#087f69",

      "circle-stroke-width": 2,

      "circle-stroke-color": "#ffffff",
    },
  });
}

// ============================================
// DASHBOARD LIVE MAP
// ============================================

export default function DashboardLiveMap({
  apiKey,
  locations = [],
}) {
  // ========================================
  // REFS
  // ========================================

  const containerRef = useRef(null);
  const mapRef = useRef(null);

  // ========================================
  // STATES
  // ========================================

  const [mapReady, setMapReady] =
    useState(false);

  const [mapError, setMapError] =
    useState("");

  // ========================================
  // CONVERT SUPABASE DATA TO GEOJSON
  // ========================================

  const geojson = useMemo(
    () => buildGeoJSON(locations),
    [locations]
  );

  // ========================================
  // INITIALIZE MAPLIBRE
  // ========================================

  useEffect(() => {
    if (
      !containerRef.current ||
      !apiKey
    ) {
      return undefined;
    }

    let disposed = false;

    setMapReady(false);
    setMapError("");

    // ======================================
    // IMPORTANT VITE WORKER FIX
    //
    // Configure the bundled worker URL
    // before creating the MapLibre map.
    // ======================================

    maplibregl.setWorkerUrl(
      maplibreWorkerUrl
    );

    const styleUrl =
      "https://api.maptiler.com/maps/" +
      "streets-v2/style.json?key=" +
      encodeURIComponent(apiKey);

    let map;

    try {
      map = new maplibregl.Map({
        container: containerRef.current,

        style: styleUrl,

        center: DEFAULT_CENTER,

        zoom: 7,

        // Dashboard is only a preview.
        // Map Explorer remains interactive.
        interactive: false,

        attributionControl: true,

        fadeDuration: 0,
      });

      mapRef.current = map;

      // ====================================
      // HANDLE SUCCESSFUL MAP LOAD
      // ====================================

      function handleLoad() {
        if (disposed) return;

        try {
          if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, {
              type: "geojson",

              data: EMPTY_GEOJSON,

              cluster: true,

              clusterMaxZoom: 14,

              clusterRadius: 45,
            });
          }

          addLocationLayers(map);

          setMapReady(true);
          setMapError("");
        } catch (error) {
          if (!disposed) {
            setMapError(
              error.message ||
              "Could not initialize location markers."
            );
          }
        }
      }

      // ====================================
      // HANDLE MAP ERROR
      // ====================================

      function handleError(event) {
        if (disposed) return;

        const message =
          event?.error?.message ||
          "An unexpected map resource error occurred.";

        if (import.meta.env.DEV) {
          console.error(
            "[Community Atlas] Dashboard map:",
            message
          );
        }

        // Avoid incorrectly reporting every
        // map failure as an invalid API key.
        setMapError(message);
      }

      map.on("load", handleLoad);
      map.on("error", handleError);

      // ====================================
      // CLEANUP
      // ====================================

      return () => {
        disposed = true;

        map.off("load", handleLoad);
        map.off("error", handleError);

        map.remove();

        if (mapRef.current === map) {
          mapRef.current = null;
        }
      };
    } catch (error) {
      setMapError(
        error.message ||
        "Failed to initialize the dashboard map."
      );

      return undefined;
    }
  }, [apiKey]);

  // ========================================
  // UPDATE THE GEOJSON SOURCE
  // ========================================

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    const source = map.getSource(SOURCE_ID);

    if (!source) {
      return;
    }

    // Update the existing source without
    // destroying or rebuilding the map.
    source.setData(geojson);

    // Center the map on actual locations.
    fitMapToLocations(
      map,
      geojson
    );
  }, [geojson, mapReady]);

  // ========================================
  // COMPONENT OUTPUT
  // ========================================

  return (
    <div className="ca-dashboard-live-map">

      <div
        ref={containerRef}
        className="ca-dashboard-map-canvas"
        role="img"
        aria-label={
          `Map showing ${geojson.features.length} ` +
          "registered GPS locations"
        }
      />

      {mapError && (
        <div
          className="ca-dashboard-map-error"
          role="alert"
        >
          {mapError}
        </div>
      )}

    </div>
  );
}
