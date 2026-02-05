import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

const assumptionSets = [
  {
    title: "SaaS Benchmarks",
    description: "Typical early‑stage ranges for B2B SaaS.",
    items: [
      { label: "Monthly churn", value: "2% – 6%" },
      { label: "Gross margin", value: "70% – 85%" },
      { label: "LTV / CAC", value: "3.0x – 6.0x" },
      { label: "Payback period", value: "6 – 18 months" },
    ],
  },
  {
    title: "Marketplace Benchmarks",
    description: "Useful for two‑sided platforms and networks.",
    items: [
      { label: "Take rate", value: "8% – 20%" },
      { label: "Supply growth", value: "8% – 15% monthly" },
      { label: "Demand growth", value: "12% – 25% monthly" },
      { label: "Retention (90d)", value: "25% – 50%" },
    ],
  },
  {
    title: "E‑commerce Benchmarks",
    description: "Rough ranges for DTC products.",
    items: [
      { label: "Gross margin", value: "45% – 65%" },
      { label: "Repeat rate", value: "20% – 35%" },
      { label: "AOV growth", value: "3% – 8% quarterly" },
      { label: "Marketing as % revenue", value: "12% – 25%" },
    ],
  },
];

export const Route = createFileRoute("/assumptions")({
  loader: async ({ location }) => {
    await requireAuthForLoader(location);
    return null;
  },
  component: AssumptionsPage,
});

function AssumptionsPage() {
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
              margins. Use these as a starting point, not a rule.
            </p>
          </header>

          <div className="flex flex-wrap gap-3">
            {["SaaS", "Marketplace", "E‑commerce", "Fintech", "Other"].map(
              (label) => (
                <button
                  key={label}
                  className="px-4 py-2 rounded-full border border-[var(--border-soft)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
                >
                  {label}
                </button>
              )
            )}
          </div>

          <section className="grid gap-6 lg:grid-cols-3">
            {assumptionSets.map((set) => (
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
                <div className="space-y-3 text-sm text-[var(--brand-muted)]">
                  {set.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border border-[var(--border-soft)] rounded-xl px-3 py-2"
                    >
                      <span>{item.label}</span>
                      <span className="text-[var(--brand-ink)] font-semibold">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
