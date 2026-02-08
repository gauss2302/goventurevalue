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

type CellAlign = "left" | "center" | "right";

type CellStyleOptions = {
  bold?: boolean;
  color?: string;
  fill?: string;
  horizontal?: CellAlign;
  numFmt?: string;
  border?: Partial<ExcelJS.Borders>;
  size?: number;
};

type PnLBlockResult = {
  headerRow: number;
};

type KeyValueItem = {
  key?: string;
  label: string;
  value: ExcelJS.CellValue;
  valueFormat?: string;
  isTotal?: boolean;
  labelBold?: boolean;
  formula?: (row: number, colByKey: Record<string, number>) => string;
};

type HorizontalTableColumn = {
  key: string;
  label: string;
  values: number[];
  format: string;
  isEmphasis?: boolean;
  formula?: (row: number, colByKey: Record<string, number>) => string;
};

const scenarioOrder: ScenarioType[] = ["conservative", "base", "optimistic"];
const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  CNY: "¥",
};

const colors = {
  text: "FF1C1E2F",
  muted: "FF5B6575",
  sectionText: "FF344A70",
  sectionFill: "FFEFF3FA",
  headerFill: "FFF3F4F6",
  subSectionFill: "FFF7F8FB",
  totalFill: "FFF9FAFC",
  rule: "FFD5DAE3",
  ruleStrong: "FF9DA9BC",
};

const thinRule = { style: "thin" as const, color: { argb: colors.rule } };
const mediumRule = {
  style: "medium" as const,
  color: { argb: colors.ruleStrong },
};

const borderRow: Partial<ExcelJS.Borders> = {
  bottom: thinRule,
};
const borderSection: Partial<ExcelJS.Borders> = {
  top: thinRule,
  bottom: thinRule,
};
const borderHeader: Partial<ExcelJS.Borders> = {
  top: thinRule,
  bottom: thinRule,
};
const borderTotal: Partial<ExcelJS.Borders> = {
  top: mediumRule,
  bottom: thinRule,
};

const percentValueFormat = '0.0"%"';
const percentFractionFormat = "0.0%";
const ratioFormat = "0.0";
const integerFormat = "#,##0";

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
  return `${symbol}#,##0;[Red](${symbol}#,##0)`;
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

const applyCellStyle = (cell: ExcelJS.Cell, options: CellStyleOptions = {}) => {
  cell.font = {
    name: "Calibri",
    size: options.size ?? 10,
    bold: options.bold ?? false,
    color: { argb: options.color ?? colors.text },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: options.horizontal ?? "left",
  };
  if (options.fill) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.fill },
    };
  }
  if (options.numFmt) {
    cell.numFmt = options.numFmt;
  }
  if (options.border) {
    cell.border = options.border;
  }
};

const paintRowRange = (
  row: ExcelJS.Row,
  lastCol: number,
  paint: (cell: ExcelJS.Cell, col: number) => void
) => {
  for (let col = 1; col <= lastCol; col += 1) {
    paint(row.getCell(col), col);
  }
};

const addSpacerRow = (sheet: ExcelJS.Worksheet) => {
  const row = sheet.addRow([]);
  row.height = 4;
  return sheet.rowCount + 1;
};

const ensureColumnWidth = (
  sheet: ExcelJS.Worksheet,
  columnIndex: number,
  width: number
) => {
  const column = sheet.getColumn(columnIndex);
  const currentWidth = column.width ?? 8.43;
  if (currentWidth < width) {
    column.width = width;
  }
};

const addSectionTitleRow = (
  sheet: ExcelJS.Worksheet,
  lastCol: number,
  title: string
) => {
  const row = sheet.addRow([title]);
  row.height = 20;

  paintRowRange(row, lastCol, (cell, col) => {
    if (col > 1) {
      cell.value = "";
    }
    applyCellStyle(cell, {
      bold: true,
      color: colors.sectionText,
      fill: colors.sectionFill,
      horizontal: col === 1 ? "left" : "center",
      border: borderSection,
    });
  });

  return row.number;
};

const addKeyValueRow = (
  sheet: ExcelJS.Worksheet,
  label: string,
  value: ExcelJS.CellValue,
  options: { valueFormat?: string; isTotal?: boolean; labelBold?: boolean } = {}
) => {
  const row = sheet.addRow([label, value]);
  row.height = 18;

  const border = options.isTotal ? borderTotal : borderRow;
  const fill = options.isTotal ? colors.totalFill : undefined;

  applyCellStyle(row.getCell(1), {
    bold: options.isTotal || options.labelBold,
    color: options.isTotal ? colors.text : colors.muted,
    fill,
    horizontal: "left",
    border,
  });
  applyCellStyle(row.getCell(2), {
    bold: options.isTotal,
    fill,
    horizontal: "right",
    numFmt: options.valueFormat,
    border,
  });

  return row.number;
};

