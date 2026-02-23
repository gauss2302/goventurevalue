import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

type AssumptionSet = {
  title: string;
  description: string;
  items: { label: string; value: string; hint?: string }[];
};

const assumptionSets: AssumptionSet[] = [
  {
    title: "SaaS Benchmarks",
    description: "Typical early‑stage ranges for B2B SaaS. Adjust for PLG vs sales‑led and segment.",
    items: [
      { label: "Monthly churn", value: "2% – 6%", hint: "Lower for enterprise, higher for SMB" },
      { label: "Gross margin", value: "70% – 85%" },
      { label: "LTV / CAC", value: "3.0x – 6.0x", hint: "Target ≥3x for healthy unit economics" },
      { label: "Payback period", value: "6 – 18 months" },
      { label: "ARPU (monthly)", value: "$50 – $500", hint: "Wide range by segment and plan" },
      { label: "CAC (per customer)", value: "$500 – $5K", hint: "Sales-led often 2–3x PLG" },
      { label: "Net revenue retention", value: "100% – 130%", hint: "Best-in-class >120%" },
      { label: "Rule of 40", value: "Growth% + EBITDA% ≥ 40%" },
    ],
  },
  {
    title: "Marketplace Benchmarks",
    description: "Useful for two‑sided platforms and networks. Take rate and growth vary by vertical.",
    items: [
      { label: "Take rate", value: "8% – 20%", hint: "Transaction or subscription cut" },
      { label: "Supply growth", value: "8% – 15% monthly" },
      { label: "Demand growth", value: "12% – 25% monthly" },
      { label: "Retention (90d)", value: "25% – 50%" },
      { label: "GMV growth (YoY)", value: "40% – 100%", hint: "Early stage" },
      { label: "Contribution margin", value: "15% – 35%", hint: "After variable costs" },
      { label: "CAC payback", value: "12 – 24 months" },
    ],
  },
  {
    title: "E‑commerce Benchmarks",
    description: "Rough ranges for DTC and branded products. Geography and category matter.",
    items: [
      { label: "Gross margin", value: "45% – 65%" },
      { label: "Repeat rate", value: "20% – 35%", hint: "12‑month repeat purchase" },
      { label: "AOV growth", value: "3% – 8% quarterly" },
      { label: "Marketing as % revenue", value: "12% – 25%" },
      { label: "CAC (per customer)", value: "$30 – $150", hint: "DTC brand" },
      { label: "LTV / CAC", value: "2.0x – 4.0x" },
      { label: "Conversion (site → purchase)", value: "2% – 4%" },
    ],
  },
  {
    title: "Fintech Benchmarks",
    description: "Indicative ranges for payments, lending, and neobanks. Regulation and geography vary.",
    items: [
      { label: "Net interest margin", value: "2% – 4%", hint: "Lending" },
      { label: "Interchange / take rate", value: "0.2% – 0.5%", hint: "Payments" },
      { label: "Default rate (annual)", value: "2% – 8%", hint: "Unsecured lending" },
      { label: "CAC (per active user)", value: "$20 – $80" },
      { label: "Monthly churn", value: "3% – 8%" },
      { label: "ARPU (monthly)", value: "$5 – $50" },
    ],
  },
  {
    title: "General / Early-stage",
    description: "Cross‑sector ranges for pre‑PMF and early growth. Use for sensitivity and base cases.",
    items: [
      { label: "Discount rate (WACC)", value: "25% – 35%", hint: "Early stage risk premium" },
      { label: "Terminal growth", value: "2% – 4%", hint: "Long‑term GDP‑like" },
      { label: "Revenue growth (YoY)", value: "50% – 150%", hint: "Pre‑scale" },
      { label: "EBITDA margin (mature)", value: "15% – 30%", hint: "Software target" },
      { label: "Tax rate (effective)", value: "10% – 25%", hint: "Depends on jurisdiction" },
    ],
  },
];

const metricDefinitions: { term: string; definition: string }[] = [
  { term: "ARPU", definition: "Average revenue per user (or per account) per period, usually monthly." },
  { term: "CAC", definition: "Customer acquisition cost: total sales & marketing spend divided by new customers in the period." },
  { term: "LTV", definition: "Lifetime value: expected revenue from a customer over their lifetime, often ARPU × (1 / churn)." },
  { term: "LTV / CAC", definition: "Ratio of lifetime value to acquisition cost. Healthy SaaS often targets 3x or higher." },
  { term: "Churn", definition: "Rate at which customers stop paying (e.g. monthly or annual). Often expressed as % per month." },
  { term: "Payback period", definition: "Months to recover CAC from gross margin (CAC / (ARPU × gross margin))." },
  { term: "Gross margin", definition: "Revenue minus direct cost of delivering the product (COGS), as % of revenue." },
  { term: "Take rate", definition: "Revenue as a share of GMV or transaction volume (e.g. marketplace or payment fee)." },
  { term: "Rule of 40", definition: "Growth rate % + EBITDA margin % ≥ 40%. Used as a growth‑efficiency balance for SaaS." },
];

const CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "saas", label: "SaaS" },
  { id: "marketplace", label: "Marketplace" },
  { id: "ecommerce", label: "E‑commerce" },
  { id: "fintech", label: "Fintech" },
  { id: "general", label: "General" },
] as const;

function getCategoryId(title: string): (typeof CATEGORY_FILTERS)[number]["id"] {
  const lower = title.toLowerCase();
  if (lower.includes("saas")) return "saas";
  if (lower.includes("marketplace")) return "marketplace";
  if (lower.includes("e‑commerce") || lower.includes("e-commerce")) return "ecommerce";
  if (lower.includes("fintech")) return "fintech";
  if (lower.includes("general")) return "general";
  return "all";
}

export const Route = createFileRoute("/assumptions")({
  loader: async ({ location }) => {
    await requireAuthForLoader(location);
    return null;
  },
  component: AssumptionsPage,
});

function AssumptionsPage() {
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]["id"]>("all");

  const filteredSets = assumptionSets.filter((set) => {
    if (category === "all") return true;
    return getCategoryId(set.title) === category;
  });

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1200px] mx-auto space-y-10">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(249,137,107,0.12),transparent_70%)]" />

          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Assumptions
            </p>
            <h1 className="text-3xl lg:text-4xl font-[var(--font-display)]">
              Assumptions Library
            </h1>
            <p className="text-[var(--brand-muted)] max-w-2xl">
              Reference ranges to sanity‑check growth, pricing, churn, and
              margins in your financial models. Use these as a starting point, not a rule.
            </p>
          </header>

          <section className="bg-white/80 border border-[var(--border-soft)] rounded-2xl p-5 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
            <h2 className="text-sm font-semibold text-[var(--brand-ink)] mb-3">
              How to use this library
            </h2>
            <ul className="text-sm text-[var(--brand-muted)] space-y-2 list-disc list-inside max-w-2xl">
              <li>Pick benchmarks that match your business model (SaaS, marketplace, etc.).</li>
              <li>Use the ranges as inputs or sanity checks when building scenarios in your financial models.</li>
              <li>Compare your assumptions to these norms to stress-test base, conservative, and optimistic cases.</li>
              <li>Ranges vary by stage, geography, and segment—treat them as indicative, not prescriptive.</li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                  category === id
                    ? "border-[var(--brand-primary)] bg-[rgba(79,70,186,0.1)] text-[var(--brand-primary)]"
                    : "border-[var(--border-soft)] text-[var(--brand-muted)] hover:text-[var(--brand-primary)] hover:border-[rgba(79,70,186,0.3)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.map((set) => (
              <div
                key={set.title}
                className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]"
              >
                <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
                  {set.title}
                </h3>
                <p className="text-sm text-[var(--brand-muted)] mb-4">
                  {set.description}
                </p>
                <div className="space-y-3 text-sm">
                  {set.items.map((item) => (
                    <div
                      key={item.label}
                      className="border border-[var(--border-soft)] rounded-xl px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--brand-muted)]">{item.label}</span>
                        <span className="text-[var(--brand-ink)] font-semibold shrink-0">
                          {item.value}
                        </span>
                      </div>
                      {item.hint ? (
                        <p className="mt-1.5 text-xs text-[var(--brand-muted)]/80">
                          {item.hint}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
            <h2 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mb-3">
              Key metrics explained
            </h2>
            <p className="text-sm text-[var(--brand-muted)] mb-4 max-w-2xl">
              Short definitions for metrics used in the library and in your financial model scenarios.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {metricDefinitions.map(({ term, definition }) => (
                <div key={term} className="border-b border-[var(--surface-muted-border)] pb-3 last:border-0 sm:last:border-b">
                  <dt className="text-sm font-semibold text-[var(--brand-ink)]">{term}</dt>
                  <dd className="text-sm text-[var(--brand-muted)] mt-0.5">{definition}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="text-xs text-[var(--brand-muted)] max-w-2xl border-t border-[var(--border-soft)] pt-6">
            <p className="font-medium text-[var(--brand-ink)]/80 mb-1">Notes</p>
            <p>
              Ranges are drawn from industry reports, benchmarks, and typical early‑stage company data.
              They are not guarantees. Stage (pre‑seed vs growth), geography, and segment can shift numbers significantly.
              Always validate assumptions against your own unit economics and market research.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

