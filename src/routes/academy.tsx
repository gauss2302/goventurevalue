import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Rocket, Sparkles, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubTitle } from "@/components/ui/typography";
import { AppShell, PageContainer, PageHeader } from "@/components/layout";
import { usePageMotion } from "@/lib/motion";
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

function AcademyPage() {
  const { container, item } = usePageMotion();

  return (
    <AppShell>
      <PageContainer>
        <div className="space-y-[var(--space-6)]">
          <PageHeader
            eyebrow="Academy"
            title="Guided Walkthroughs"
            description="Learn the core building blocks of investor-ready models with short, guided tutorials."
            actions={
              <>
                <Button variant="brand" size="sm" className="rounded-full" asChild>
                  <Link to="/models/new">Start a walkthrough</Link>
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link to="/assumptions">Browse assumptions library</Link>
                </Button>
              </>
            }
          />

          <motion.section
            className="grid gap-[var(--space-5)] lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {walkthroughs.map((w) => (
              <motion.div key={w.title} variants={item}>
                <Card interactive className="h-full">
                  <CardContent className="p-[var(--space-5)]">
                    <div className="mb-[var(--space-4)] flex items-center justify-between">
                      <Badge variant="brand">{w.level}</Badge>
                      <span className="rounded-full bg-[var(--surface-muted)] px-[var(--space-2)] py-1 text-[var(--text-caption1)] text-[var(--brand-muted)]">
                        {w.duration}
                      </span>
                    </div>
                    <h3 className="mb-[var(--space-2)] font-display text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
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
            initial="hidden"
            animate="visible"
            variants={item}
          >
            <Card>
              <CardContent className="p-[var(--space-5)]">
                <div className="mb-[var(--space-4)] flex items-center gap-[var(--space-3)]">
                  <BookOpen className="text-[var(--brand-primary)]" size={20} aria-hidden />
                  <SubTitle>Model builder checklist</SubTitle>
                </div>
                <div className="space-y-[var(--space-3)] text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                  {checkpoints.map((cp) => (
                    <div key={cp} className="flex items-start gap-[var(--space-2)]">
                      <CheckCircle size={16} className="mt-0.5 text-[var(--brand-primary)]" aria-hidden />
                      <span>{cp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-5)]">
              <div aria-hidden className="absolute inset-0 -z-0 bg-mesh-accent opacity-70" />
              <div className="relative">
                <div className="mb-[var(--space-3)] flex items-center gap-[var(--space-3)]">
                  <Rocket className="text-[var(--brand-primary)]" size={20} aria-hidden />
                  <SubTitle>Founder tips</SubTitle>
                </div>
                <p className="text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                  Start with simple assumptions, then layer in complexity once you
                  validate conversion and pricing.
                </p>
                <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)] text-[var(--text-subheadline)] font-semibold text-[var(--brand-primary-hover)]">
                  <Sparkles size={16} aria-hidden />
                  <span>Next: DCF essentials</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </PageContainer>
    </AppShell>
  );
}
