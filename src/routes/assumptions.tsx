import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubTitle } from "@/components/ui/typography";
import { AppShell, PageContainer, PageHeader } from "@/components/layout";
import { usePageMotion } from "@/lib/motion";
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
  const { container, item } = usePageMotion();

  const filteredSets = assumptionSets.filter((set) => {
    if (category === "all") return true;
    return getCategoryId(set.title) === category;
  });

  return (
    <AppShell>
      <PageContainer>
        <div className="space-y-[var(--space-7)]">
          <PageHeader
            eyebrow="Assumptions"
            title="Assumptions Library"
            description="Reference ranges to sanity-check growth, pricing, churn, and margins in your financial models. Use these as a starting point, not a rule."
          />

          <Card>
            <CardContent className="p-[var(--space-5)]">
              <SubTitle className="mb-[var(--space-3)] text-[var(--text-subheadline)]">
                How to use this library
              </SubTitle>
              <ul className="max-w-2xl list-inside list-disc space-y-2 text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                <li>Pick benchmarks that match your business model (SaaS, marketplace, etc.).</li>
                <li>Use the ranges as inputs or sanity checks when building scenarios in your financial models.</li>
                <li>Compare your assumptions to these norms to stress-test base, conservative, and optimistic cases.</li>
                <li>Ranges vary by stage, geography, and segment—treat them as indicative, not prescriptive.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={category === id ? "brand" : "outline"}
                className="rounded-full"
                onClick={() => setCategory(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          <motion.section
            key={category}
            className="grid gap-[var(--space-5)] sm:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {filteredSets.map((set) => (
              <motion.div key={set.title} variants={item}>
                <Card interactive className="h-full">
                  <CardContent className="p-[var(--space-5)]">
                    <h3 className="mb-[var(--space-2)] font-display text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
                      {set.title}
                    </h3>
                    <p className="mb-[var(--space-4)] text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                      {set.description}
                    </p>
                    <div className="space-y-[var(--space-3)] text-[var(--text-subheadline)]">
                      {set.items.map((entry) => (
                        <div
                          key={entry.label}
                          className="rounded-[var(--radius-md)] border border-[var(--border-soft)] px-[var(--space-3)] py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--brand-muted)]">{entry.label}</span>
                            <span className="shrink-0 font-semibold text-[var(--brand-ink)]">
                              {entry.value}
                            </span>
                          </div>
                          {entry.hint ? (
                            <p className="mt-1.5 text-[var(--text-caption1)] text-[var(--brand-muted)]">
                              {entry.hint}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.section>

          <Card>
            <CardContent className="p-[var(--space-5)]">
              <SubTitle className="mb-[var(--space-3)]">Key metrics explained</SubTitle>
              <p className="mb-[var(--space-4)] max-w-2xl text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                Short definitions for metrics used in the library and in your financial model scenarios.
              </p>
              <dl className="grid gap-[var(--space-3)] sm:grid-cols-2">
                {metricDefinitions.map(({ term, definition }) => (
                  <div key={term} className="border-b border-[var(--surface-muted-border)] pb-3 last:border-0 sm:last:border-b">
                    <dt className="text-[var(--text-subheadline)] font-semibold text-[var(--brand-ink)]">{term}</dt>
                    <dd className="mt-0.5 text-[var(--text-subheadline)] text-[var(--brand-muted)]">{definition}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="max-w-2xl border-t border-[var(--border-soft)] pt-[var(--space-5)] text-[var(--text-caption1)] text-[var(--brand-muted)]">
            <p className="mb-1 font-medium text-[var(--brand-ink)]">Notes</p>
            <p>
              Ranges are drawn from industry reports, benchmarks, and typical early-stage company data.
              They are not guarantees. Stage (pre-seed vs growth), geography, and segment can shift numbers significantly.
              Always validate assumptions against your own unit economics and market research.
            </p>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

