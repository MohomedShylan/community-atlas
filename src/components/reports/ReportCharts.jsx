
import { useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#087f69",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#64748b",
];

function EmptyChart({ message }) {
  return (
    <div className="ca-report-chart-empty">
      {message || "No data available"}
    </div>
  );
}

// ==========================================
// GEOGRAPHIC BAR CHART
// ==========================================

function GeographyChart({
  title,
  description,
  rows,
  metric,
}) {
  // Show up to 10 places in the graph.
  // All places remain available in the
  // breakdown table and PDF/CSV exports.
  const data = rows.slice(0, 10);

  const chartHeight = Math.max(
    260,
    data.length * 43
  );

  return (
    <section className="ca-report-panel">
      <div className="ca-report-panel-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div
          className="ca-report-chart"
          role="img"
          aria-label={`${title} by ${
            metric === "families"
              ? "active families"
              : "individuals"
          }`}
        >
          <ResponsiveContainer
            width="100%"
            height={chartHeight}
          >
            <BarChart
              layout="vertical"
              data={data}
              margin={{
                top: 6,
                right: 24,
                left: 0,
                bottom: 6,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
              />

              <XAxis
                type="number"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="label"
                width={116}
                tick={{
                  fontSize: 11,
                }}
                tickFormatter={(value) =>
                  value.length > 18
                    ? `${value.slice(0, 17)}…`
                    : value
                }
              />

              <Tooltip
                formatter={(value) => [
                  value,
                  metric === "families"
                    ? "Families"
                    : "Individuals",
                ]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.fullLabel ||
                  payload?.[0]?.payload?.label ||
                  ""
                }
              />

              <Bar
                dataKey={metric}
                fill="#087f69"
                radius={[0, 5, 5, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ==========================================
// PIE / DONUT CHART
// ==========================================

function DistributionChart({
  title,
  description,
  data,
}) {
  const total = data.reduce(
    (sum, item) =>
      sum + Number(item.value || 0),
    0
  );

  return (
    <section className="ca-report-panel">
      <div className="ca-report-panel-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {total === 0 ? (
        <EmptyChart message="No individual data available" />
      ) : (
        <div className="ca-report-chart">
          <ResponsiveContainer
            width="100%"
            height={310}
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="43%"
                innerRadius={55}
                outerRadius={92}
                paddingAngle={2}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={
                      COLORS[index % COLORS.length]
                    }
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) => [
                  value,
                  "Individuals",
                ]}
              />

              <Legend
                verticalAlign="bottom"
                wrapperStyle={{
                  fontSize: "11px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ==========================================
// HOUSEHOLD SIZE BAR CHART
// ==========================================

function HouseholdSizeChart({ data }) {
  const total = data.reduce(
    (sum, item) =>
      sum + Number(item.families || 0),
    0
  );

  return (
    <section className="ca-report-panel">
      <div className="ca-report-panel-heading">
        <h3>Household Size Distribution</h3>
        <p>
          Number of active families grouped by
          their active member count.
        </p>
      </div>

      {total === 0 ? (
        <EmptyChart />
      ) : (
        <div className="ca-report-chart">
          <ResponsiveContainer
            width="100%"
            height={310}
          >
            <BarChart
              data={data}
              margin={{
                top: 12,
                right: 14,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
              />

              <YAxis
                allowDecimals={false}
              />

              <Tooltip
                formatter={(value) => [
                  value,
                  "Families",
                ]}
              />

              <Bar
                dataKey="families"
                fill="#3b82f6"
                maxBarSize={46}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ==========================================
// MAIN REPORT CHARTS
// ==========================================

export default function ReportCharts({ report }) {
  const [metric, setMetric] =
    useState("people");

  const districtData = (
    report.districts ?? []
  ).map((row) => ({
    ...row,
    label: row.name,
    fullLabel: row.name,
  }));

  const villageData = (
    report.villages ?? []
  ).map((row) => ({
    ...row,
    label: row.name,
    fullLabel:
      `${row.name} (${row.district})`,
  }));

  return (
    <div className="ca-report-chart-section">
      {/* METRIC SELECTOR */}
      <div className="ca-report-chart-toolbar">
        <div>
          <h2>Interactive Analytics</h2>

          <p>
            Hover over chart elements to view
            their values.
          </p>
        </div>

        <div
          className="ca-report-metric-switch"
          role="group"
          aria-label="Geographic chart metric"
        >
          <button
            type="button"
            className={
              metric === "people"
                ? "is-active"
                : ""
            }
            aria-pressed={metric === "people"}
            onClick={() =>
              setMetric("people")
            }
          >
            Individuals
          </button>

          <button
            type="button"
            className={
              metric === "families"
                ? "is-active"
                : ""
            }
            aria-pressed={metric === "families"}
            onClick={() =>
              setMetric("families")
            }
          >
            Families
          </button>
        </div>
      </div>

      {/* GEOGRAPHIC CHARTS */}
      <div className="ca-report-chart-grid">
        <GeographyChart
          title="District Distribution"
          description="Districts with registered active families."
          rows={districtData}
          metric={metric}
        />

        <GeographyChart
          title="Village Distribution"
          description="Top 10 village/district combinations."
          rows={villageData}
          metric={metric}
        />

        <DistributionChart
          title="Age Distribution"
          description="Age calculated from recorded dates of birth."
          data={report.ages ?? []}
        />

        <DistributionChart
          title="Recorded Gender Distribution"
          description="Optional gender information recorded during registration."
          data={report.genders ?? []}
        />

        <HouseholdSizeChart
          data={report.household_sizes ?? []}
        />
      </div>
    </div>
  );
}