const addKeyValueRowsCompact = (
  sheet: ExcelJS.Worksheet,
  lastCol: number,
  items: KeyValueItem[]
) => {
  if (lastCol < 4) {
    items.forEach((item) => {
      addKeyValueRow(sheet, item.label, item.value, {
        valueFormat: item.valueFormat,
        isTotal: item.isTotal,
        labelBold: item.labelBold,
      });
    });
    return;
  }

  let i = 0;
  while (i < items.length) {
    const left = items[i];
    const right = items[i + 1];

    if (left.isTotal || right?.isTotal) {
      addKeyValueRow(sheet, left.label, left.value, {
        valueFormat: left.valueFormat,
        isTotal: left.isTotal,
        labelBold: left.labelBold,
      });
      i += 1;
      continue;
    }

    const row = sheet.addRow([
      left.label,
      left.value,
      right?.label ?? "",
      right?.value ?? "",
    ]);
    row.height = 18;

    applyCellStyle(row.getCell(1), {
      bold: left.labelBold,
      color: left.labelBold ? colors.text : colors.muted,
      horizontal: "left",
      border: borderRow,
    });
    applyCellStyle(row.getCell(2), {
      horizontal: "right",
      numFmt: left.valueFormat,
      border: borderRow,
    });
    applyCellStyle(row.getCell(3), {
      bold: right?.labelBold,
      color: right?.labelBold ? colors.text : colors.muted,
      horizontal: "left",
      border: borderRow,
    });
    applyCellStyle(row.getCell(4), {
      horizontal: "right",
      numFmt: right?.valueFormat,
      border: borderRow,
    });

    for (let col = 5; col <= lastCol; col += 1) {
      const filler = row.getCell(col);
      filler.value = "";
      applyCellStyle(filler, {
        horizontal: "left",
        border: borderRow,
      });
    }

    i += 2;
  }
};

const appendSingleRowBlock = (
  sheet: ExcelJS.Worksheet,
  title: string,
  items: KeyValueItem[]
) => {
  const lastCol = Math.max(2, items.length);
  addSectionTitleRow(sheet, lastCol, title);

  const headerRow = sheet.addRow(items.map((item) => item.label));
  headerRow.height = 18;
  for (let col = 1; col <= lastCol; col += 1) {
    const cell = headerRow.getCell(col);
    if (col > items.length) {
      cell.value = "";
    }
    ensureColumnWidth(sheet, col, col === 1 ? 16 : 14);
    applyCellStyle(cell, {
      bold: true,
      fill: colors.headerFill,
      horizontal: "center",
      border: borderHeader,
    });
  }

  const valuesRow = sheet.addRow(items.map((item) => item.value));
  valuesRow.height = 18;
  const colByKey: Record<string, number> = {};

  items.forEach((item, idx) => {
    const col = idx + 1;
    if (item.key) {
      colByKey[item.key] = col;
    }
    const cell = valuesRow.getCell(col);
    if (item.formula) {
      cell.value = {
        formula: item.formula(valuesRow.number, colByKey),
        result: item.value as number,
      };
    }
    applyCellStyle(cell, {
      bold: item.isTotal,
      fill: item.isTotal ? colors.totalFill : undefined,
      horizontal: "right",
      numFmt: item.valueFormat,
      border: item.isTotal ? borderTotal : borderRow,
    });
  });

  for (let col = items.length + 1; col <= lastCol; col += 1) {
    const filler = valuesRow.getCell(col);
    filler.value = "";
    applyCellStyle(filler, {
      horizontal: "left",
      border: borderRow,
    });
  }

  addSpacerRow(sheet);
  return sheet.rowCount + 1;
};

