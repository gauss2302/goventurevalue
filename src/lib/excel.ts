import * as ExcelJS from "exceljs";
import {
  calculateDCF,
  calculateFundingNeed,
  calculateProjections,
} from "@/lib/calculations";
import type {
  MarketSizing,
  ModelSettings,
  ProjectionData,
  ScenarioParams,
} from "@/lib/calculations";
import type { ScenarioType } from "@/lib/dto";

type ExportScenario = {
  scenarioType: ScenarioType;
  userGrowth: string;
  arpu: string;
  churnRate: string;
  farmerGrowth: string;
  cac: string;
};

type ExportModelData = {
  model: {
    name: string;
    currency: string;
  };
  scenarios: ExportScenario[];
  settings: ModelSettings;
  market: MarketSizing;
};

const scenarioOrder: ScenarioType[] = ["conservative", "base", "optimistic"];
const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  CNY: "¥",
};

const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatScenarioLabel = (scenario: ScenarioType) =>
  scenario === "conservative"
    ? "Conservative"
    : scenario === "base"
      ? "Base"
      : "Optimistic";

const currencyFormat = (currency: string) => {
  const symbol = currencySymbols[currency] ?? "$";
  return `${symbol}#,##0;[Red]-${symbol}#,##0`;
};

const percentValueFormat = '0.0"%"';
const percentFractionFormat = "0.0%";
const ratioFormat = "0.0";
const integerFormat = "#,##0";

const applyHeaderStyle = (cell: ExcelJS.Cell) => {
  cell.font = { bold: true, color: { argb: "FF1C1E2F" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF6F6FC" },
  };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FFE2E2E2" } },
  };
};

