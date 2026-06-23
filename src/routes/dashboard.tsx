import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  HelpCircle,
  Layers,
  Plus,
  Presentation,
  TrendingUp,
  Users,
  Check,
  Circle,
  ArrowRight,
} from "lucide-react";
import { DashboardKpiCards } from "../components/DashboardKpiCards";
import type { DashboardKpiItem } from "../components/DashboardKpiCards";
import { DashboardStats } from "../components/DashboardStats";
import ModelList from "../components/ModelList";
import type { Model } from "../components/ModelList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SubTitle, Muted } from "@/components/ui/typography";
import { AppShell, DashboardHeader, PageContainer, LoadingState, ErrorState } from "@/components/layout";
import { usePageMotion } from "@/lib/motion";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { openBillingPortal, startBillingCheckout } from "@/lib/billing/serverFns";
import type { PresentationStatus } from "@/lib/dto";

type PitchDeckSummary = {
  id: number;
  title: string;
  startupName: string;
  status: PresentationStatus;
  updatedAt: string;
};

type LoaderData = {
  models: Model[];
  user: {
    name: string | null;
    email: string | null;
    plan: "free" | "pro";
  };
  stats: {
    modelsCount: number;
    scenariosCount: number;
    totalStartingUsers: number;
    lastModelUpdatedAt: string | null;
  };
  lastLoginAt: string | null;
  pitchDecks: PitchDeckSummary[];
};

const loadDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    schema,
    { eq, desc, sql, and },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/server"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const {
    financialModels,
    modelScenarios,
    modelSettings,
    billingSubscriptions,
    session: sessionTable,
    pitchDecks: pitchDecksTable,
  } = schema;

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const [models, scenariosCountRow, totalStartingUsersRow, lastLoginRow, decks, billingSnapshot] =
    await Promise.all([
      db.query.financialModels.findMany({
        where: eq(financialModels.userId, session.user.id),
        orderBy: [desc(financialModels.updatedAt)],
      }),
      db
        .select({
          scenarioType: modelScenarios.scenarioType,
          count: sql<number>`count(*)`,
        })
        .from(modelScenarios)
        .innerJoin(
          financialModels,
          eq(modelScenarios.modelId, financialModels.id)
        )
        .where(eq(financialModels.userId, session.user.id))
        .groupBy(modelScenarios.scenarioType),
      db
        .select({
          total: sql<number>`coalesce(sum(${modelSettings.startUsers}), 0)`,
        })
        .from(modelSettings)
        .innerJoin(
          financialModels,
          eq(modelSettings.modelId, financialModels.id)
        )
        .where(eq(financialModels.userId, session.user.id)),
      db
        .select({ createdAt: sessionTable.createdAt })
        .from(sessionTable)
        .where(eq(sessionTable.userId, session.user.id))
        .orderBy(desc(sessionTable.createdAt))
        .limit(1),
      db.query.pitchDecks.findMany({
        where: and(
          eq(pitchDecksTable.userId, session.user.id),
          eq(pitchDecksTable.status, "ready")
        ),
        orderBy: [desc(pitchDecksTable.updatedAt)],
      }),
      db.query.billingSubscriptions.findFirst({
        where: eq(billingSubscriptions.userId, session.user.id),
      }),
    ]);

  const scenarioCounts = scenariosCountRow.reduce(
    (acc, row) => {
      acc[row.scenarioType] = Number(row.count ?? 0);
      return acc;
    },
    {
      conservative: 0,
      base: 0,
      optimistic: 0,
    } as Record<"conservative" | "base" | "optimistic", number>
  );
  const scenariosCount =
    scenarioCounts.conservative +
    scenarioCounts.base +
    scenarioCounts.optimistic;
  const totalStartingUsers = Number(totalStartingUsersRow[0]?.total ?? 0);
  const lastModelUpdatedAt = models[0]?.updatedAt
    ? models[0].updatedAt.toISOString()
    : null;
  const lastLoginAt = lastLoginRow[0]?.createdAt
    ? lastLoginRow[0].createdAt.toISOString()
    : null;
  const plan =
    billingSnapshot &&
    (billingSnapshot.status === "active" ||
      billingSnapshot.status === "trialing")
      ? "pro"
      : "free";

  return {
    user: {
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      plan,
    },
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      description: m.description,
      stage: m.stage,
      latestArr: null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    stats: {
      modelsCount: models.length,
      scenariosCount,
      totalStartingUsers,
      lastModelUpdatedAt,
    },
    lastLoginAt,
    pitchDecks: decks.slice(0, 5).map((d) => ({
      id: d.id,
      title: d.title,
      startupName: d.startupName,
      status: d.status,
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
});

const dashboardQueryOptions = () => ({
  queryKey: ["dashboard"] as const,
  queryFn: () => loadDashboardData() as Promise<LoaderData>,
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    billing: search.billing === "success" ? ("success" as const) : undefined,
  }),
  loader: async ({ location, context }) => {
    await requireAuthForLoader(location);
    await context.queryClient.prefetchQuery(dashboardQueryOptions());
    return null;
  },
  component: Dashboard,
});

