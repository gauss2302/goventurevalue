import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Rocket, Sparkles, CheckCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

const walkthroughs = [
  {
    title: "Build your first model",
    duration: "15 min",
    description:
      "Set up users, pricing, costs, and produce a complete 5‑year projection.",
    level: "Beginner",
  },
  {
    title: "DCF valuation in 7 steps",
    duration: "10 min",
    description:
      "Learn how to discount cash flows and interpret terminal value.",
    level: "Beginner",
  },
  {
    title: "Scenario stress test",
    duration: "8 min",
    description:
      "Compare conservative vs optimistic outcomes and stress assumptions.",
    level: "Intermediate",
  },
];

const checkpoints = [
  "Define your business model and revenue streams",
  "Pick realistic growth and churn assumptions",
  "Align headcount with runway targets",
  "Validate CAC and LTV against benchmarks",
];

export const Route = createFileRoute("/academy")({
  loader: async ({ location }) => {
    await requireAuthForLoader(location);
    return null;
  },
  component: AcademyPage,
});

function AcademyPage() {
  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1200px] mx-auto space-y-10">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.12),transparent_70%)]" />

          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Academy
            </p>
            <h1 className="text-3xl lg:text-4xl font-[var(--font-display)]">
              Guided Walkthroughs
            </h1>
            <p className="text-[var(--brand-muted)] max-w-2xl">
              Learn the core building blocks of investor‑ready models with
              short, guided tutorials.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/models/new"
                className="px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-sm font-semibold shadow-[0_10px_20px_rgba(79,70,186,0.2)]"
              >
                Start a walkthrough
              </Link>
              <Link
                to="/assumptions"
                className="px-4 py-2 rounded-full border border-[var(--border-soft)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
              >
                Browse assumptions library
              </Link>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-3">
            {walkthroughs.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    {item.level}
                  </span>
                  <span className="text-xs text-[var(--brand-muted)] bg-[var(--surface-muted)] px-2 py-1 rounded-full">
                    {item.duration}
                  </span>
                </div>
                <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--brand-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="text-[var(--brand-primary)]" size={20} />
                <h2 className="text-lg font-[var(--font-display)]">
                  Model builder checklist
                </h2>
              </div>
              <div className="space-y-3 text-sm text-[var(--brand-muted)]">
                {checkpoints.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[var(--brand-primary)] mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[linear-gradient(135deg,rgba(79,70,186,0.12),rgba(132,232,244,0.18))] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Rocket className="text-[var(--brand-primary)]" size={20} />
                <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                  Founder tips
                </h3>
              </div>
              <p className="text-sm text-[var(--brand-muted)]">
                Start with simple assumptions, then layer in complexity once
                you validate conversion and pricing.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--brand-primary)] font-semibold">
                <Sparkles size={16} />
                <span>Next: DCF essentials</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