const applySectionStyle = (row: ExcelJS.Row) => {
  row.font = { bold: true, color: { argb: "FF4F46BA" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F1FD" },
  };
};

const applyTotalStyle = (row: ExcelJS.Row) => {
  row.font = { bold: true, color: { argb: "FF1C1E2F" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8F8FF" },
  };
};

const addEmptyRow = (sheet: ExcelJS.Worksheet) => {
  const row = sheet.addRow([]);
  row.height = 6;
};

const downloadBuffer = async (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getScenarioParams = (scenario?: ExportScenario): ScenarioParams => ({
  userGrowth: toNumber(scenario?.userGrowth),
  arpu: toNumber(scenario?.arpu),
  churnRate: toNumber(scenario?.churnRate),
  farmerGrowth: toNumber(scenario?.farmerGrowth),
  cac: toNumber(scenario?.cac),
});

const buildSummarySheet = (
  workbook: ExcelJS.Workbook,
  data: ExportModelData,
  projections: ProjectionData[]
) => {
  const sheet = workbook.addWorksheet("Summary");
  sheet.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 22 },
    { key: "note", width: 32 },
  ];

  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = `${data.model.name} — Summary`;
  sheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF1C1E2F" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };

  addEmptyRow(sheet);

  sheet.addRow(["Model", data.model.name, ""]);
  sheet.addRow(["Currency", data.model.currency, ""]);
  sheet.addRow(["Exported", new Date().toLocaleString(), ""]);
  addEmptyRow(sheet);

  const lastYear = projections[projections.length - 1];
  const dcf = calculateDCF(
    projections,
    data.settings.discountRate,
    data.settings.terminalGrowth
  );
  const fundingNeed = calculateFundingNeed(projections, data.settings.safetyBuffer);

  const kpiRows = [
    ["Last year revenue", lastYear.totalRevenue, "Total revenue in final year"],
    ["Last year EBITDA", lastYear.ebitda, "EBITDA in final year"],
    ["Gross margin", lastYear.grossMargin, "Final year gross margin"],
    ["Free cash flow", lastYear.freeCashFlow, "Final year FCF"],
    ["Enterprise value", dcf.enterpriseValue, "DCF value"],
    ["Funding need", fundingNeed, "Estimated runway gap"],
  ];

  sheet.addRow(["Key Metrics", "", ""]).font = { bold: true };
  const startRow = sheet.rowCount + 1;
  kpiRows.forEach((row) => sheet.addRow(row));

  const currencyFmt = currencyFormat(data.model.currency);
  sheet.getRow(startRow).getCell(2).numFmt = currencyFmt;
  sheet.getRow(startRow + 1).getCell(2).numFmt = currencyFmt;
  sheet.getRow(startRow + 2).getCell(2).numFmt = percentValueFormat;
  sheet.getRow(startRow + 3).getCell(2).numFmt = currencyFmt;
  sheet.getRow(startRow + 4).getCell(2).numFmt = currencyFmt;
  sheet.getRow(startRow + 5).getCell(2).numFmt = currencyFmt;

  return sheet;
};

const buildAssumptionsSheet = (workbook: ExcelJS.Workbook, data: ExportModelData) => {
  const sheet = workbook.addWorksheet("Assumptions");
  sheet.columns = [
    { key: "label", width: 26 },
    { key: "value", width: 18 },
    { key: "value2", width: 18 },
    { key: "value3", width: 18 },
  ];

  sheet.addRow(["Scenario assumptions"]);
  applySectionStyle(sheet.getRow(sheet.rowCount));

  sheet.addRow([
    "Metric",
    "Conservative",
    "Base",
    "Optimistic",
  ]).eachCell(applyHeaderStyle);

  const rows = [
    { label: "User growth", key: "userGrowth", format: percentFractionFormat },
    { label: "ARPU", key: "arpu", format: currencyFormat(data.model.currency) },
    { label: "Churn rate", key: "churnRate", format: percentFractionFormat },
    {
      label: "Farmer growth",
      key: "farmerGrowth",
      format: percentFractionFormat,
    },
    { label: "CAC", key: "cac", format: currencyFormat(data.model.currency) },
  ];

  rows.forEach((row) => {
    const values = scenarioOrder.map((scenario) => {
      const match = data.scenarios.find((s) => s.scenarioType === scenario);
      return toNumber((match as any)?.[row.key]);
    });
    const record = sheet.addRow([row.label, ...values]);
    record.getCell(2).numFmt = row.format;
    record.getCell(3).numFmt = row.format;
    record.getCell(4).numFmt = row.format;
  });

  addEmptyRow(sheet);

  sheet.addRow(["Model settings"]);
  applySectionStyle(sheet.getRow(sheet.rowCount));

  const settingsRows: Array<{ label: string; value: number; format: string }> = [
    { label: "Start users", value: data.settings.startUsers, format: integerFormat },
    { label: "Start farmers", value: data.settings.startFarmers, format: integerFormat },
    { label: "Tax rate", value: data.settings.taxRate, format: percentFractionFormat },
    { label: "Discount rate", value: data.settings.discountRate, format: percentFractionFormat },
    { label: "Terminal growth", value: data.settings.terminalGrowth, format: percentFractionFormat },
    { label: "Safety buffer", value: data.settings.safetyBuffer, format: currencyFormat(data.model.currency) },
  ];

  settingsRows.forEach((row) => {
    const record = sheet.addRow([row.label, row.value]);
    record.getCell(2).numFmt = row.format;
  });

  addEmptyRow(sheet);

  sheet.addRow(["Market sizing"]);
  applySectionStyle(sheet.getRow(sheet.rowCount));
  const marketRows: Array<[string, number]> = [
    ["TAM", data.market.tam],
    ["SAM", data.market.sam],
    ...data.market.som.map((value, index) => [`SOM Year ${index + 1}`, value]),
  ];
  marketRows.forEach((row) => {
    const record = sheet.addRow(row);
    record.getCell(2).numFmt = currencyFormat(data.model.currency);
  });

  return sheet;
};

const buildScenarioCompareSheet = (
  workbook: ExcelJS.Workbook,
  data: ExportModelData
) => {
  const sheet = workbook.addWorksheet("Scenario Compare");
  sheet.columns = [
    { key: "metric", width: 26 },
    { key: "cons", width: 18 },
    { key: "base", width: 18 },
    { key: "opt", width: 18 },
  ];

  sheet.addRow(["Metric", "Conservative", "Base", "Optimistic"]).eachCell(
    applyHeaderStyle
  );

  const rows = [
    { label: "User growth", key: "userGrowth", format: percentFractionFormat },
    { label: "ARPU", key: "arpu", format: currencyFormat(data.model.currency) },
    { label: "Churn rate", key: "churnRate", format: percentFractionFormat },
    { label: "Farmer growth", key: "farmerGrowth", format: percentFractionFormat },
    { label: "CAC", key: "cac", format: currencyFormat(data.model.currency) },
  ];

  rows.forEach((row) => {
    const values = scenarioOrder.map((scenario) => {
      const match = data.scenarios.find((s) => s.scenarioType === scenario);
      return toNumber((match as any)?.[row.key]);
    });
    const r = sheet.addRow([row.label, ...values]);
    r.getCell(2).numFmt = row.format;
    r.getCell(3).numFmt = row.format;
    r.getCell(4).numFmt = row.format;
  });

  return sheet;
};

const columnLetter = (index: number) => {
  let col = index;
  let letter = "";
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
};

const setRowFormulas = (
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  colStart: number,
  colEnd: number,
  buildFormula: (col: number) => string,
  values: number[],
  format: string
) => {
  for (let col = colStart; col <= colEnd; col += 1) {
    const cell = sheet.getCell(rowIndex, col);
    cell.value = {
      formula: buildFormula(col),
      result: values[col - colStart],
    };
    cell.numFmt = format;
  }
};

const buildPnLSheet = (
  workbook: ExcelJS.Workbook,
  label: string,
  projections: ProjectionData[],
  currency: string,
  taxRate: number
) => {
  const sheet = workbook.addWorksheet(`P&L - ${label}`);
  const years = projections.map((p) => p.year);
  sheet.columns = [
    { key: "metric", width: 30 },
    ...years.map(() => ({ key: "year", width: 14 })),
  ];
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];

  sheet.mergeCells(1, 1, 1, years.length + 1);
  sheet.getCell(1, 1).value = `P&L — ${label}`;
  sheet.getCell(1, 1).font = { size: 14, bold: true };

  sheet.addRow(["Tax rate", ...years.map(() => taxRate)]).eachCell((cell, col) => {
    if (col > 1) cell.numFmt = percentFractionFormat;
  });
  addEmptyRow(sheet);

  const headerRow = sheet.addRow(["Metric", ...years]);
  headerRow.eachCell(applyHeaderStyle);

  const rowIndex: Record<string, number> = {};
  const addRow = (
    key: string,
    label: string,
    values: number[],
    format: string,
    isTotal = false
  ) => {
    const row = sheet.addRow([label, ...values]);
    rowIndex[key] = row.number;
    row.eachCell((cell, col) => {
      if (col > 1) cell.numFmt = format;
    });
    if (isTotal) applyTotalStyle(row);
  };
  const addSection = (title: string) => {
    const row = sheet.addRow([title]);
    applySectionStyle(row);
  };

  const currencyFmt = currencyFormat(currency);
  const colStart = 2;
  const colEnd = years.length + 1;

  addSection("Revenue");
  addRow(
    "platformRevenue",
    "Platform revenue",
    projections.map((p) => p.platformRevenue),
    currencyFmt
  );
  addRow(
    "farmerRevShare",
    "Farmer revenue share",
    projections.map((p) => p.farmerRevShare),
    currencyFmt
  );
  addRow(
    "b2bRevenue",
    "B2B revenue",
    projections.map((p) => p.b2bRevenue),
    currencyFmt
  );
  addRow(
    "totalRevenue",
    "Total revenue",
    projections.map((p) => p.totalRevenue),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.totalRevenue,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.platformRevenue}+${columnLetter(col)}${rowIndex.farmerRevShare}+${columnLetter(col)}${rowIndex.b2bRevenue}`,
    projections.map((p) => p.totalRevenue),
    currencyFmt
  );

  addSection("COGS");
  addRow(
    "hostingCosts",
    "Hosting costs",
    projections.map((p) => p.hostingCosts),
    currencyFmt
  );
  addRow(
    "paymentProcessing",
    "Payment processing",
    projections.map((p) => p.paymentProcessing),
    currencyFmt
  );
  addRow(
    "customerSupport",
    "Customer support",
    projections.map((p) => p.customerSupport),
    currencyFmt
  );
  addRow(
    "cogs",
    "COGS",
    projections.map((p) => p.cogs),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.cogs,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.hostingCosts}+${columnLetter(col)}${rowIndex.paymentProcessing}+${columnLetter(col)}${rowIndex.customerSupport}`,
    projections.map((p) => p.cogs),
    currencyFmt
  );
  addRow(
    "grossProfit",
    "Gross profit",
    projections.map((p) => p.grossProfit),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.grossProfit,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.totalRevenue}-${columnLetter(col)}${rowIndex.cogs}`,
    projections.map((p) => p.grossProfit),
    currencyFmt
  );
  addRow(
    "grossMargin",
    "Gross margin",
    projections.map((p) => p.grossMargin),
    percentValueFormat
  );
  setRowFormulas(
    sheet,
    rowIndex.grossMargin,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.grossProfit}/${columnLetter(col)}${rowIndex.totalRevenue}*100`,
    projections.map((p) => p.grossMargin),
    percentValueFormat
  );

  addSection("Operating Expenses");
  addRow(
    "personnel",
    "Personnel",
    projections.map((p) => p.personnel),
    currencyFmt
  );
  addRow(
    "marketing",
    "Marketing",
    projections.map((p) => p.marketing),
    currencyFmt
  );
  addRow("rd", "R&D", projections.map((p) => p.rd), currencyFmt);
  addRow("gna", "G&A", projections.map((p) => p.gna), currencyFmt);
  addRow(
    "opex",
    "OPEX",
    projections.map((p) => p.opex),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.opex,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.personnel}+${columnLetter(col)}${rowIndex.marketing}+${columnLetter(col)}${rowIndex.rd}+${columnLetter(col)}${rowIndex.gna}`,
    projections.map((p) => p.opex),
    currencyFmt
  );

  addSection("EBITDA");
  addRow(
    "ebitda",
    "EBITDA",
    projections.map((p) => p.ebitda),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.ebitda,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.grossProfit}-${columnLetter(col)}${rowIndex.opex}`,
    projections.map((p) => p.ebitda),
    currencyFmt
  );
  addRow(
    "ebitdaMargin",
    "EBITDA margin",
    projections.map((p) => p.ebitdaMargin),
    percentValueFormat
  );
  setRowFormulas(
    sheet,
    rowIndex.ebitdaMargin,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.ebitda}/${columnLetter(col)}${rowIndex.totalRevenue}*100`,
    projections.map((p) => p.ebitdaMargin),
    percentValueFormat
  );

  addSection("Depreciation & Taxes");
  addRow(
    "depreciation",
    "Depreciation",
    projections.map((p) => p.depreciation),
    currencyFmt
  );
  addRow(
    "ebit",
    "EBIT",
    projections.map((p) => p.ebit),
    currencyFmt
  );
  setRowFormulas(
    sheet,
    rowIndex.ebit,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.ebitda}-${columnLetter(col)}${rowIndex.depreciation}`,
    projections.map((p) => p.ebit),
    currencyFmt
  );
  addRow(
    "taxes",
    "Taxes",
    projections.map((p) => p.taxes),
    currencyFmt
  );
  setRowFormulas(
    sheet,
    rowIndex.taxes,
    colStart,
    colEnd,
    (col) =>
      `MAX(0,${columnLetter(col)}${rowIndex.ebit}*${columnLetter(col)}2)`,
    projections.map((p) => p.taxes),
    currencyFmt
  );
  addRow(
    "netIncome",
    "Net income",
    projections.map((p) => p.netIncome),
    currencyFmt,
    true
  );
  setRowFormulas(
    sheet,
    rowIndex.netIncome,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.ebit}-${columnLetter(col)}${rowIndex.taxes}`,
    projections.map((p) => p.netIncome),
    currencyFmt
  );

  return sheet;
};

const buildCashFlowSheet = (
  workbook: ExcelJS.Workbook,
  label: string,
  projections: ProjectionData[],
  currency: string
) => {
  const sheet = workbook.addWorksheet(`Cash Flow - ${label}`);
  const years = projections.map((p) => p.year);
  sheet.columns = [
    { key: "metric", width: 30 },
    ...years.map(() => ({ key: "year", width: 14 })),
  ];
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];

  sheet.mergeCells(1, 1, 1, years.length + 1);
  sheet.getCell(1, 1).value = `Cash Flow — ${label}`;
  sheet.getCell(1, 1).font = { size: 14, bold: true };

  addEmptyRow(sheet);
  const headerRow = sheet.addRow(["Metric", ...years]);
  headerRow.eachCell(applyHeaderStyle);

  const rowIndex: Record<string, number> = {};
  const addRow = (
    key: string,
    labelText: string,
    values: number[],
    format: string,
    isTotal = false
  ) => {
    const row = sheet.addRow([labelText, ...values]);
    rowIndex[key] = row.number;
    row.eachCell((cell, col) => {
      if (col > 1) cell.numFmt = format;
    });
    if (isTotal) applyTotalStyle(row);
  };

  const currencyFmt = currencyFormat(currency);
  const colStart = 2;
  const colEnd = years.length + 1;

  addRow(
    "operatingCF",
    "Operating cash flow",
    projections.map((p) => p.operatingCF),
    currencyFmt
  );
  addRow(
    "investingCF",
    "Investing cash flow",
    projections.map((p) => p.investingCF),
    currencyFmt
  );
  addRow(
    "freeCashFlow",
    "Free cash flow",
    projections.map((p) => p.freeCashFlow),
    currencyFmt,
    true
  );

  setRowFormulas(
    sheet,
    rowIndex.freeCashFlow,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.operatingCF}+${columnLetter(col)}${rowIndex.investingCF}`,
    projections.map((p) => p.freeCashFlow),
    currencyFmt
  );

  return sheet;
};

