
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import {
  House,
  Users,
  MapPin,
  MapPinned,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Info,
  Navigation,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

import {
  getDashboardStats,
} from "../services/dashboardService";

import {
  getMappedLocations,
} from "../services/locationService";

import "../styles/dashboard-live-map.css";

// Load the MapLibre bundle separately.
const DashboardLiveMap = lazy(
  () => import(
    "../components/dashboard/DashboardLiveMap"
  )
);

const mapTilerKey =
  import.meta.env.VITE_MAPTILER_API_KEY;

// ==========================================
// STATISTIC DEFINITIONS
// ==========================================

const statisticDefinitions = [
  {
    key: "totalFamilies",
    label: "Total Households",
    subtitle: "Registered active families",
    icon: House,
    tone: "blue",
  },
  {
    key: "totalIndividuals",
    label: "Total Individuals",
    subtitle: "Registered active individuals",
    icon: Users,
    tone: "purple",
  },
  {
    key: "mappedLocations",
    label: "Mapped Locations",
    subtitle: "Locations with GPS coordinates",
    icon: MapPin,
    tone: "green",
  },
  {
    key: "missingLocations",
    label: "Missing Locations",
    subtitle: "Locations needing GPS information",
    icon: AlertCircle,
    tone: "orange",
  },
];

// ==========================================
// QUICK ACCESS LINKS
// ==========================================

const quickLinks = [
  {
    title: "Explore Map",
    description: "View registered locations",
    path: "/map",
    icon: MapPinned,
  },
  {
    title: "Households",
    description: "Browse registered families",
    path: "/households",
    icon: House,
  },
  {
    title: "People Directory",
    description: "Browse individual records",
    path: "/people",
    icon: Users,
  },
];

// ==========================================
// NUMBER FORMATTER
// ==========================================

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

// ==========================================
// CHECK VALID COORDINATES
// ==========================================

function hasValidCoordinates(location) {
  if (
    location?.latitude == null ||
    location?.longitude == null
  ) {
    return false;
  }

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// ==========================================
// STATISTIC CARD
// ==========================================

function StatisticCard({
  item,
  loading,
  isLive,
}) {
  const Icon = item.icon;

  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <div
          className={
            `stat-icon stat-icon-${item.tone}`
          }
        >
          <Icon
            size={23}
            strokeWidth={2}
          />
        </div>

        <span className="stat-sample">
          {isLive ? "LIVE" : "—"}
        </span>
      </div>

      <div className="stat-card-body">
        <p className="stat-label">
          {item.label}
        </p>

        <h3>
          {isLive
            ? formatNumber(item.value)
            : "—"}
        </h3>

        <p className="stat-subtitle">
          {loading
            ? "Loading..."
            : isLive
              ? item.subtitle
              : "Currently unavailable"}
        </p>
      </div>
    </article>
  );
}

// ==========================================
// LIVE COMMUNITY SNAPSHOT
// ==========================================

function CommunitySnapshot({
  stats,
  loading,
}) {
  if (loading) {
    return (
      <div
        className="activity-footer"
        role="status"
      >
        Loading community information...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="activity-footer">
        <Info size={17} />

        <span>
          Community statistics could not
          be loaded. Please try again later.
        </span>
      </div>
    );
  }

  const mapped = Number(
    stats.mappedLocations ?? 0
  );

  const missing = Number(
    stats.missingLocations ?? 0
  );

  const totalLocations = mapped + missing;

  const coverage = totalLocations > 0
    ? Math.round(
        (mapped / totalLocations) * 100
      )
    : 0;

  const items = [
    {
      key: "families",
      title: "Active Households",
      description:
        `${formatNumber(stats.totalFamilies)} ` +
        "registered families",
      icon: House,
      tone: "blue",
    },
    {
      key: "people",
      title: "Registered Individuals",
      description:
        `${formatNumber(stats.totalIndividuals)} ` +
        "active people",
      icon: Users,
      tone: "purple",
    },
    {
      key: "coverage",
      title: "GPS Coverage",
      description: totalLocations > 0
        ? `${coverage}% of active locations have GPS`
        : "No locations registered yet",
      icon: MapPin,
      tone: "green",
    },
  ];

  return (
    <>
      <div className="activity-list">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="activity-item"
              key={item.key}
            >
              <div
                className={
                  `activity-icon activity-icon-${item.tone}`
                }
              >
                <Icon size={19} />
              </div>

              <div className="activity-content">
                <strong>{item.title}</strong>

                <p>{item.description}</p>
              </div>

              <CheckCircle2
                size={17}
                color="#087f69"
                aria-label="Live data"
              />
            </div>
          );
        })}
      </div>

      <div className="activity-footer">
        <Info size={16} />

        <span>
          Current totals retrieved from Supabase.
          This is a data summary, not an
          activity-history or audit feed.
        </span>
      </div>
    </>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

