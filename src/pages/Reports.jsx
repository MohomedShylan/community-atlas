
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  House,
  Users,
  MapPin,
  MapPinned,
  Building2,
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getCommunityReport,
} from "../services/reportService";

import {
  exportReportCsv,
  exportReportPdf,
} from "../services/reportExportService";

import ReportCharts from
  "../components/reports/ReportCharts";

// ==========================================
// SMALL STATISTICS CARD
// ==========================================

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
}) {
  return (
    <article className="ca-report-stat">
      <div className="ca-report-stat-top">
        <span>{title}</span>

        <div className="ca-report-stat-icon">
          <Icon size={21} />
        </div>
      </div>

      <strong>
        {value}
      </strong>

      <p>{subtitle}</p>
    </article>
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    "en-LK"
  ).format(Number(value ?? 0));
}

function formatGeneratedAt(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ==========================================
// MAIN REPORT PAGE
// ==========================================

export default function Reports() {
  const { profile } = useAuth();

  const canExport =
    profile?.role === "admin" ||
    profile?.role === "editor";

  const [district, setDistrict] =
    useState("");

  const [village, setVillage] =
    useState("");

  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [exportError, setExportError] =
    useState("");

  const [exporting, setExporting] =
    useState("");

  const [revision, setRevision] =
    useState(0);

  // ========================================
  // LOAD REPORT
  // ========================================

  useEffect(() => {
    if (!profile) {
      return;
    }

    let active = true;

    setLoading(true);
    setError("");

    getCommunityReport({
      district,
      village,
    })
      .then((data) => {
        if (active) {
          setReport(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
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
    profile,
    district,
    village,
    revision,
  ]);

  // ========================================
  // FILTER OPTIONS
  // ========================================

  const districts =
    report?.filters?.districts ?? [];

  const villageOptions = useMemo(() => {
    const entries =
      report?.filters?.villages ?? [];

    return entries.filter(
      (entry) =>
        !district ||
        entry.district === district
    );
  }, [report, district]);

  function changeDistrict(value) {
    setDistrict(value);
    setVillage("");
  }

  function clearFilters() {
    setDistrict("");
    setVillage("");
  }

  function refreshReport() {
    setRevision((current) => current + 1);
  }

  // ========================================
  // EXPORT CURRENT FILTERED REPORT
  // ========================================

  async function handleExport(type) {
    if (!canExport || exporting) {
      return;
    }

    setExportError("");
    setExporting(type);

    try {
      // Request a fresh report from PostgreSQL
      // with the additional export permission
      // check enabled.
      const freshReport =
        await getCommunityReport(
          {
            district,
            village,
          },
          {
            forExport: true,
          }
        );

      if (type === "csv") {
        exportReportCsv(freshReport);
      } else {
        await exportReportPdf(freshReport);
      }
    } catch (err) {
      setExportError(
        err.message ||
        "The report could not be exported."
      );
    } finally {
      setExporting("");
    }
  }

  // ========================================
  // CURRENT STATISTICS
  // ========================================

  const summary = report?.summary ?? {};

  return (
    <div className="ca-reports-page">
      {/* HEADER */}
      <header className="ca-reports-header">
        <div>
          <span className="ca-reports-eyebrow">
            COMMUNITY ATLAS / ANALYTICS
          </span>

          <h1>Reports & Statistics</h1>

          <p>
            Explore live community statistics
            based on registered households
            and individuals.
          </p>
        </div>

        <div className="ca-reports-header-actions">
          <button
            type="button"
            className="ca-report-secondary"
            onClick={refreshReport}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {canExport && (
            <>
              <button
                type="button"
                className="ca-report-secondary"
                onClick={() =>
                  handleExport("csv")
                }
                disabled={
                  loading ||
                  !report ||
                  Boolean(exporting)
                }
              >
                <Download size={17} />

                {exporting === "csv"
                  ? "Exporting..."
                  : "Export CSV"}
              </button>

              <button
                type="button"
                className="ca-report-primary"
                onClick={() =>
                  handleExport("pdf")
                }
                disabled={
                  loading ||
                  !report ||
                  Boolean(exporting)
                }
              >
                <FileText size={17} />

                {exporting === "pdf"
                  ? "Creating PDF..."
                  : "Export PDF"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* FILTER PANEL */}
      <section className="ca-report-filter-panel">
        <div>
          <h2>Filter Community Report</h2>

          <p>
            Select a district or village to update
            every statistic and chart.
          </p>
        </div>

        <div className="ca-report-filter-grid">
          <label>
            District

            <select
              value={district}
              disabled={loading}
              onChange={(event) =>
                changeDistrict(
                  event.target.value
                )
              }
            >
              <option value="">
                All Districts
              </option>

              {districts.map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Village

            <select
              value={village}
              disabled={loading && !report}
              onChange={(event) =>
                setVillage(event.target.value)
              }
            >
              <option value="">
                All Villages
              </option>

              {villageOptions.map((entry) => (
                <option
                  key={`${entry.district}-${entry.village}`}
                  value={entry.village}
                >
                  {entry.village}
                  {!district
                    ? ` (${entry.district})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ca-report-clear"
            onClick={clearFilters}
            disabled={
              !district && !village
            }
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* PERMISSION NOTE */}
      <div className="ca-report-access-note">
        <ShieldCheck size={17} />

        <span>
          {canExport
            ? "Aggregate reporting and CSV/PDF export are available to your account."
            : "You have read-only access to aggregate community reports."}
        </span>
      </div>

      {/* LOADING */}
      {loading && (
        <section
          className="ca-report-state"
          role="status"
        >
          Loading live community analytics...
        </section>
      )}

      {/* LOAD ERROR */}
      {error && (
        <section
          className="ca-report-error"
          role="alert"
        >
          <AlertCircle size={20} />

          <div>
            <strong>
              Unable to load reports
            </strong>

            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
          >
            Try Again
          </button>
        </section>
      )}

      {/* EXPORT ERROR */}
      {exportError && (
        <div
          className="ca-report-error"
          role="alert"
        >
          <AlertCircle size={19} />
          {exportError}
        </div>
      )}

      {/* LIVE REPORT */}
      {!loading && !error && report && (
        <>
          {/* REPORT METADATA */}
          <div className="ca-report-meta">
            <span>
              <MapPin size={16} />

              {district || "All districts"}
              {" / "}
              {village || "All villages"}
            </span>

            <span>
              Last generated:{" "}
              {formatGeneratedAt(
                report.generated_at
              )}
            </span>
          </div>

          {/* SUMMARY METRICS */}
          <section
            className="ca-report-stats-grid"
            aria-label="Community statistics"
          >
            <StatCard
              icon={House}
              title="Active Families"
              value={formatNumber(
                summary.families
              )}
              subtitle="Households currently active"
            />

            <StatCard
              icon={Users}
              title="Active Individuals"
              value={formatNumber(
                summary.individuals
              )}
              subtitle="People in active families"
            />

            <StatCard
              icon={MapPinned}
              title="Mapped Locations"
              value={formatNumber(
                summary.mapped_locations
              )}
              subtitle="GPS locations with active families"
            />

            <StatCard
              icon={MapPin}
              title="Families Needing GPS"
              value={formatNumber(
                summary.families_needing_mapping
              )}
              subtitle="Active families without mapped GPS"
            />

            <StatCard
              icon={Building2}
              title="Average Family Size"
              value={Number(
                summary.average_family_size ?? 0
              ).toFixed(1)}
              subtitle="Active people per active family"
            />

            <StatCard
              icon={BarChart3}
              title="Districts Represented"
              value={formatNumber(
                summary.districts
              )}
              subtitle={`${formatNumber(
                summary.villages
              )} village/district combinations`}
            />
          </section>

          {/* INTERACTIVE CHARTS */}
          <ReportCharts report={report} />

          {/* DISTRICT TABLE */}
          <section className="ca-report-panel">
            <div className="ca-report-panel-heading">
              <h3>District Statistics</h3>
              <p>
                All districts in the selected
                reporting area.
              </p>
            </div>

            <div className="ca-report-table-wrap">
              <table className="ca-report-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Families</th>
                    <th>Individuals</th>
                    <th>Mapped Families</th>
                  </tr>
                </thead>

                <tbody>
                  {report.districts.map(
                    (row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>

                        <td>
                          {formatNumber(
                            row.families
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            row.people
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            row.mapped_families
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {report.districts.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        No matching district records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* VILLAGE TABLE */}
          <section className="ca-report-panel">
            <div className="ca-report-panel-heading">
              <h3>Village Statistics</h3>

              <p>
                Active households and residents
                by village.
              </p>
            </div>

            <div className="ca-report-table-wrap">
              <table className="ca-report-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Village</th>
                    <th>Families</th>
                    <th>Individuals</th>
                  </tr>
                </thead>

                <tbody>
                  {report.villages.map(
                    (row, index) => (
                      <tr
                        key={
                          `${row.district}-${row.name}-${index}`
                        }
                      >
                        <td>{row.district}</td>
                        <td>{row.name}</td>

                        <td>
                          {formatNumber(
                            row.families
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            row.people
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {report.villages.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        No matching village records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* DATA EXPLANATION */}
          <div className="ca-report-footnote">
            <strong>How these figures are calculated:</strong>

            <p>
              Only active individuals belonging
              to active families at active locations
              are counted. Locations shared by multiple
              families count once in the mapped-location
              metric. Families without usable GPS
              coordinates are counted separately.
              Age groups are calculated from stored
              dates of birth, and missing values
              are reported as Unknown or Not recorded.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