const statusBadgeVariant: Record<
  PresentationStatus,
  "secondary" | "info" | "success" | "destructive"
> = {
  draft: "secondary",
  generating: "info",
  ready: "success",
  failed: "destructive",
};

function Dashboard() {
  const { data, isPending, error } = useQuery(dashboardQueryOptions());
  const startBillingCheckoutFn = useServerFn(startBillingCheckout);
  const openBillingPortalFn = useServerFn(openBillingPortal);
  const { billing } = Route.useSearch();
  const queryClient = useQueryClient();
  const { container, item } = usePageMotion();

  useEffect(() => {
    if (billing === "success") {
      toast.success("You're now on Pro! Your subscription is active.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [billing, queryClient]);

  if (isPending) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <LoadingState message="Loading your workspace…" />
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <ErrorState message="We couldn't load your dashboard. Please refresh the page." />
        </PageContainer>
      </AppShell>
    );
  }

  const { models, user, stats, pitchDecks } = data;
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "HM";

  const numberFormat = new Intl.NumberFormat();
  const scenariosDisplay =
    stats.scenariosCount < 10
      ? String(stats.scenariosCount).padStart(2, "0")
      : numberFormat.format(stats.scenariosCount);

  const cohortValue =
    stats.totalStartingUsers > 0
      ? numberFormat.format(stats.totalStartingUsers)
      : numberFormat.format(stats.modelsCount);

  const handleStartCheckout = async () => {
    try {
      const { url } = await startBillingCheckoutFn({
        data: { returnPath: "/dashboard" },
      });
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start checkout.";
      toast.error(message);
    }
  };

  const handleOpenPortal = async () => {
    try {
      const { url } = await openBillingPortalFn({
        data: { returnPath: "/dashboard" },
      });
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to open billing portal.";
      toast.error(message);
    }
  };

  const hasModels = models.length > 0;
  const hasDeck = pitchDecks.length > 0;
  const previewDeck = pitchDecks[0];

  const miniStats = [
    {
      label: "Financial Models",
      value: String(stats.modelsCount),
      helper: "Total",
      tone: "primary" as const,
    },
    {
      label: "Active Scenarios",
      value: String(stats.scenariosCount),
      helper: "Across models",
      tone: "secondary" as const,
    },
    {
      label: "Starting Users",
      value: stats.totalStartingUsers > 0 ? numberFormat.format(stats.totalStartingUsers) : "—",
      helper: "Cohorts",
      tone: "ice" as const,
    },
    {
      label: "Last updated",
      value: stats.lastModelUpdatedAt
        ? new Date(stats.lastModelUpdatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "—",
      helper: "Activity",
      tone: "accent" as const,
    },
  ];

  const kpiItems: DashboardKpiItem[] = [
    {
      label: "Total Valuation",
      value: "\u2014",
      badge: "Add traction",
      tone: "primary",
      icon: TrendingUp,
    },
    {
      label: "Active Scenarios",
      value: scenariosDisplay,
      badge: "Across models",
      tone: "accent",
      icon: Layers,
    },
    {
      label: "Customer Cohorts",
      value: cohortValue,
      badge: stats.modelsCount > 0 ? "In workspace" : "Get started",
      tone: "info",
      icon: Users,
    },
  ];

  const setupHref = hasModels ? "/pitch-decks/new" : "/models/new";

  return (
    <AppShell>
      <DashboardHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name?.split(" ")[0] || "Founder"}`}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-[var(--radius-md)]"
              aria-label="Notifications"
            >
              <Bell className="size-4" strokeWidth={1.85} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 rounded-[var(--radius-md)] sm:flex"
              aria-label="Help"
            >
              <HelpCircle className="size-4" strokeWidth={1.85} />
            </Button>
            {user.plan === "pro" ? (
              <Button variant="ghost-brand" size="sm" onClick={handleOpenPortal}>
                Manage plan
              </Button>
            ) : (
              <Button variant="accent" size="sm" onClick={handleStartCheckout}>
                Upgrade
              </Button>
            )}
            <div className="ml-1 flex items-center gap-2 border-l border-[var(--border-soft)] pl-2">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)]">
                  {user.name || "Founder"}
                </p>
                <p className="text-[var(--text-caption2)] text-[var(--brand-muted)]">Founder</p>
              </div>
              <Avatar className="size-9">
                <AvatarFallback className="bg-[var(--brand-primary-muted)] font-display text-[var(--text-caption1)] font-bold text-[var(--brand-primary-hover)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </>
        }
      />

      <PageContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="space-y-[var(--space-5)]"
        >
          <motion.div variants={item}>
            <DashboardKpiCards items={kpiItems} />
          </motion.div>

          <motion.div variants={item}>
            <DashboardStats stats={miniStats} />
          </motion.div>

          <motion.div variants={item} className="grid gap-[var(--space-4)] lg:grid-cols-2">
            <section className="rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-5)] shadow-[var(--card-shadow)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <SubTitle>Pitch Decks</SubTitle>
                  <Muted className="mt-1 text-[var(--text-caption1)]">
                    AI-generated slides from your models
                  </Muted>
                </div>
                <Link
                  to="/pitch-decks"
                  className="flex items-center gap-1 text-[var(--text-caption1)] font-semibold text-[var(--brand-primary-hover)] hover:underline"
                >
                  View all <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
              <div className="mt-[var(--space-4)] grid gap-[var(--space-3)] sm:grid-cols-2">
                <Link
                  to="/pitch-decks/new"
                  className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border-soft)] bg-[var(--page)] p-[var(--space-4)] text-center transition-colors hover:border-[color-mix(in_srgb,var(--brand-primary)_45%,var(--border-soft))] hover:bg-[var(--brand-primary-muted)]"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--brand-primary)_32%,transparent)]">
                    <Plus className="size-5" strokeWidth={2.5} />
                  </div>
                  <span className="text-[var(--text-caption1)] font-bold text-[var(--brand-primary-hover)]">
                    Create New Deck
                  </span>
                </Link>
                {previewDeck ? (
                  <Link
                    to="/pitch-decks/$deckId"
                    params={{ deckId: String(previewDeck.id) }}
                    className="group flex min-h-[112px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--page)] shadow-[var(--card-shadow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"
                  >
                    <div className="relative h-16 w-full bg-mesh-accent">
                      <Presentation className="absolute bottom-2 right-2 size-6 text-[var(--brand-primary)]/50" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-[var(--space-3)]">
                      <p className="line-clamp-2 text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)] transition-colors group-hover:text-[var(--brand-primary-hover)]">
                        {previewDeck.title}
                      </p>
                      <p className="mt-0.5 truncate text-[var(--text-caption2)] text-[var(--brand-muted)]">
                        {previewDeck.startupName}
                      </p>
                      <Badge
                        variant={statusBadgeVariant[previewDeck.status] ?? "secondary"}
                        className="mt-1.5 capitalize"
                      >
                        {previewDeck.status}
                      </Badge>
                    </div>
                  </Link>
                ) : (
                  <div className="flex min-h-[112px] flex-col justify-center rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--page)] p-[var(--space-4)] text-center">
                    <Presentation className="mx-auto mb-1.5 size-8 text-[var(--brand-primary)]/35" />
                    <p className="text-[var(--text-caption1)] font-medium text-[var(--brand-ink)]">No decks yet</p>
                    <p className="mt-0.5 text-[var(--text-caption2)] text-[var(--brand-muted)]">
                      Create a deck to see a preview here
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="relative flex flex-col overflow-hidden rounded-[var(--card-radius)] bg-[var(--brand-ink)] p-[var(--space-5)] text-white shadow-[var(--shadow-lg)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_55%,transparent),transparent_70%)]"
              />
              <SubTitle className="relative text-white">Next steps</SubTitle>
              <p className="relative mt-1 text-[var(--text-caption1)] text-white/75">
                Finish setup to unlock valuations and decks
              </p>
              <ul className="relative mt-[var(--space-4)] space-y-[var(--space-3)]">
                {[
                  { done: hasModels, title: "Create a financial model", hint: "Capture traction and scenarios" },
                  { done: hasDeck, title: "Generate a pitch deck", hint: "Export-ready narrative and slides" },
                  { done: false, title: "Tune benchmark assumptions", hint: "Align multiples with your stage" },
                ].map((step) => (
                  <li key={step.title} className="flex items-start gap-2.5">
                    {step.done ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-primary)]" strokeWidth={2.5} />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-white/40" strokeWidth={2} />
                    )}
                    <div>
                      <p className="text-[var(--text-caption1)] font-semibold">{step.title}</p>
                      <p className="text-[var(--text-caption2)] text-white/65">{step.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="relative mt-auto pt-[var(--space-5)]">
                <Button variant="accent" className="w-full" asChild>
                  <Link to={setupHref}>Continue setup</Link>
                </Button>
              </div>
            </section>
          </motion.div>

          <motion.div variants={item}>
            <ModelList models={models} />
          </motion.div>
        </motion.div>
      </PageContainer>
    </AppShell>
  );
}