const buildKpiSheet = (
  workbook: ExcelJS.Workbook,
  label: string,
  projections: ProjectionData[],
  currency: string,
  scenarioParams: ScenarioParams
) => {
  const sheet = workbook.addWorksheet(`KPIs - ${label}`);
  const years = projections.map((p) => p.year);
  sheet.columns = [
    { key: "metric", width: 30 },
    ...years.map(() => ({ key: "year", width: 14 })),
  ];
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];

  sheet.mergeCells(1, 1, 1, years.length + 1);
  sheet.getCell(1, 1).value = `KPIs — ${label}`;
  sheet.getCell(1, 1).font = { size: 14, bold: true };

  sheet.addRow([
    "Scenario assumptions",
    ...years.map(() => ""),
  ]);
  applySectionStyle(sheet.getRow(sheet.rowCount));

  const assumptionsRow = sheet.addRow([
    "CAC",
    ...years.map(() => scenarioParams.cac),
  ]);
  assumptionsRow.eachCell((cell, col) => {
    if (col > 1) cell.numFmt = currencyFormat(currency);
  });
  const cacRowIndex = assumptionsRow.number;
  const churnRow = sheet.addRow([
    "Churn rate",
    ...years.map(() => scenarioParams.churnRate),
  ]);
  churnRow.eachCell((cell, col) => {
    if (col > 1) cell.numFmt = percentFractionFormat;
  });
  const arpuRow = sheet.addRow([
    "ARPU",
    ...years.map(() => scenarioParams.arpu),
  ]);
  arpuRow.eachCell((cell, col) => {
    if (col > 1) cell.numFmt = currencyFormat(currency);
  });

  addEmptyRow(sheet);
  const headerRow = sheet.addRow(["Metric", ...years]);
  headerRow.eachCell(applyHeaderStyle);

  const rowIndex: Record<string, number> = {};
  const addRow = (
    key: string,
    labelText: string,
    values: number[],
    format: string
  ) => {
    const row = sheet.addRow([labelText, ...values]);
    rowIndex[key] = row.number;
    row.eachCell((cell, col) => {
      if (col > 1) cell.numFmt = format;
    });
  };

  const currencyFmt = currencyFormat(currency);
  const colStart = 2;
  const colEnd = years.length + 1;

  addRow("ltv", "LTV", projections.map((p) => p.ltv), currencyFmt);
  addRow("ltvCac", "LTV / CAC", projections.map((p) => p.ltvCac), ratioFormat);
  setRowFormulas(
    sheet,
    rowIndex.ltvCac,
    colStart,
    colEnd,
    (col) =>
      `${columnLetter(col)}${rowIndex.ltv}/${columnLetter(col)}${cacRowIndex}`,
    projections.map((p) => p.ltvCac),
    ratioFormat
  );
  addRow(
    "paybackMonths",
    "Payback (months)",
    projections.map((p) => p.paybackMonths),
    integerFormat
  );
  addRow(
    "revenuePerEmployee",
    "Revenue per employee",
    projections.map((p) => p.revenuePerEmployee),
    currencyFmt
  );
  addRow(
    "marketShare",
    "Market share",
    projections.map((p) => p.marketShare),
    percentValueFormat
  );

  return sheet;
};

