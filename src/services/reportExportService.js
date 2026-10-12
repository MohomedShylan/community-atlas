
// ==========================================
// COMMUNITY ATLAS
// AGGREGATE REPORT EXPORT SERVICE
// ==========================================

function reportDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1)
    .padStart(2, "0");
  const day = String(now.getDate())
    .padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function reportFilename(extension) {
  return `community-atlas-report-${reportDate()}.${extension}`;
}

function number(value) {
  return Number(value ?? 0);
}

function getAreaLabel(report) {
  const { district, village } =
    report.selected_filters ?? {};

  return [
    district || "All districts",
    village || "All villages",
  ].join(" / ");
}

const summaryLabels = [
  ["families", "Active families"],
  ["individuals", "Active individuals"],
  ["locations_in_use", "Locations in use"],
  ["mapped_locations", "Mapped locations in use"],
  [
    "families_needing_mapping",
    "Families needing GPS mapping",
  ],
  ["average_family_size", "Average family size"],
  ["districts", "Districts represented"],
  ["villages", "Village/district combinations"],
];

// ==========================================
// CSV HELPERS
// ==========================================

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  // Avoid spreadsheet formula injection when
  // location names are opened in Excel.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvRows(report) {
  const rows = [
    [
      "Section",
      "Category",
      "District",
      "Families",
      "Individuals",
      "Value",
    ],
  ];

  const summary = report.summary ?? {};

  for (const [key, label] of summaryLabels) {
    rows.push([
      "Summary",
      label,
      "",
      "",
      "",
      summary[key] ?? 0,
    ]);
  }

  for (const row of report.districts ?? []) {
    rows.push([
      "District",
      row.name,
      row.name,
      number(row.families),
      number(row.people),
      number(row.mapped_families),
    ]);
  }

  for (const row of report.villages ?? []) {
    rows.push([
      "Village",
      row.name,
      row.district,
      number(row.families),
      number(row.people),
      "",
    ]);
  }

  for (const row of report.ages ?? []) {
    rows.push([
      "Age group",
      row.name,
      "",
      "",
      number(row.value),
      "",
    ]);
  }

  for (const row of report.genders ?? []) {
    rows.push([
      "Gender",
      row.name,
      "",
      "",
      number(row.value),
      "",
    ]);
  }

  for (const row of report.household_sizes ?? []) {
    rows.push([
      "Household size",
      row.name,
      "",
      number(row.families),
      "",
      "",
    ]);
  }

  return rows;
}

// ==========================================
// DOWNLOAD CSV
// ==========================================

export function exportReportCsv(report) {
  if (!report?.summary) {
    throw new Error("No report data to export.");
  }

  const rows = buildCsvRows(report);

  const metadata = [
    ["Community Atlas Aggregate Report"],
    ["Generated at", report.generated_at ?? ""],
    ["Selected area", getAreaLabel(report)],
    [],
  ];

  const csv = [...metadata, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  // UTF-8 BOM improves Unicode import in Excel.
  const blob = new Blob(
    ["\uFEFF", csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = reportFilename("csv");

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ==========================================
// DOWNLOAD PDF
// ==========================================

export async function exportReportPdf(report) {
  if (!report?.summary) {
    throw new Error("No report data to export.");
  }

  // Load PDF libraries only when exporting.
  const [{ jsPDF }, { autoTable }] =
    await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const green = [8, 127, 105];
  const dark = [35, 55, 74];
  const grey = [108, 123, 137];

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const left = 14;
  const right = 14;

  let y = 20;

  // ----------------------------------------
  // PDF HEADER
  // ----------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...green);

  doc.text(
    "COMMUNITY ATLAS",
    left,
    y
  );

  y += 9;

  doc.setFontSize(12);
  doc.setTextColor(...dark);

  doc.text(
    "Community Statistics and Analytics",
    left,
    y
  );

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grey);

  doc.text(
    `Report date: ${reportDate()}`,
    left,
    y
  );

  y += 6;

  const areaLines = doc.splitTextToSize(
    `Selected area: ${getAreaLabel(report)}`,
    pageWidth - left - right
  );

  doc.text(areaLines, left, y);

  y += areaLines.length * 4.5 + 7;

  doc.setDrawColor(210, 226, 217);
  doc.line(left, y, pageWidth - right, y);

  y += 10;

  // ----------------------------------------
  // REUSABLE TABLE HELPER
  // ----------------------------------------

  function addTable(title, columns, rows) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);

    doc.text(title, left, y);

    y += 5;

    autoTable(doc, {
      startY: y,

      head: [columns],

      body: rows.length
        ? rows
        : [columns.map(
            (_, index) =>
              index === 0 ? "No data" : ""
          )],

      margin: {
        left,
        right,
        top: 16,
        bottom: 16,
      },

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3.2,
        overflow: "linebreak",
        valign: "middle",
      },

      headStyles: {
        fillColor: green,
        textColor: 255,
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [245, 249, 247],
      },

      theme: "grid",
    });

    y = (
      doc.lastAutoTable?.finalY ?? y
    ) + 13;
  }

  // ----------------------------------------
  // SUMMARY
  // ----------------------------------------

  addTable(
    "Overview",
    ["Statistic", "Value"],
    summaryLabels.map(([key, label]) => [
      label,
      String(report.summary[key] ?? 0),
    ])
  );

  // ----------------------------------------
  // DISTRICTS
  // ----------------------------------------

  addTable(
    "District Breakdown",
    [
      "District",
      "Families",
      "People",
      "Mapped families",
    ],
    (report.districts ?? []).map((row) => [
      row.name,
      String(number(row.families)),
      String(number(row.people)),
      String(number(row.mapped_families)),
    ])
  );

  // ----------------------------------------
  // VILLAGES
  // ----------------------------------------

  addTable(
    "Village Breakdown",
    ["District", "Village", "Families", "People"],
    (report.villages ?? []).map((row) => [
      row.district,
      row.name,
      String(number(row.families)),
      String(number(row.people)),
    ])
  );

  // ----------------------------------------
  // AGE GROUPS
  // ----------------------------------------

  addTable(
    "Age Distribution",
    ["Age group", "People"],
    (report.ages ?? []).map((row) => [
      row.name,
      String(number(row.value)),
    ])
  );

  // ----------------------------------------
  // RECORDED GENDER
  // ----------------------------------------

  addTable(
    "Recorded Gender Distribution",
    ["Gender", "People"],
    (report.genders ?? []).map((row) => [
      row.name,
      String(number(row.value)),
    ])
  );

  // ----------------------------------------
  // FAMILY SIZES
  // ----------------------------------------

  addTable(
    "Household Size Distribution",
    ["Active members", "Families"],
    (report.household_sizes ?? []).map((row) => [
      row.name,
      String(number(row.families)),
    ])
  );

  // ----------------------------------------
  // PAGE NUMBERS AND FOOTER
  // ----------------------------------------

  const pageCount =
    doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const footerY =
      doc.internal.pageSize.getHeight() - 10;

    doc.setDrawColor(225, 232, 229);
    doc.line(
      left,
      footerY - 5,
      pageWidth - right,
      footerY - 5
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...grey);

    doc.text(
      "Community Atlas - Aggregate statistics only",
      left,
      footerY
    );

    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - right,
      footerY,
      { align: "right" }
    );
  }

  doc.save(reportFilename("pdf"));
}
