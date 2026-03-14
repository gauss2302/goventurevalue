import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Sparkles, CheckCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

const walkthroughs = [
  {
    title: "Build your first model",
    duration: "15 min",
    description:
      "Set up users, pricing, costs, and produce a complete 5-year projection.",
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

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

function AcademyPage() {
  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-[var(--space-5)] py-[var(--space-6)] lg:px-[var(--space-6)] max-w-[1200px] mx-auto space-y-[var(--space-6)]">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.12),transparent_70%)]" />

          <motion.header
            className="space-y-[var(--space-3)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="text-[var(--text-caption1)] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Academy
            </p>
            <h1
              className="text-[var(--text-headline)] lg:text-[var(--text-headline)]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.015em" }}
            >
              Guided Walkthroughs
            </h1>
            <p className="text-[var(--text-body)] text-[var(--brand-muted)] max-w-2xl">
              Learn the core building blocks of investor-ready models with
              short, guided tutorials.
            </p>
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button variant="brand" size="sm" className="rounded-full shadow-[0_10px_20px_rgba(79,70,186,0.2)]" asChild>
                <Link to="/models/new">Start a walkthrough</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to="/assumptions">Browse assumptions library</Link>
              </Button>
            </div>
          </motion.header>

          <motion.section
            className="grid gap-[var(--space-5)] lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {walkthroughs.map((w) => (
              <motion.div key={w.title} variants={item}>
                <Card className="h-full">
                  <CardContent className="p-[var(--space-5)]">
                    <div className="flex items-center justify-between mb-[var(--space-4)]">
                      <span className="text-[var(--text-caption1)] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                        {w.level}
                      </span>
                      <span className="text-[var(--text-caption1)] text-[var(--brand-muted)] bg-[var(--surface-muted)] px-[var(--space-2)] py-1 rounded-full">
                        {w.duration}
                      </span>
                    </div>
                    <h3
                      className="text-[var(--text-title3)] text-[var(--brand-ink)] mb-[var(--space-2)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {w.title}
                    </h3>
                    <p className="text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                      {w.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.section>

          <motion.section
            className="grid gap-[var(--space-5)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <Card>
              <CardContent className="p-[var(--space-5)]">
                <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-4)]">
                  <BookOpen className="text-[var(--brand-primary)]" size={20} />
                  <h2
                    className="text-[var(--text-title3)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Model builder checklist
                  </h2>
                </div>
                <div className="space-y-[var(--space-3)] text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                  {checkpoints.map((cp) => (
                    <div key={cp} className="flex items-start gap-[var(--space-2)]">
                      <CheckCircle
                        size={16}
                        className="text-[var(--brand-primary)] mt-0.5"
                      />
                      <span>{cp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <motion.div
              className="bg-[linear-gradient(135deg,var(--brand-primary)/12,var(--brand-ice)/18)] rounded-[var(--card-radius)] p-[var(--space-5)]"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-3)]">
                <Rocket className="text-[var(--brand-primary)]" size={20} />
                <h3
                  className="text-[var(--text-title3)] text-[var(--brand-ink)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Founder tips
                </h3>
              </div>
              <p className="text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                Start with simple assumptions, then layer in complexity once you
                validate conversion and pricing.
              </p>
              <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)] text-[var(--text-subheadline)] text-[var(--brand-primary)] font-semibold">
                <Sparkles size={16} />
                <span>Next: DCF essentials</span>
              </div>
            </motion.div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