const appendHorizontalYearTable = (
  sheet: ExcelJS.Worksheet,
  title: string,
  years: number[],
  columns: HorizontalTableColumn[]
): PnLBlockResult => {
  const lastCol = columns.length + 1;
  addSectionTitleRow(sheet, lastCol, title);

  const headerRow = sheet.addRow(["Year", ...columns.map((column) => column.label)]);
  headerRow.height = 19;
  for (let col = 1; col <= lastCol; col += 1) {
    const cell = headerRow.getCell(col);
    ensureColumnWidth(sheet, col, col === 1 ? 10 : 13);
    applyCellStyle(cell, {
      bold: true,
      fill: colors.headerFill,
      horizontal: "center",
      border: borderHeader,
    });
  }

  const colByKey: Record<string, number> = {};
  columns.forEach((column, index) => {
    colByKey[column.key] = index + 2;
  });

  years.forEach((year, yearIndex) => {
    const row = sheet.addRow([year, ...columns.map((column) => column.values[yearIndex] ?? 0)]);
    row.height = 18;

    applyCellStyle(row.getCell(1), {
      bold: true,
      horizontal: "center",
      numFmt: integerFormat,
      border: borderRow,
    });

    columns.forEach((column, columnIndex) => {
      const col = columnIndex + 2;
      const cell = row.getCell(col);
      const result = column.values[yearIndex] ?? 0;
      if (column.formula) {
        cell.value = {
          formula: column.formula(row.number, colByKey),
          result,
        };
      }
      applyCellStyle(cell, {
        bold: column.isEmphasis,
        fill: column.isEmphasis ? colors.totalFill : undefined,
        horizontal: "right",
        numFmt: column.format,
        border: borderRow,
      });
    });
  });

  addSpacerRow(sheet);
  return { headerRow: headerRow.number };
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

const resolveScenarioParams = (
  scenarios: ExportScenario[],
  scenarioType: ScenarioType
) => {
  const match = scenarios.find((s) => s.scenarioType === scenarioType);
  const base = scenarios.find((s) => s.scenarioType === "base");
  return getScenarioParams(match ?? base);
};

const appendReportHeaderBlock = (
  sheet: ExcelJS.Worksheet,
  data: ExportModelData,
  scenarioLabel: string,
  lastCol: number,
  exportedAt: string
) => {
  const titleRow = sheet.addRow([
    `${data.model.name} — ${scenarioLabel} Scenario Report`,
  ]);
  titleRow.height = 24;
  sheet.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
  applyCellStyle(titleRow.getCell(1), {
    bold: true,
    size: 13,
    horizontal: "left",
    color: colors.text,
  });

  addSectionTitleRow(sheet, lastCol, "Report Metadata");
  addKeyValueRowsCompact(sheet, lastCol, [
    { label: "Model", value: data.model.name, labelBold: true },
    { label: "Scenario", value: scenarioLabel, labelBold: true },
    { label: "Currency", value: data.model.currency, labelBold: true },
    { label: "Exported", value: exportedAt, labelBold: true },
  ]);
  addSpacerRow(sheet);

  return sheet.rowCount + 1;
};

const appendAssumptionsBlock = (
  sheet: ExcelJS.Worksheet,
  scenarioParams: ScenarioParams,
  currencyFmt: string,
  _lastCol: number
) => {
  return appendSingleRowBlock(sheet, "Scenario Assumptions", [
    {
      key: "userGrowth",
      label: "User growth",
      value: scenarioParams.userGrowth,
      valueFormat: percentFractionFormat,
    },
    {
      key: "arpu",
      label: "ARPU",
      value: scenarioParams.arpu,
      valueFormat: currencyFmt,
    },
    {
      key: "churnRate",
      label: "Churn rate",
      value: scenarioParams.churnRate,
      valueFormat: percentFractionFormat,
    },
    {
      key: "farmerGrowth",
      label: "Farmer growth",
      value: scenarioParams.farmerGrowth,
      valueFormat: percentFractionFormat,
    },
    {
      key: "cac",
      label: "CAC",
      value: scenarioParams.cac,
      valueFormat: currencyFmt,
    },
  ]);
};

const appendSettingsBlock = (
  sheet: ExcelJS.Worksheet,
  settings: ModelSettings,
  currencyFmt: string,
  _lastCol: number
) => {
  return appendSingleRowBlock(sheet, "Model Settings", [
    {
      key: "startUsers",
      label: "Start users",
      value: settings.startUsers,
      valueFormat: integerFormat,
    },
    {
      key: "startFarmers",
      label: "Start farmers",
      value: settings.startFarmers,
      valueFormat: integerFormat,
    },
    {
      key: "taxRate",
      label: "Tax rate",
      value: settings.taxRate,
      valueFormat: percentFractionFormat,
    },
    {
      key: "discountRate",
      label: "Discount rate",
      value: settings.discountRate,
      valueFormat: percentFractionFormat,
    },
    {
      key: "terminalGrowth",
      label: "Terminal growth",
      value: settings.terminalGrowth,
      valueFormat: percentFractionFormat,
    },
    {
      key: "safetyBuffer",
      label: "Safety buffer",
      value: settings.safetyBuffer,
      valueFormat: currencyFmt,
    },
    {
      key: "projectionYears",
      label: "Projection years",
      value: settings.projectionYears.join(", "),
    },
  ]);
};

const appendMarketBlock = (
  sheet: ExcelJS.Worksheet,
  market: MarketSizing,
  currencyFmt: string,
  _lastCol: number
) => {
  const items: KeyValueItem[] = [
    { key: "tam", label: "TAM", value: market.tam, valueFormat: currencyFmt },
    { key: "sam", label: "SAM", value: market.sam, valueFormat: currencyFmt },
  ];
  market.som.forEach((value, index) => {
    items.push({
      key: `som_${index + 1}`,
      label: `SOM Year ${index + 1}`,
      value,
      valueFormat: currencyFmt,
    });
  });
  return appendSingleRowBlock(sheet, "Market Sizing", items);
};

const appendPnLBlock = (
  sheet: ExcelJS.Worksheet,
  years: number[],
  projections: ProjectionData[],
  taxRate: number,
  currencyFmt: string,
  _lastCol: number
): PnLBlockResult => {
  const taxRateLiteral = Number(taxRate.toFixed(6));
  return appendHorizontalYearTable(sheet, "P&L Statement", years, [
    {
      key: "platformRevenue",
      label: "Platform revenue",
      values: projections.map((p) => p.platformRevenue),
      format: currencyFmt,
    },
    {
      key: "farmerRevShare",
      label: "Farmer rev share",
      values: projections.map((p) => p.farmerRevShare),
      format: currencyFmt,
    },
    {
      key: "b2bRevenue",
      label: "B2B revenue",
      values: projections.map((p) => p.b2bRevenue),
      format: currencyFmt,
    },
    {
      key: "totalRevenue",
      label: "Total revenue",
      values: projections.map((p) => p.totalRevenue),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.platformRevenue)}${row}+${columnLetter(c.farmerRevShare)}${row}+${columnLetter(c.b2bRevenue)}${row}`,
    },
    {
      key: "hostingCosts",
      label: "Hosting costs",
      values: projections.map((p) => p.hostingCosts),
      format: currencyFmt,
    },
    {
      key: "paymentProcessing",
      label: "Payment processing",
      values: projections.map((p) => p.paymentProcessing),
      format: currencyFmt,
    },
    {
      key: "customerSupport",
      label: "Customer support",
      values: projections.map((p) => p.customerSupport),
      format: currencyFmt,
    },
    {
      key: "cogs",
      label: "COGS",
      values: projections.map((p) => p.cogs),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.hostingCosts)}${row}+${columnLetter(c.paymentProcessing)}${row}+${columnLetter(c.customerSupport)}${row}`,
    },
    {
      key: "grossProfit",
      label: "Gross profit",
      values: projections.map((p) => p.grossProfit),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.totalRevenue)}${row}-${columnLetter(c.cogs)}${row}`,
    },
    {
      key: "grossMargin",
      label: "Gross margin",
      values: projections.map((p) => p.grossMargin),
      format: percentValueFormat,
      formula: (row, c) =>
        `${columnLetter(c.grossProfit)}${row}/${columnLetter(c.totalRevenue)}${row}*100`,
    },
    {
      key: "personnel",
      label: "Personnel",
      values: projections.map((p) => p.personnel),
      format: currencyFmt,
    },
    {
      key: "marketing",
      label: "Marketing",
      values: projections.map((p) => p.marketing),
      format: currencyFmt,
    },
    {
      key: "rd",
      label: "R&D",
      values: projections.map((p) => p.rd),
      format: currencyFmt,
    },
    {
      key: "gna",
      label: "G&A",
      values: projections.map((p) => p.gna),
      format: currencyFmt,
    },
    {
      key: "opex",
      label: "OPEX",
      values: projections.map((p) => p.opex),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.personnel)}${row}+${columnLetter(c.marketing)}${row}+${columnLetter(c.rd)}${row}+${columnLetter(c.gna)}${row}`,
    },
    {
      key: "ebitda",
      label: "EBITDA",
      values: projections.map((p) => p.ebitda),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.grossProfit)}${row}-${columnLetter(c.opex)}${row}`,
    },
    {
      key: "ebitdaMargin",
      label: "EBITDA margin",
      values: projections.map((p) => p.ebitdaMargin),
      format: percentValueFormat,
      formula: (row, c) =>
        `${columnLetter(c.ebitda)}${row}/${columnLetter(c.totalRevenue)}${row}*100`,
    },
    {
      key: "depreciation",
      label: "Depreciation",
      values: projections.map((p) => p.depreciation),
      format: currencyFmt,
    },
    {
      key: "ebit",
      label: "EBIT",
      values: projections.map((p) => p.ebit),
      format: currencyFmt,
      formula: (row, c) =>
        `${columnLetter(c.ebitda)}${row}-${columnLetter(c.depreciation)}${row}`,
    },
    {
      key: "taxes",
      label: "Taxes",
      values: projections.map((p) => p.taxes),
      format: currencyFmt,
      formula: (row, c) =>
        `MAX(0,${columnLetter(c.ebit)}${row}*${taxRateLiteral})`,
    },
    {
      key: "netIncome",
      label: "Net income",
      values: projections.map((p) => p.netIncome),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.ebit)}${row}-${columnLetter(c.taxes)}${row}`,
    },
  ]);
};

