// Document definition shape for pdfmake (no types shipped by the package)
type PdfDocContent = unknown;
type PdfDocDefinition = {
  pageSize?: string;
  pageOrientation?: string;
  pageMargins?: number[];
  defaultStyle?: Record<string, unknown>;
  styles?: Record<string, Record<string, unknown>>;
  content?: PdfDocContent[];
};
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

export type ExportModelData = {
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

const colors = {
  brandPrimary: "#4f46ba",
  brandInk: "#1c1e2f",
  brandMuted: "#707a89",
  page: "#fafafa",
  borderSoft: "#e2e2e2",
  sectionEmerald: "#e8e6f5",
  sectionRed: "#fee2e2",
  sectionRedText: "#9f1239",
  sectionOrange: "#ffedd5",
  sectionOrangeText: "#9a3412",
  sectionBlue: "#dbeafe",
  sectionBlueText: "#1e40af",
  sectionPurple: "#f3e8ff",
  sectionPurpleText: "#6b21a8",
  totalEmerald: "#f0eef9",
  negative: "#dc2626",
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

const getCurrencySymbol = (currency: string) =>
  currencySymbols[currency] ?? "$";

function formatNumber(n: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}K`;
  return `${sym}${n.toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPercentDisplay(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatInteger(n: number): string {
  return n.toLocaleString();
}

function formatRatio(n: number): string {
  return n.toFixed(1);
}

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

type KeyValueItem = {
  label: string;
  value: string | number;
};

function buildKeyValueTable(
  _title: string,
  items: KeyValueItem[]
): PdfDocContent {
  const widths = ["*", ...Array(Math.max(0, items.length - 1)).fill("auto")] as (string | number)[];
  return {
    layout: "lightHorizontalLines",
    table: {
      headerRows: 1,
      widths,
      body: [
        items.map((i) => ({ text: i.label, fillColor: colors.page, color: colors.brandMuted, bold: true, alignment: "center" })),
        items.map((i) => ({ text: typeof i.value === "number" ? i.value.toLocaleString() : String(i.value), fillColor: colors.totalEmerald, alignment: "right" })),
      ],
    },
    margin: [0, 0, 0, 12],
  };
}

type YearColumn = {
  key: string;
  label: string;
  values: number[];
  format: "currency" | "percent" | "integer" | "ratio";
  isEmphasis?: boolean;
};

function buildYearTable(
  _title: string,
  years: number[],
  columns: YearColumn[],
  currency: string
): PdfDocContent {
  const formatCell = (value: number, fmt: YearColumn["format"]) => {
    if (fmt === "currency") return formatNumber(value, currency);
    if (fmt === "percent") return `${value.toFixed(1)}%`;
    if (fmt === "ratio") return formatRatio(value);
    return formatInteger(value);
  };
  const body: unknown[][] = [
    [
      { text: "Year", fillColor: colors.page, color: colors.brandMuted, bold: true, alignment: "left" },
      ...years.map((y) => ({ text: String(y), fillColor: colors.page, color: colors.brandMuted, bold: true, alignment: "right" })),
    ],
  ];
  for (const col of columns) {
    body.push([
      {
        text: col.label,
        fillColor: col.isEmphasis ? colors.totalEmerald : undefined,
        color: col.isEmphasis ? colors.brandPrimary : colors.brandMuted,
        bold: !!col.isEmphasis,
        alignment: "left",
      },
      ...col.values.map((v) => ({
        text: formatCell(v, col.format),
        fillColor: col.isEmphasis ? colors.totalEmerald : undefined,
        color: col.isEmphasis ? colors.brandPrimary : undefined,
        bold: !!col.isEmphasis,
        alignment: "right" as const,
      })),
    ]);
  }
  const widths = ["*", ...years.map(() => "auto")] as (string | number)[];
  return {
    layout: "lightHorizontalLines",
    table: {
      headerRows: 1,
      widths,
      body,
    },
    margin: [0, 0, 0, 12],
  };
}

function buildReportHeader(
  data: ExportModelData,
  scenarioLabel: string,
  exportedAt: string
): PdfDocContent[] {
  return [
    {
      text: `${data.model.name} — ${scenarioLabel} Scenario Report`,
      style: "reportTitle",
      margin: [0, 0, 0, 8],
    },
    {
      layout: "lightHorizontalLines",
      table: {
        widths: ["auto", "auto"],
        body: [
          [
            { text: "Model", fillColor: colors.page, color: colors.brandMuted, bold: true },
            { text: data.model.name },
          ],
          [
            { text: "Scenario", fillColor: colors.page, color: colors.brandMuted, bold: true },
            { text: scenarioLabel },
          ],
          [
            { text: "Currency", fillColor: colors.page, color: colors.brandMuted, bold: true },
            { text: data.model.currency },
          ],
          [
            { text: "Exported", fillColor: colors.page, color: colors.brandMuted, bold: true },
            { text: exportedAt },
          ],
        ],
      },
      margin: [0, 0, 0, 16],
    },
  ];
}

function buildAssumptionsTable(
  scenarioParams: ScenarioParams,
  currency: string
): PdfDocContent {
  const items: KeyValueItem[] = [
    { label: "User growth", value: formatPercent(scenarioParams.userGrowth) },
    { label: "ARPU", value: formatNumber(scenarioParams.arpu, currency) },
    { label: "Churn rate", value: formatPercent(scenarioParams.churnRate) },
    { label: "Farmer growth", value: formatPercent(scenarioParams.farmerGrowth) },
    { label: "CAC", value: formatNumber(scenarioParams.cac, currency) },
  ];
  return buildKeyValueTable("Scenario Assumptions", items);
}

function buildSettingsTable(
  settings: ModelSettings,
  currency: string
): PdfDocContent {
  const items: KeyValueItem[] = [
    { label: "Start users", value: settings.startUsers },
    { label: "Start farmers", value: settings.startFarmers },
    { label: "Tax rate", value: formatPercent(settings.taxRate) },
    { label: "Discount rate", value: formatPercent(settings.discountRate) },
    { label: "Terminal growth", value: formatPercent(settings.terminalGrowth) },
    { label: "Safety buffer", value: formatNumber(settings.safetyBuffer, currency) },
    { label: "Projection years", value: settings.projectionYears.join(", ") },
  ];
  return buildKeyValueTable("Model Settings", items);
}

function buildMarketTable(market: MarketSizing, currency: string): PdfDocContent {
  const items: KeyValueItem[] = [
    { label: "TAM", value: formatNumber(market.tam, currency) },
    { label: "SAM", value: formatNumber(market.sam, currency) },
    ...market.som.map((v, i) => ({ label: `SOM Year ${i + 1}`, value: formatNumber(v, currency) })),
  ];
  return buildKeyValueTable("Market Sizing", items);
}

function buildPnLTable(
  years: number[],
  projections: ProjectionData[],
  currency: string
): PdfDocContent {
  const columns: YearColumn[] = [
    { key: "platformRevenue", label: "Platform revenue", values: projections.map((p) => p.platformRevenue), format: "currency" },
    { key: "farmerRevShare", label: "Farmer rev share", values: projections.map((p) => p.farmerRevShare), format: "currency" },
    { key: "b2bRevenue", label: "B2B revenue", values: projections.map((p) => p.b2bRevenue), format: "currency" },
    { key: "totalRevenue", label: "Total revenue", values: projections.map((p) => p.totalRevenue), format: "currency", isEmphasis: true },
    { key: "hostingCosts", label: "Hosting costs", values: projections.map((p) => p.hostingCosts), format: "currency" },
    { key: "paymentProcessing", label: "Payment processing", values: projections.map((p) => p.paymentProcessing), format: "currency" },
    { key: "customerSupport", label: "Customer support", values: projections.map((p) => p.customerSupport), format: "currency" },
    { key: "cogs", label: "COGS", values: projections.map((p) => p.cogs), format: "currency", isEmphasis: true },
    { key: "grossProfit", label: "Gross profit", values: projections.map((p) => p.grossProfit), format: "currency", isEmphasis: true },
    { key: "grossMargin", label: "Gross margin", values: projections.map((p) => p.grossMargin), format: "percent" },
    { key: "personnel", label: "Personnel", values: projections.map((p) => p.personnel), format: "currency" },
    { key: "marketing", label: "Marketing", values: projections.map((p) => p.marketing), format: "currency" },
    { key: "rd", label: "R&D", values: projections.map((p) => p.rd), format: "currency" },
    { key: "gna", label: "G&A", values: projections.map((p) => p.gna), format: "currency" },
    { key: "opex", label: "OPEX", values: projections.map((p) => p.opex), format: "currency", isEmphasis: true },
    { key: "ebitda", label: "EBITDA", values: projections.map((p) => p.ebitda), format: "currency", isEmphasis: true },
    { key: "ebitdaMargin", label: "EBITDA margin", values: projections.map((p) => p.ebitdaMargin), format: "percent" },
    { key: "depreciation", label: "Depreciation", values: projections.map((p) => p.depreciation), format: "currency" },
    { key: "ebit", label: "EBIT", values: projections.map((p) => p.ebit), format: "currency" },
    { key: "taxes", label: "Taxes", values: projections.map((p) => p.taxes), format: "currency" },
    { key: "netIncome", label: "Net income", values: projections.map((p) => p.netIncome), format: "currency", isEmphasis: true },
  ];
  return buildYearTable("P&L Statement", years, columns, currency);
}

function buildCashFlowTable(
  years: number[],
  projections: ProjectionData[],
  currency: string
): PdfDocContent {
  const columns: YearColumn[] = [
    { key: "operatingCF", label: "Operating CF", values: projections.map((p) => p.operatingCF), format: "currency" },
    { key: "investingCF", label: "Investing CF", values: projections.map((p) => p.investingCF), format: "currency" },
    { key: "freeCashFlow", label: "Free cash flow", values: projections.map((p) => p.freeCashFlow), format: "currency", isEmphasis: true },
  ];
  return buildYearTable("Cash Flow Statement", years, columns, currency);
}

function buildKpiTable(
  years: number[],
  projections: ProjectionData[],
  scenarioParams: ScenarioParams,
  currency: string
): PdfDocContent {
  const columns: YearColumn[] = [
    { key: "cacInput", label: "CAC input", values: years.map(() => scenarioParams.cac), format: "currency" },
    { key: "arpuInput", label: "ARPU input", values: years.map(() => scenarioParams.arpu), format: "currency" },
    { key: "churnInput", label: "Churn input", values: years.map(() => scenarioParams.churnRate * 100), format: "percent" },
    { key: "users", label: "Users", values: projections.map((p) => p.users), format: "integer" },
    { key: "mau", label: "MAU", values: projections.map((p) => p.mau), format: "integer" },
    { key: "ltv", label: "LTV", values: projections.map((p) => p.ltv), format: "currency" },
    { key: "ltvCac", label: "LTV / CAC", values: projections.map((p) => p.ltvCac), format: "ratio", isEmphasis: true },
    { key: "paybackMonths", label: "Payback (m)", values: projections.map((p) => p.paybackMonths), format: "integer" },
    { key: "revenuePerEmployee", label: "Revenue/employee", values: projections.map((p) => p.revenuePerEmployee), format: "currency" },
    { key: "marketShare", label: "Market share", values: projections.map((p) => p.marketShare), format: "percent" },
  ];
  return buildYearTable("KPI Block", years, columns, currency);
}

function buildValuationTable(
  lastProjection: ProjectionData,
  dcf: ReturnType<typeof calculateDCF>,
  fundingNeed: number,
  currency: string
): PdfDocContent {
  const pvCashFlows = dcf.pvCashFlows.reduce((sum, value) => sum + value, 0);
  const items: KeyValueItem[] = [
    { label: "Discount rate", value: formatPercentDisplay(dcf.discountRate) },
    { label: "Terminal growth", value: formatPercentDisplay(dcf.terminalGrowth) },
    { label: "PV yearly FCF", value: formatNumber(pvCashFlows, currency) },
    { label: "PV terminal", value: formatNumber(dcf.pvTerminal, currency) },
    { label: "Enterprise value", value: formatNumber(dcf.enterpriseValue, currency) },
    { label: "Funding need", value: formatNumber(fundingNeed, currency) },
    { label: "Final year NI", value: formatNumber(lastProjection.netIncome, currency) },
    { label: "Final year FCF", value: formatNumber(lastProjection.freeCashFlow, currency) },
  ];
  return buildKeyValueTable("Valuation Summary", items);
}

function buildScenarioContent(
  data: ExportModelData,
  scenarioType: ScenarioType,
  exportedAt: string
): PdfDocContent[] {
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
  const currency = data.model.currency;

  const content: PdfDocContent[] = [
    ...buildReportHeader(data, scenarioLabel, exportedAt),
    buildAssumptionsTable(scenarioParams, currency),
    buildSettingsTable(data.settings, currency),
    buildMarketTable(data.market, currency),
    buildPnLTable(years, projections, currency),
    buildCashFlowTable(years, projections, currency),
    buildKpiTable(years, projections, scenarioParams, currency),
    buildValuationTable(projections[projections.length - 1], dcf, fundingNeed, currency),
  ];
  return content;
}

export async function exportModelToPdf(data: ExportModelData): Promise<void> {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const vfs = await import("pdfmake/build/vfs_fonts");
  if (typeof (pdfMake as unknown as { addVirtualFileSystem?: (vfs: unknown) => void }).addVirtualFileSystem === "function") {
    (pdfMake as unknown as { addVirtualFileSystem: (vfs: unknown) => void }).addVirtualFileSystem(vfs.default ?? vfs);
  } else if ("vfs" in vfs && (pdfMake as unknown as { vfs?: unknown }).vfs === undefined) {
    (pdfMake as unknown as { vfs: unknown }).vfs = (vfs as { vfs?: unknown }).vfs ?? vfs.default;
  }

  const exportedAt = new Date().toLocaleString();
  const allContent: PdfDocContent[] = [];

  for (let i = 0; i < scenarioOrder.length; i++) {
    if (i > 0) {
      allContent.push({ text: "", pageBreak: "before" });
    }
    const scenarioContent = buildScenarioContent(data, scenarioOrder[i], exportedAt);
    allContent.push(...scenarioContent);
  }

  const docDef: PdfDocDefinition = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      fontSize: 9,
      font: "Roboto",
    },
    styles: {
      reportTitle: {
        fontSize: 13,
        bold: true,
        color: colors.brandInk,
      },
    },
    content: allContent,
  };

  const safeName = data.model.name
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  pdfMake.createPdf(docDef).download(`${safeName || "model"}_report.pdf`);
}
