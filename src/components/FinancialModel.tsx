import { useState } from "react";
import type { ScenarioType } from "../lib/dto";
import type {
  ProjectionData,
  ModelSettings,
  ScenarioParams,
} from "../lib/calculations";
import {
  calculateDCF,
  calculateFundingNeed,
  getCumulativeCash,
} from "../lib/calculations";

type FinancialModelProps = {
  scenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  projections: ProjectionData[];
  marketSizing: {
    tam: number;
    sam: number;
    som: number[];
  };
  settings: ModelSettings;
  scenarioParams: ScenarioParams;
};

type TabId = "summary" | "market" | "pnl" | "cashflow" | "valuation" | "kpis";

export default function FinancialModel({
  scenario,
  onScenarioChange,
  projections,
  marketSizing,
  settings,
  scenarioParams,
}: FinancialModelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  const years = projections.map((p) => p.year);
  const terminalYear = projections[projections.length - 1];

  // DCF Valuation using settings
  const dcf = calculateDCF(
    projections,
    settings.discountRate,
    settings.terminalGrowth
  );
  const fundingNeed = calculateFundingNeed(projections, settings.safetyBuffer);
  const cumulativeCash = getCumulativeCash(projections);
  const maxNegative = Math.min(...cumulativeCash, 0);

  const fmt = (n: number) =>
    n >= 1000000
      ? `$${(n / 1000000).toFixed(2)}M`
      : n >= 1000
        ? `$${(n / 1000).toFixed(1)}K`
        : `$${n.toLocaleString()}`;
  const fmtNum = (n: number) => n.toLocaleString();

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "summary", label: "Summary", icon: "📊" },
    { id: "market", label: "Market", icon: "🎯" },
    { id: "pnl", label: "P&L", icon: "📈" },
    { id: "cashflow", label: "Cash Flow", icon: "💰" },
    { id: "valuation", label: "Valuation", icon: "💎" },
    { id: "kpis", label: "KPIs", icon: "📉" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Scenario & Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Scenario Selector */}
          <div className="py-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Scenario:</span>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(["conservative", "base", "optimistic"] as ScenarioType[]).map(
                  (sc) => (
                    <button
                      key={sc}
                      onClick={() => onScenarioChange(sc)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        scenario === sc
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      {sc.charAt(0).toUpperCase() + sc.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              EY Finance Navigator methodology
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 py-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Executive Summary */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Enterprise Value"
                value={fmt(dcf.enterpriseValue)}
                subtitle={`${(settings.discountRate * 100).toFixed(0)}% WACC`}
                color="emerald"
              />
              <MetricCard
                title="Funding Required"
                value={fmt(fundingNeed)}
                subtitle="Seed Round"
                color="blue"
              />
              <MetricCard
                title="Y5 Revenue"
                value={fmt(terminalYear.totalRevenue)}
                subtitle={`${terminalYear.marketShare}% market share`}
                color="amber"
              />
              <MetricCard
                title="Y5 EBITDA Margin"
                value={`${terminalYear.ebitdaMargin}%`}
                subtitle={fmt(terminalYear.ebitda)}
                color={terminalYear.ebitdaMargin >= 0 ? "green" : "red"}
              />
            </div>

            {/* Assumptions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">
                Key Assumptions ({scenario.toUpperCase()} CASE)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <AssumptionBox
                  label="User Growth"
                  value={`${(scenarioParams.userGrowth * 100).toFixed(0)}%`}
                  unit="YoY"
                />
                <AssumptionBox
                  label="ARPU"
                  value={`$${scenarioParams.arpu}`}
                  unit="/mo"
                />
                <AssumptionBox
                  label="Churn Rate"
                  value={`${(scenarioParams.churnRate * 100).toFixed(0)}%`}
                  unit="monthly"
                />
                <AssumptionBox
                  label="CAC"
                  value={`$${scenarioParams.cac}`}
                  unit="per user"
                />
                <AssumptionBox
                  label="Farmer Growth"
                  value={`${(scenarioParams.farmerGrowth * 100).toFixed(0)}%`}
                  unit="YoY"
                />
                <AssumptionBox
                  label="Tax Rate"
                  value={`${(settings.taxRate * 100).toFixed(0)}%`}
                  unit="corp"
                />
              </div>
            </div>

            {/* P&L Summary Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-900 text-white px-5 py-3 font-semibold">
                5-Year P&L Summary
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">
                        USD
                      </th>
                      {years.map((y) => (
                        <th
                          key={y}
                          className="text-right px-4 py-3 font-medium text-gray-600"
                        >
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-emerald-50">
                      <td className="px-5 py-3 font-medium text-emerald-800">
                        Total Revenue
                      </td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className="text-right px-4 py-3 font-mono text-emerald-800"
                        >
                          {fmt(p.totalRevenue)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Gross Profit</td>
                      {projections.map((p, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {fmt(p.grossProfit)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-5 py-3 font-medium">EBITDA</td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono font-medium ${
                            p.ebitda >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {p.ebitda >= 0
                            ? fmt(p.ebitda)
                            : `(${fmt(Math.abs(p.ebitda))})`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-5 py-3 pl-8 text-gray-500 text-sm">
                        → Margin
                      </td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono text-sm ${
                            p.ebitdaMargin >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {p.ebitdaMargin}%
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-900 text-white">
                      <td className="px-5 py-3 font-semibold">Net Income</td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono font-semibold ${
                            p.netIncome >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {p.netIncome >= 0
                            ? fmt(p.netIncome)
                            : `(${fmt(Math.abs(p.netIncome))})`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAM SAM SOM */}
        {activeTab === "market" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MarketCard
                title="TAM"
                subtitle="Total Available Market"
                value={fmt(marketSizing.tam)}
                description="Uzbekistan Agriculture Sector"
                color="amber"
              />
              <MarketCard
                title="SAM"
                subtitle="Serviceable Available Market"
                value={fmt(marketSizing.sam)}
                description="Digital Agro-Tech Segment"
                color="orange"
              />
              <MarketCard
                title="SOM"
                subtitle="Year 5 Obtainable"
                value={fmt(marketSizing.som[4])}
                description={`${((marketSizing.som[4] / marketSizing.sam) * 100).toFixed(1)}% of SAM`}
                color="emerald"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-900 text-white px-5 py-3 font-semibold">
                Market Penetration Trajectory
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">
                        Metric
                      </th>
                      {years.map((y) => (
                        <th
                          key={y}
                          className="text-right px-4 py-3 font-medium text-gray-600"
                        >
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-5 py-3 text-gray-600">SOM Target</td>
                      {marketSizing.som.map((s, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {fmt(s)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="px-5 py-3 font-medium text-emerald-800">
                        Projected Revenue
                      </td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className="text-right px-4 py-3 font-mono font-medium text-emerald-800"
                        >
                          {fmt(p.totalRevenue)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-gray-600">% of SAM</td>
                      {projections.map((p, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {p.marketShare}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Total Users</td>
                      {projections.map((p, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {fmtNum(p.users)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Partner Farmers</td>
                      {projections.map((p, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {fmtNum(p.farmers)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* P&L Statement */}
        {activeTab === "pnl" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 text-white px-5 py-3 font-semibold">
              Profit & Loss Statement (USD)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50">
                      Line Item
                    </th>
                    {years.map((y) => (
                      <th
                        key={y}
                        className="text-right px-4 py-3 font-medium text-gray-600 min-w-[100px]"
                      >
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Revenue Section */}
                  <SectionHeader title="REVENUE" color="emerald" />
                  <DataRow
                    label="Platform Revenue"
                    data={projections.map((p) => fmt(p.platformRevenue))}
                    indent
                  />
                  <DataRow
                    label="Farmer Marketplace"
                    data={projections.map((p) => fmt(p.farmerRevShare))}
                    indent
                  />
                  <DataRow
                    label="B2B / SaaS Tools"
                    data={projections.map((p) => fmt(p.b2bRevenue))}
                    indent
                  />
                  <TotalRow
                    label="TOTAL REVENUE"
                    data={projections.map((p) => fmt(p.totalRevenue))}
                    color="emerald"
                  />

                  {/* COGS Section */}
                  <SectionHeader title="COST OF GOODS SOLD" color="red" />
                  <DataRow
                    label="Hosting & Infrastructure"
                    data={projections.map((p) => `(${fmt(p.hostingCosts)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label="Payment Processing"
                    data={projections.map((p) => `(${fmt(p.paymentProcessing)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label="Customer Support"
                    data={projections.map((p) => `(${fmt(p.customerSupport)})`)}
                    indent
                    negative
                  />
                  <TotalRow
                    label="GROSS PROFIT"
                    data={projections.map((p) => fmt(p.grossProfit))}
                  />

                  {/* OpEx Section */}
                  <SectionHeader title="OPERATING EXPENSES" color="orange" />
                  <DataRow
                    label="Personnel"
                    data={projections.map((p) => `(${fmt(p.personnel)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label="Marketing"
                    data={projections.map((p) => `(${fmt(p.marketing)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label="R&D"
                    data={projections.map((p) => `(${fmt(p.rd)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label="G&A"
                    data={projections.map((p) => `(${fmt(p.gna)})`)}
                    indent
                    negative
                  />

                  {/* EBITDA */}
                  <tr className="bg-gray-800 text-white">
                    <td className="px-5 py-3 font-semibold">EBITDA</td>
                    {projections.map((p, i) => (
                      <td
                        key={i}
                        className={`text-right px-4 py-3 font-mono font-semibold ${
                          p.ebitda >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {p.ebitda >= 0
                          ? fmt(p.ebitda)
                          : `(${fmt(Math.abs(p.ebitda))})`}
                      </td>
                    ))}
                  </tr>

                  {/* Net Income */}
                  <DataRow
                    label="Depreciation"
                    data={projections.map((p) => `(${fmt(p.depreciation)})`)}
                    indent
                    negative
                  />
                  <DataRow
                    label={`Taxes (${(settings.taxRate * 100).toFixed(0)}%)`}
                    data={projections.map((p) => `(${fmt(p.taxes)})`)}
                    indent
                    negative
                  />
                  <tr className="bg-gray-900 text-white">
                    <td className="px-5 py-3 font-bold">NET INCOME</td>
                    {projections.map((p, i) => (
                      <td
                        key={i}
                        className={`text-right px-4 py-3 font-mono font-bold ${
                          p.netIncome >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {p.netIncome >= 0
                          ? fmt(p.netIncome)
                          : `(${fmt(Math.abs(p.netIncome))})`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cash Flow */}
        {activeTab === "cashflow" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-900 text-white px-5 py-3 font-semibold">
                Cash Flow Statement (USD)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">
                        Line Item
                      </th>
                      {years.map((y) => (
                        <th
                          key={y}
                          className="text-right px-4 py-3 font-medium text-gray-600"
                        >
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <SectionHeader title="OPERATING CASH FLOW" color="blue" />
                    <DataRow
                      label="Net Income"
                      data={projections.map((p) =>
                        p.netIncome >= 0
                          ? fmt(p.netIncome)
                          : `(${fmt(Math.abs(p.netIncome))})`
                      )}
                      indent
                    />
                    <DataRow
                      label="(+) Depreciation"
                      data={projections.map((p) => fmt(p.depreciation))}
                      indent
                    />
                    <TotalRow
                      label="Operating Cash Flow"
                      data={projections.map((p) =>
                        p.operatingCF >= 0
                          ? fmt(p.operatingCF)
                          : `(${fmt(Math.abs(p.operatingCF))})`
                      )}
                      color="blue"
                    />

                    <SectionHeader title="INVESTING CASH FLOW" color="purple" />
                    <DataRow
                      label="CapEx"
                      data={projections.map((p) => `(${fmt(p.capex)})`)}
                      indent
                      negative
                    />

                    <tr className="bg-gray-800 text-white">
                      <td className="px-5 py-3 font-bold">FREE CASH FLOW</td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono font-bold ${
                            p.freeCashFlow >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {p.freeCashFlow >= 0
                            ? fmt(p.freeCashFlow)
                            : `(${fmt(Math.abs(p.freeCashFlow))})`}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-700 text-white">
                      <td className="px-5 py-3">Cumulative Cash</td>
                      {cumulativeCash.map((c, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono ${
                            c >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {c >= 0 ? fmt(c) : `(${fmt(Math.abs(c))})`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Funding Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 className="font-semibold text-blue-900 mb-4">
                Funding Requirement
              </h4>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-gray-600">Max cash deficit:</span>
                  <span className="font-bold text-red-600 ml-2">
                    {fmt(Math.abs(maxNegative))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">+ Safety buffer:</span>
                  <span className="font-bold ml-2">
                    {fmt(settings.safetyBuffer)}
                  </span>
                </div>
                <div className="bg-blue-600 text-white px-5 py-3 rounded-lg">
                  <span className="font-bold text-xl">{fmt(fundingNeed)}</span>
                  <span className="text-blue-200 ml-2 text-sm">Seed Round</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DCF Valuation */}
        {activeTab === "valuation" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ValuationCard
                title="Discount Rate (WACC)"
                value={`${(settings.discountRate * 100).toFixed(0)}%`}
                subtitle="Emerging market + early-stage risk"
              />
              <ValuationCard
                title="Terminal Growth"
                value={`${(settings.terminalGrowth * 100).toFixed(0)}%`}
                subtitle="Long-term sustainable growth"
              />
              <ValuationCard
                title="Terminal Value"
                value={fmt(dcf.terminalValue)}
                subtitle="Gordon Growth Model"
              />
              <ValuationCard
                title="Enterprise Value"
                value={fmt(dcf.enterpriseValue)}
                subtitle="Sum of PV of FCF"
                highlight
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-900 text-white px-5 py-3 font-semibold">
                DCF Calculation
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">
                        Component
                      </th>
                      {years.map((y) => (
                        <th
                          key={y}
                          className="text-right px-4 py-3 font-medium text-gray-600"
                        >
                          {y}
                        </th>
                      ))}
                      <th className="text-right px-4 py-3 font-medium text-emerald-700 bg-emerald-50">
                        Terminal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Free Cash Flow</td>
                      {projections.map((p, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono ${
                            p.freeCashFlow >= 0 ? "" : "text-red-600"
                          }`}
                        >
                          {p.freeCashFlow >= 0
                            ? fmt(p.freeCashFlow)
                            : `(${fmt(Math.abs(p.freeCashFlow))})`}
                        </td>
                      ))}
                      <td className="text-right px-4 py-3 font-mono bg-emerald-50">
                        {fmt(dcf.terminalValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-gray-600">Discount Factor</td>
                      {projections.map((_, i) => (
                        <td key={i} className="text-right px-4 py-3 font-mono">
                          {(
                            1 / Math.pow(1 + settings.discountRate, i + 1)
                          ).toFixed(3)}
                        </td>
                      ))}
                      <td className="text-right px-4 py-3 font-mono bg-emerald-50">
                        {(
                          1 /
                          Math.pow(1 + settings.discountRate, projections.length)
                        ).toFixed(3)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="px-5 py-3 font-semibold text-emerald-800">
                        Present Value
                      </td>
                      {dcf.pvCashFlows.map((pv, i) => (
                        <td
                          key={i}
                          className={`text-right px-4 py-3 font-mono font-semibold ${
                            pv >= 0 ? "text-emerald-800" : "text-red-600"
                          }`}
                        >
                          {pv >= 0 ? fmt(pv) : `(${fmt(Math.abs(pv))})`}
                        </td>
                      ))}
                      <td className="text-right px-4 py-3 font-mono font-semibold text-emerald-800">
                        {fmt(dcf.pvTerminal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        {activeTab === "kpis" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="SaaS Unit Economics"
              color="purple"
              items={[
                { label: "LTV", value: `$${projections[2]?.ltv || 0}` },
                { label: "CAC", value: `$${scenarioParams.cac}` },
                {
                  label: "LTV:CAC",
                  value: `${projections[2]?.ltvCac || 0}x`,
                  highlight: (projections[2]?.ltvCac || 0) >= 3,
                },
                {
                  label: "Payback",
                  value: `${projections[2]?.paybackMonths || 0} months`,
                },
              ]}
            />
            <KPICard
              title="Growth Metrics"
              color="blue"
              items={[
                {
                  label: "Revenue CAGR",
                  value: `${(
                    ((terminalYear.totalRevenue / projections[0].totalRevenue) **
                      0.25 -
                      1) *
                    100
                  ).toFixed(0)}%`,
                },
                {
                  label: "User Growth",
                  value: `${(scenarioParams.userGrowth * 100).toFixed(0)}% YoY`,
                },
                {
                  label: "Churn Rate",
                  value: `${(scenarioParams.churnRate * 100).toFixed(0)}%`,
                  highlight: scenarioParams.churnRate <= 0.05,
                },
                {
                  label: "NRR",
                  value: `${(100 - scenarioParams.churnRate * 100 + 5).toFixed(0)}%`,
                },
              ]}
            />
            <KPICard
              title="Efficiency Metrics"
              color="emerald"
              items={[
                {
                  label: "Y5 Gross Margin",
                  value: `${terminalYear.grossMargin}%`,
                },
                {
                  label: "Y5 EBITDA Margin",
                  value: `${terminalYear.ebitdaMargin}%`,
                  highlight: terminalYear.ebitdaMargin >= 0,
                },
                {
                  label: "Rev/Employee",
                  value: fmt(terminalYear.revenuePerEmployee),
                },
                {
                  label: "Y1 Burn Multiple",
                  value:
                    projections[0].ebitda < 0
                      ? `${(Math.abs(projections[0].ebitda) / projections[0].totalRevenue).toFixed(1)}x`
                      : "Profitable",
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "emerald" | "blue" | "amber" | "green" | "red";
}) {
  const colors = {
    emerald: "bg-emerald-600",
    blue: "bg-blue-600",
    amber: "bg-amber-600",
    green: "bg-green-600",
    red: "bg-red-600",
  };
  return (
    <div className={`${colors[color]} text-white rounded-xl p-5`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm opacity-70 mt-1">{subtitle}</p>
    </div>
  );
}

function AssumptionBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <span className="text-gray-500 text-xs block">{label}</span>
      <span className="font-semibold text-gray-900">
        {value}
        <span className="text-gray-500 text-xs ml-1">{unit}</span>
      </span>
    </div>
  );
}

function MarketCard({
  title,
  subtitle,
  value,
  description,
  color,
}: {
  title: string;
  subtitle: string;
  value: string;
  description: string;
  color: "amber" | "orange" | "emerald";
}) {
  const colors = {
    amber: "border-l-amber-500",
    orange: "border-l-orange-500",
    emerald: "border-l-emerald-500",
  };
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${colors[color]} p-5`}
    >
      <p className="text-sm text-gray-500">{subtitle}</p>
      <p className="text-xs font-medium text-gray-400 mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
}

function ValuationCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 ${highlight ? "bg-emerald-600 text-white" : "bg-white border border-gray-200"}`}
    >
      <p className={`text-sm ${highlight ? "opacity-80" : "text-gray-500"}`}>
        {title}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${highlight ? "" : "text-emerald-700"}`}
      >
        {value}
      </p>
      <p className={`text-sm mt-1 ${highlight ? "opacity-70" : "text-gray-400"}`}>
        {subtitle}
      </p>
    </div>
  );
}

function KPICard({
  title,
  color,
  items,
}: {
  title: string;
  color: "purple" | "blue" | "emerald";
  items: Array<{ label: string; value: string; highlight?: boolean }>;
}) {
  const colors = {
    purple: "bg-purple-600",
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`${colors[color]} text-white px-5 py-3 font-semibold`}>
        {title}
      </div>
      <div className="p-5 space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0"
          >
            <span className="text-gray-600">{item.label}</span>
            <span
              className={`font-bold ${item.highlight ? "text-green-600" : "text-gray-900"}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  color,
}: {
  title: string;
  color: "emerald" | "red" | "orange" | "blue" | "purple";
}) {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    orange: "bg-orange-100 text-orange-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
  };
  return (
    <tr className={colors[color]}>
      <td colSpan={6} className="px-5 py-2 font-semibold text-sm">
        {title}
      </td>
    </tr>
  );
}

function DataRow({
  label,
  data,
  indent,
  negative,
}: {
  label: string;
  data: string[];
  indent?: boolean;
  negative?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className={`px-5 py-2.5 text-gray-600 ${indent ? "pl-8" : ""}`}>
        {label}
      </td>
      {data.map((d, i) => (
        <td
          key={i}
          className={`text-right px-4 py-2.5 font-mono ${negative ? "text-red-600" : ""}`}
        >
          {d}
        </td>
      ))}
    </tr>
  );
}

function TotalRow({
  label,
  data,
  color,
}: {
  label: string;
  data: string[];
  color?: "emerald" | "blue";
}) {
  const bgColor = color === "emerald" ? "bg-emerald-50" : color === "blue" ? "bg-blue-50" : "bg-gray-50";
  const textColor = color === "emerald" ? "text-emerald-800" : color === "blue" ? "text-blue-800" : "text-gray-900";
  return (
    <tr className={`${bgColor} border-b-2 border-gray-200`}>
      <td className={`px-5 py-3 font-semibold ${textColor}`}>{label}</td>
      {data.map((d, i) => (
        <td key={i} className={`text-right px-4 py-3 font-mono font-semibold ${textColor}`}>
          {d}
        </td>
      ))}
    </tr>
  );
}