export default function Dashboard() {
  // ========================================
  // LIVE SUPABASE STATISTICS
  // ========================================

  const [stats, setStats] =
    useState(null);

  const [loadingStats, setLoadingStats] =
    useState(true);

  const [statsError, setStatsError] =
    useState("");

  // ========================================
  // LIVE REGISTERED LOCATIONS
  // ========================================

  const [locations, setLocations] =
    useState([]);

  const [loadingMap, setLoadingMap] =
    useState(true);

  const [mapError, setMapError] =
    useState("");

  // ========================================
  // LOAD DASHBOARD DATA
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      // Keep failures independent:
      // map can work even if statistics fail,
      // and vice versa.
      const [statsResult, locationsResult] =
        await Promise.allSettled([
          getDashboardStats(),
          getMappedLocations(),
        ]);

      if (!active) return;

      // STATISTICS
      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
        setStatsError("");
      } else {
        setStats(null);

        setStatsError(
          statsResult.reason?.message ||
          "Could not load dashboard statistics."
        );
      }

      // MAP LOCATIONS
      if (locationsResult.status === "fulfilled") {
        setLocations(
          Array.isArray(locationsResult.value)
            ? locationsResult.value
            : []
        );

        setMapError("");
      } else {
        setLocations([]);

        setMapError(
          locationsResult.reason?.message ||
          "Could not load mapped locations."
        );
      }

      setLoadingStats(false);
      setLoadingMap(false);
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // COUNT REAL MAPPED POINTS
  // ========================================

  const mappedPoints = useMemo(
    () =>
      locations.filter(
        hasValidCoordinates
      ),
    [locations]
  );

  // ========================================
  // DISPLAY STATISTICS
  // ========================================

  const displayStatistics =
    statisticDefinitions.map((item) => ({
      ...item,
      value: stats?.[item.key] ?? null,
    }));

  // ========================================
  // DASHBOARD UI
  // ========================================

  return (
    <div className="dashboard-page">

      {/* ====================================
          WELCOME SECTION
      ==================================== */}

      <section className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-eyebrow">
            COMMUNITY MANAGEMENT SYSTEM
          </span>

          <h1>
            Your community, clearly mapped.
          </h1>

          <p>
            Organize households, manage individual
            records, and explore locations from
            one centralized workspace.
          </p>

          <div className="hero-actions">
            <Link
              to="/map"
              className="btn btn-primary"
            >
              <MapPinned size={18} />
              Explore Map
              <ArrowRight size={17} />
            </Link>

            <Link
              to="/households"
              className="btn btn-outline-light"
            >
              View Households
            </Link>
          </div>
        </div>

        <div
          className="hero-illustration"
          aria-hidden="true"
        >
          <div className="hero-circle hero-circle-one" />
          <div className="hero-circle hero-circle-two" />

          <div className="hero-main-icon">
            <MapPinned
              size={67}
              strokeWidth={1.4}
            />
          </div>
        </div>
      </section>

      {/* ====================================
          ERROR NOTICE
      ==================================== */}

      {statsError && (
        <div
          className="dashboard-demo-notice"
          role="alert"
        >
          <AlertCircle size={18} />

          <p>
            Unable to load statistics:
            {" "}
            {statsError}
          </p>
        </div>
      )}

      {/* ====================================
          LIVE STATISTICS
      ==================================== */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>
              Community Overview
            </h2>

            <p>
              Current statistics from Supabase
            </p>
          </div>

          <span className="section-tag">
            {loadingStats
              ? "Loading"
              : stats
                ? "Live Data"
                : "Unavailable"}
          </span>
        </div>

        <div className="stats-grid">
          {displayStatistics.map((item) => (
            <StatisticCard
              key={item.key}
              item={item}
              loading={loadingStats}
              isLive={Boolean(stats)}
            />
          ))}
        </div>
      </section>

      {/* ====================================
          LOCATION MAP AND COMMUNITY SNAPSHOT
      ==================================== */}

      <div className="dashboard-grid">

        {/* LIVE MAP PANEL */}

        <section className="dashboard-panel map-panel">
          <div className="panel-header">
            <div>
              <h2>
                Location Overview
              </h2>

              <p>
                Real registered locations
                displayed with MapLibre
              </p>
            </div>

            <div className="panel-header-icon">
              <MapPinned size={20} />
            </div>
          </div>

          {/* REAL MAP PREVIEW */}

          <div className="ca-dashboard-map-shell">
            {loadingMap ? (
              <div
                className="ca-dashboard-map-state"
                role="status"
              >
                <MapPinned size={31} />

                <strong>
                  Loading registered locations...
                </strong>
              </div>
            ) : mapError ? (
              <div
                className="ca-dashboard-map-state"
                role="alert"
              >
                <AlertCircle size={31} />

                <strong>
                  Unable to load map locations
                </strong>

                <p>{mapError}</p>
              </div>
            ) : !mapTilerKey ? (
              <div className="ca-dashboard-map-state">
                <MapPin size={31} />

                <strong>
                  MapTiler configuration required
                </strong>

                <p>
                  Add VITE_MAPTILER_API_KEY
                  to your Vite environment.
                </p>
              </div>
            ) : (
              <>
                <Suspense
                  fallback={
                    <div
                      className="ca-dashboard-map-state"
                      role="status"
                    >
                      Preparing live map...
                    </div>
                  }
                >
                  <DashboardLiveMap
                    apiKey={mapTilerKey}
                    locations={mappedPoints}
                  />
                </Suspense>

                <div className="ca-dashboard-map-count">
                  <MapPin size={18} />

                  <div>
                    <strong>
                      {formatNumber(
                        mappedPoints.length
                      )}
                    </strong>

                    <span>
                      Registered GPS locations
                    </span>
                  </div>
                </div>

                {mappedPoints.length === 0 && (
                  <div className="ca-dashboard-map-empty">
                    No registered locations
                    have valid GPS coordinates yet.
                  </div>
                )}
              </>
            )}
          </div>

          {/* MAP PANEL FOOTER */}

          <div className="panel-footer">
            <span>
              MapLibre + MapTiler · Live locations
            </span>

            <Link
              to="/map"
              className="text-link"
            >
              Open Map Explorer

              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        {/* LIVE COMMUNITY SUMMARY */}

        <section className="dashboard-panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>
                Community Snapshot
              </h2>

              <p>
                Current household and
                population information
              </p>
            </div>

            <div className="panel-header-icon">
              <ClipboardList size={20} />
            </div>
          </div>

          <CommunitySnapshot
            stats={stats}
            loading={loadingStats}
          />
        </section>
      </div>

      {/* ====================================
          QUICK ACCESS
      ==================================== */}

      <section className="dashboard-section quick-access-section">
        <div className="section-heading">
          <div>
            <h2>
              Quick Access
            </h2>

            <p>
              Navigate to frequently used sections
            </p>
          </div>
        </div>

        <div className="quick-links-grid">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                to={item.path}
                className="quick-link-card"
                key={item.path}
              >
                <div className="quick-link-icon">
                  <Icon size={22} />
                </div>

                <div className="quick-link-text">
                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.description}
                  </span>
                </div>

                <ArrowRight
                  size={18}
                  className="quick-link-arrow"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ====================================
          FOOTER
      ==================================== */}

      <footer className="dashboard-footer">
        <span>
          Community Atlas — Live Workspace
        </span>

        <span>
          <Navigation size={14} />
          Supabase + MapLibre
        </span>
      </footer>

    </div>
  );
}
