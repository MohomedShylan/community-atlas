import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/dashboardService";
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
  UserPlus,
  Navigation,
  ClipboardList,
} from "lucide-react";

// Temporary example data.
// Replace with Supabase queries in a later step.
const statistics = [
  {
    label: "Total Households",
    value: "300",
    subtitle: "Example registered families",
    icon: House,
    tone: "blue",
  },
  {
    label: "Total Individuals",
    value: "1,000",
    subtitle: "Example population",
    icon: Users,
    tone: "purple",
  },
  {
    label: "Mapped Locations",
    value: "284",
    subtitle: "Example pinned households",
    icon: MapPin,
    tone: "green",
  },
  {
    label: "Missing Locations",
    value: "16",
    subtitle: "Example records needing GPS",
    icon: AlertCircle,
    tone: "orange",
  },
];

const recentActivities = [
  {
    id: 1,
    title: "Household registered",
    description: "Example household H-0182",
    icon: House,
    tone: "blue",
  },
  {
    id: 2,
    title: "Location updated",
    description: "Example household H-0067",
    icon: MapPin,
    tone: "green",
  },
  {
    id: 3,
    title: "Individual added",
    description: "Example person P-0361",
    icon: UserPlus,
    tone: "purple",
  },
];

const quickLinks = [
  {
    title: "Explore Map",
    description: "View household locations",
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

// A decorative map preview, not real geographic data.
function MapPreview() {
  const markers = [
    { x: 178, y: 100 },
    { x: 432, y: 148 },
    { x: 615, y: 94 },
    { x: 303, y: 287 },
    { x: 647, y: 312 },
  ];

  return (
    <div className="dashboard-map-preview">
      <div
        className="illustrative-map"
        role="img"
        aria-label="Illustrative neighborhood map with five sample household markers"
      >
        <svg
          viewBox="0 0 800 420"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect width="800" height="420" fill="#e9f0e5" />

          <path
            d="M0 0H235L180 145H0Z"
            fill="#d2e6ce"
          />
          <path
            d="M540 0H800V180L625 155Z"
            fill="#d3e6d0"
          />
          <path
            d="M0 285L210 260L330 420H0Z"
            fill="#d8e9d2"
          />
          <path
            d="M520 260L800 210V420H560Z"
            fill="#d4e8d1"
          />

          {/* Road shadows */}
          <g fill="none" stroke="#cbd8cf" strokeWidth="42">
            <path d="M-50 200L850 235" />
            <path d="M240 -40L330 470" />
            <path d="M610 -40L550 470" />
            <path d="M-30 350L850 45" />
          </g>

          {/* Roads */}
          <g fill="none" stroke="#ffffff" strokeWidth="30">
            <path d="M-50 200L850 235" />
            <path d="M240 -40L330 470" />
            <path d="M610 -40L550 470" />
            <path d="M-30 350L850 45" />
          </g>

          {/* Small buildings */}
          <g fill="#b9cdb9" stroke="#a6c0a8" strokeWidth="2">
            <rect x="70" y="60" width="53" height="38" rx="4" />
            <rect x="335" y="38" width="76" height="49" rx="4" />
            <rect x="685" y="62" width="58" height="47" rx="4" />
            <rect x="75" y="275" width="64" height="52" rx="4" />
            <rect x="395" y="298" width="72" height="43" rx="4" />
            <rect x="695" y="320" width="68" height="50" rx="4" />
          </g>

          {/* Illustrative household markers */}
          {markers.map((point, index) => (
            <g
              key={index}
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle r="22" fill="#16856c" opacity="0.15" />
              <path
                d="M0 -22C-13 -22 -20 -13 -20 -3C-20 11 0 27 0 27S20 11 20 -3C20 -13 13 -22 0 -22Z"
                fill="#087f69"
                stroke="#ffffff"
                strokeWidth="3"
              />
              <circle cy="-4" r="7" fill="#ffffff" />
            </g>
          ))}
        </svg>
      </div>

      <div className="map-preview-label">
        <Info size={15} />
        Illustrative map preview
      </div>

      <div className="map-preview-count">
        <MapPin size={19} />
        <div>
          <strong>284</strong>
          <span>Example mapped households</span>
        </div>
      </div>
    </div>
  );
}

function StatisticCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${item.tone}`}>
          <Icon size={23} strokeWidth={2} />
        </div>

            <span className="stat-sample">
                 {item.isLive ? "LIVE" : "—"}
            </span>
      </div>

      <div className="stat-card-body">
        <p className="stat-label">{item.label}</p>
        <h3>{item.value}</h3>
        <p className="stat-subtitle">{item.subtitle}</p>
      </div>
    </article>
  );
}


function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const data = await getDashboardStats();

        if (active) {
          setStats(data);
          setStatsError("");
        }
      } catch (error) {
        if (active) {
          setStatsError(error.message);
        }
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  const values = stats
    ? [
        stats.totalFamilies,
        stats.totalIndividuals,
        stats.mappedLocations,
        stats.missingLocations,
      ]
    : [];

  const displayStatistics = statistics.map((item, index) => ({
    ...item,
    value: stats ? values[index].toLocaleString() : "—",
    subtitle: stats
      ? [
          "Registered families",
          "Registered individuals",
          "Locations with GPS",
          "Locations without GPS",
        ][index]
      : loadingStats
        ? "Loading..."
        : "Unavailable",
    isLive: Boolean(stats),
  }));

  return (

    <div className="dashboard-page">
      {/* Welcome section */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-eyebrow">
            COMMUNITY MANAGEMENT SYSTEM
          </span>

          <h1>Your community, clearly mapped.</h1>

          <p>
            Organize households, manage individual records,
            and explore locations from one centralized workspace.
          </p>

          <div className="hero-actions">
            <Link to="/map" className="btn btn-primary">
              <MapPinned size={18} />
              Explore Map
              <ArrowRight size={17} />
            </Link>

            <Link to="/households" className="btn btn-outline-light">
              View Households
            </Link>
          </div>
        </div>

        <div className="hero-illustration" aria-hidden="true">
          <div className="hero-circle hero-circle-one" />
          <div className="hero-circle hero-circle-two" />

          <div className="hero-main-icon">
            <MapPinned size={67} strokeWidth={1.4} />
          </div>
        </div>
      </section>

      {/* Demo notice */}
     
<div className="dashboard-demo-notice">
  <Info size={18} />
  <p>
    {statsError
      ? `Unable to load dashboard statistics: ${statsError}`
      : loadingStats
        ? "Loading community statistics..."
        : "Statistics are live. The map illustration and recent activity are still sample previews."}
  </p>
</div>


      {/* Statistics */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Community Overview</h2>
                <p>Statistics retrieved from Supabase</p>          </div>

          <span className="section-tag">Sample data</span>
        </div>

        <div className="stats-grid">
          {displayStatistics.map((item) => (
            <StatisticCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Map and activity */}
      <div className="dashboard-grid">
        <section className="dashboard-panel map-panel">
          <div className="panel-header">
            <div>
              <h2>Location Overview</h2>
              <p>Illustrative household distribution</p>
            </div>

            <div className="panel-header-icon">
              <MapPinned size={20} />
            </div>
          </div>

          <MapPreview />

          <div className="panel-footer">
            <span>Google Maps integration is coming next.</span>

            <Link to="/map" className="text-link">
              Open Map Explorer
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        <section className="dashboard-panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Examples of future activity records</p>
            </div>

            <div className="panel-header-icon">
              <ClipboardList size={20} />
            </div>
          </div>

          <div className="activity-list">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div className="activity-item" key={activity.id}>
                  <div
                    className={`activity-icon activity-icon-${activity.tone}`}
                  >
                    <Icon size={19} />
                  </div>

                  <div className="activity-content">
                    <strong>{activity.title}</strong>
                    <p>{activity.description}</p>
                  </div>

                  <span className="activity-sample-label">
                    Demo
                  </span>
                </div>
              );
            })}
          </div>

          <div className="activity-footer">
            <Info size={16} />
            <span>
              Live activity history will be connected to Supabase.
            </span>
          </div>
        </section>
      </div>

      {/* Quick navigation */}
      <section className="dashboard-section quick-access-section">
        <div className="section-heading">
          <div>
            <h2>Quick Access</h2>
            <p>Navigate to frequently used sections</p>
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
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
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

      <footer className="dashboard-footer">
        <span>Community Atlas — Development Preview</span>
        <span>
          <Navigation size={14} />
          Built for family and location management
        </span>
      </footer>
    </div>
  );
}

export default Dashboard;