export async function exportModelToExcel(data: ExportModelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GoVentureValue";
  workbook.created = new Date();

  const baseScenario =
    data.scenarios.find((s) => s.scenarioType === "base") ?? data.scenarios[0];
  const baseProjections = calculateProjections(
    getScenarioParams(baseScenario),
    data.settings,
    data.market
  );

  buildSummarySheet(workbook, data, baseProjections);
  buildAssumptionsSheet(workbook, data);
  buildScenarioCompareSheet(workbook, data);

  scenarioOrder.forEach((scenario) => {
    const match = data.scenarios.find((s) => s.scenarioType === scenario);
    if (!match) return;
    const scenarioParams = getScenarioParams(match);
    const projections = calculateProjections(
      scenarioParams,
      data.settings,
      data.market
    );
    const label = formatScenarioLabel(scenario);
    buildPnLSheet(
      workbook,
      label,
      projections,
      data.model.currency,
      data.settings.taxRate
    );
    buildCashFlowSheet(workbook, label, projections, data.model.currency);
    buildKpiSheet(
      workbook,
      label,
      projections,
      data.model.currency,
      scenarioParams
    );
  });

  const safeName = data.model.name
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadBuffer(buffer as ArrayBuffer, `${safeName || "model"}_export.xlsx`);
}