const appendCashFlowBlock = (
  sheet: ExcelJS.Worksheet,
  years: number[],
  projections: ProjectionData[],
  currencyFmt: string,
  _lastCol: number
) => {
  appendHorizontalYearTable(sheet, "Cash Flow Statement", years, [
    {
      key: "operatingCF",
      label: "Operating CF",
      values: projections.map((p) => p.operatingCF),
      format: currencyFmt,
    },
    {
      key: "investingCF",
      label: "Investing CF",
      values: projections.map((p) => p.investingCF),
      format: currencyFmt,
    },
    {
      key: "freeCashFlow",
      label: "Free cash flow",
      values: projections.map((p) => p.freeCashFlow),
      format: currencyFmt,
      isEmphasis: true,
      formula: (row, c) =>
        `${columnLetter(c.operatingCF)}${row}+${columnLetter(c.investingCF)}${row}`,
    },
  ]);

  return sheet.rowCount + 1;
};

const appendKpiBlock = (
  sheet: ExcelJS.Worksheet,
  years: number[],
  projections: ProjectionData[],
  scenarioParams: ScenarioParams,
  currencyFmt: string,
  _lastCol: number
) => {
  appendHorizontalYearTable(sheet, "KPI Block", years, [
    {
      key: "cacInput",
      label: "CAC input",
      values: years.map(() => scenarioParams.cac),
      format: currencyFmt,
    },
    {
      key: "arpuInput",
      label: "ARPU input",
      values: years.map(() => scenarioParams.arpu),
      format: currencyFmt,
    },
    {
      key: "churnInput",
      label: "Churn input",
      values: years.map(() => scenarioParams.churnRate * 100),
      format: percentValueFormat,
    },
    {
      key: "users",
      label: "Users",
      values: projections.map((p) => p.users),
      format: integerFormat,
    },
    {
      key: "mau",
      label: "MAU",
      values: projections.map((p) => p.mau),
      format: integerFormat,
    },
    {
      key: "ltv",
      label: "LTV",
      values: projections.map((p) => p.ltv),
      format: currencyFmt,
    },
    {
      key: "ltvCac",
      label: "LTV / CAC",
      values: projections.map((p) => p.ltvCac),
      format: ratioFormat,
      isEmphasis: true,
      formula: (row, c) =>
        `IF(${columnLetter(c.cacInput)}${row}=0,0,${columnLetter(c.ltv)}${row}/${columnLetter(c.cacInput)}${row})`,
    },
    {
      key: "paybackMonths",
      label: "Payback (m)",
      values: projections.map((p) => p.paybackMonths),
      format: integerFormat,
    },
    {
      key: "revenuePerEmployee",
      label: "Revenue/employee",
      values: projections.map((p) => p.revenuePerEmployee),
      format: currencyFmt,
    },
    {
      key: "marketShare",
      label: "Market share",
      values: projections.map((p) => p.marketShare),
      format: percentValueFormat,
    },
  ]);

  return sheet.rowCount + 1;
};

const appendValuationBlock = (
  sheet: ExcelJS.Worksheet,
  lastProjection: ProjectionData,
  dcf: ReturnType<typeof calculateDCF>,
  fundingNeed: number,
  currencyFmt: string,
  _lastCol: number
) => {
  const pvCashFlows = dcf.pvCashFlows.reduce((sum, value) => sum + value, 0);
  return appendSingleRowBlock(sheet, "Valuation Summary", [
    {
      key: "discountRate",
      label: "Discount rate",
      value: dcf.discountRate,
      valueFormat: percentFractionFormat,
    },
    {
      key: "terminalGrowth",
      label: "Terminal growth",
      value: dcf.terminalGrowth,
      valueFormat: percentFractionFormat,
    },
    {
      key: "pvCashFlows",
      label: "PV yearly FCF",
      value: pvCashFlows,
      valueFormat: currencyFmt,
    },
    {
      key: "pvTerminal",
      label: "PV terminal",
      value: dcf.pvTerminal,
      valueFormat: currencyFmt,
    },
    {
      key: "enterpriseValue",
      label: "Enterprise value",
      value: dcf.enterpriseValue,
      valueFormat: currencyFmt,
      isTotal: true,
      formula: (row, c) =>
        `${columnLetter(c.pvCashFlows)}${row}+${columnLetter(c.pvTerminal)}${row}`,
    },
    {
      key: "fundingNeed",
      label: "Funding need",
      value: fundingNeed,
      valueFormat: currencyFmt,
    },
    {
      key: "finalNetIncome",
      label: "Final year NI",
      value: lastProjection.netIncome,
      valueFormat: currencyFmt,
    },
    {
      key: "finalFCF",
      label: "Final year FCF",
      value: lastProjection.freeCashFlow,
      valueFormat: currencyFmt,
    },
  ]);
};

const buildScenarioReportSheet = (
  workbook: ExcelJS.Workbook,
  scenarioType: ScenarioType,
  data: ExportModelData,
  exportedAt: string
) => {
  const scenarioLabel = formatScenarioLabel(scenarioType);
  const scenarioParams = resolveScenarioParams(data.scenarios, scenarioType);
  const projections = calculateProjections(scenarioParams, data.settings, data.market);
  const dcf = calculateDCF(
    projections,
    data.settings.discountRate,
    data.settings.terminalGrowth
  );
  const fundingNeed = calculateFundingNeed(projections, data.settings.safetyBuffer);
  const years = projections.map((p) => p.year);
  const lastCol = years.length + 1;
  const currencyFmt = currencyFormat(data.model.currency);

  const sheet = workbook.addWorksheet(scenarioLabel);
  sheet.columns = [
    { key: "metric", width: 30 },
    ...years.map((year) => ({ key: `y_${year}`, width: 12 })),
  ];
  sheet.properties.defaultRowHeight = 16;

  const firstContentRow = appendReportHeaderBlock(
    sheet,
    data,
    scenarioLabel,
    lastCol,
    exportedAt
  );
  appendAssumptionsBlock(sheet, scenarioParams, currencyFmt, lastCol);
  appendSettingsBlock(sheet, data.settings, currencyFmt, lastCol);
  appendMarketBlock(sheet, data.market, currencyFmt, lastCol);
  appendPnLBlock(
    sheet,
    years,
    projections,
    data.settings.taxRate,
    currencyFmt,
    lastCol
  );
  appendCashFlowBlock(sheet, years, projections, currencyFmt, lastCol);
  appendKpiBlock(sheet, years, projections, scenarioParams, currencyFmt, lastCol);
  appendValuationBlock(
    sheet,
    projections[projections.length - 1],
    dcf,
    fundingNeed,
    currencyFmt,
    lastCol
  );

  sheet.views = [
    {
      state: "frozen",
      xSplit: 1,
      // Keep only compact report header frozen; large ySplit can block vertical scroll.
      ySplit: Math.max(1, firstContentRow - 1),
      topLeftCell: `B${Math.max(2, firstContentRow)}`,
      showGridLines: false,
    },
  ];
  sheet.pageSetup = {
    ...sheet.pageSetup,
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
    printArea: `$A$1:$${columnLetter(sheet.columnCount)}$${sheet.rowCount}`,
    showGridLines: false,
  };

  return sheet;
};

export async function exportModelToExcel(data: ExportModelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GoVentureValue";
  workbook.created = new Date();

  const exportedAt = new Date().toLocaleString();
  scenarioOrder.forEach((scenarioType) => {
    buildScenarioReportSheet(workbook, scenarioType, data, exportedAt);
  });

  const safeName = data.model.name
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  const buffer = await workbook.xlsx.writeBuffer();
  await downloadBuffer(
    buffer as ArrayBuffer,
    `${safeName || "model"}_report_pack.xlsx`
  );
}
