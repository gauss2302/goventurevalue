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
} from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { DashboardKpiCards } from "../components/DashboardKpiCards";
import { DashboardStats } from "../components/DashboardStats";
import ModelList from "../components/ModelList";
import type { Model } from "../components/ModelList";
import { Button } from "@/components/ui/button";
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

const statusClassName: Record<PresentationStatus, string> = {
  draft: "bg-[var(--surface-2)] text-[var(--brand-muted)]",
  generating: "bg-blue-50 text-[var(--brand-primary)]",
  ready: "bg-green-50 text-green-600",
  failed: "bg-red-50 text-red-600",
};

function Dashboard() {
  const { data, isPending, error } = useQuery(dashboardQueryOptions());
  const startBillingCheckoutFn = useServerFn(startBillingCheckout);
  const openBillingPortalFn = useServerFn(openBillingPortal);
  const { billing } = Route.useSearch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (billing === "success") {
      toast.success("You're now on Pro! Your subscription is active.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [billing, queryClient]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
        <div className="text-[13px] text-[#6b6a76]">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
        <div className="text-[13px] text-red-600">
          Failed to load dashboard. Please refresh the page.
        </div>
      </div>
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

  const kpiItems = [
    {
      label: "Total Valuation",
      value: "\u2014",
      badge: "Add traction",
      badgeClassName: "bg-[#ecfdf3] text-[#15803d]",
      icon: TrendingUp,
      iconWrapClassName: "bg-[#eef2ff]",
      iconClassName: "text-[#4338ca]",
    },
    {
      label: "Active Scenarios",
      value: scenariosDisplay,
      badge: "Across models",
      badgeClassName: "bg-[#eef2ff] text-[#4338ca]",
      icon: Layers,
      iconWrapClassName: "bg-[#f5f3ff]",
      iconClassName: "text-[#5b21b6]",
    },
    {
      label: "Customer Cohorts",
      value: cohortValue,
      badge: stats.modelsCount > 0 ? "In workspace" : "Get started",
      badgeClassName: "bg-[#fff7ed] text-[#c2410c]",
      icon: Users,
      iconWrapClassName: "bg-[#ecfeff]",
      iconClassName: "text-[#0e7490]",
    },
  ];

  const setupHref = hasModels ? "/pitch-decks/new" : "/models/new";

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Sidebar />

      <main className="relative transition-[margin] duration-300 md:ml-[var(--sidebar-width)]">
        <header className="sticky top-0 z-20 border-b border-[#eeedf3] bg-[#f8f9ff]/90 px-3 py-2 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1
              className="pt-10 text-base font-bold text-[#0b1c30] md:pt-0"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Havamind Dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#eeedf3] bg-white text-[#464554] shadow-sm transition-colors hover:bg-[#f9fafb]"
                aria-label="Notifications"
              >
                <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#eeedf3] bg-white text-[#464554] shadow-sm transition-colors hover:bg-[#f9fafb]"
                aria-label="Help"
              >
                <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              {user.plan === "pro" ? (
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  className="rounded-md border border-[#e0dffd] bg-[#ecebfa] px-2.5 py-1 text-xs font-bold text-[#2a14b4] transition-opacity hover:opacity-90"
                >
                  Manage plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartCheckout}
                  className="rounded-md border border-[#e0dffd] bg-[#ecebfa] px-2.5 py-1 text-xs font-bold text-[#2a14b4] transition-opacity hover:opacity-90"
                >
                  Upgrade
                </button>
              )}
              <div className="flex items-center gap-1.5 border-l border-[#eeedf3] pl-1.5">
                <div className="text-right leading-tight">
                  <p className="text-xs font-semibold text-[#0b1c30]">
                    {user.name || "Founder"}
                  </p>
                  <p className="text-[11px] text-[#6b6a76]">Founder</p>
                </div>
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ecebfa] text-xs font-bold text-[#2a14b4]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] space-y-5 px-3 py-5 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05, delayChildren: 0.02 },
              },
            }}
            className="space-y-5"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
            >
              <DashboardKpiCards items={kpiItems} />
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
            >
              <DashboardStats stats={miniStats} />
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className="grid gap-4 lg:grid-cols-2"
            >
              <section className="rounded-xl border border-[#eeedf3] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2
                      className="text-sm font-bold text-[#0b1c30]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Pitch Decks
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6b6a76]">
                      AI-generated slides from your models
                    </p>
                  </div>
                  <Link
                    to="/pitch-decks"
                    className="text-xs font-bold text-[#4338ca] hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/pitch-decks/new"
                    className="flex min-h-[100px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#d4d2e8] bg-[#f8f7ff] p-4 text-center transition-colors hover:border-[#4338ca]/40 hover:bg-[#f3f0ff]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4338ca] text-white shadow-md">
                      <Plus className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-[#2a14b4]">Create New Deck</span>
                  </Link>
                  {previewDeck ? (
                    <Link
                      to="/pitch-decks/$deckId"
                      params={{ deckId: String(previewDeck.id) }}
                      className="group flex min-h-[100px] flex-col overflow-hidden rounded-lg border border-[#eeedf3] bg-[#fafbff] shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="relative h-16 w-full bg-gradient-to-br from-[#4338ca]/20 via-[#a78bfa]/25 to-[#36c9f9]/20">
                        <Presentation className="absolute bottom-2 right-2 h-6 w-6 text-[#4338ca]/40" />
                      </div>
                      <div className="flex flex-1 flex-col justify-center p-3">
                        <p className="line-clamp-2 text-xs font-semibold text-[#0b1c30] group-hover:text-[#4338ca]">
                          {previewDeck.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#6b6a76]">
                          {previewDeck.startupName}
                        </p>
                        <span
                          className={`mt-1.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName[previewDeck.status] ?? statusClassName.draft}`}
                        >
                          {previewDeck.status}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex min-h-[100px] flex-col justify-center rounded-lg border border-[#eeedf3] bg-gradient-to-br from-[#f8f9ff] to-[#eef2ff] p-4 text-center">
                      <Presentation className="mx-auto mb-1.5 h-8 w-8 text-[#4338ca]/35" />
                      <p className="text-xs font-medium text-[#464554]">No decks yet</p>
                      <p className="mt-0.5 text-[11px] text-[#6b6a76]">
                        Create a deck to see a preview here
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex flex-col rounded-xl bg-[#2a14b4] p-4 text-white shadow-lg">
                <h2
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Next steps
                </h2>
                <p className="mt-0.5 text-xs text-white/80">
                  Finish setup to unlock valuations and decks
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-start gap-2.5">
                    {hasModels ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2.5} />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={2} />
                    )}
                    <div>
                      <p className="text-xs font-semibold">Create a financial model</p>
                      <p className="text-[11px] text-white/70">Capture traction and scenarios</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    {hasDeck ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2.5} />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={2} />
                    )}
                    <div>
                      <p className="text-xs font-semibold">Generate a pitch deck</p>
                      <p className="text-[11px] text-white/70">Export-ready narrative and slides</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-semibold">Tune benchmark assumptions</p>
                      <p className="text-[11px] text-white/70">Align multiples with your stage</p>
                    </div>
                  </li>
                </ul>
                <div className="mt-auto pt-5">
                  <Button
                    asChild
                    className="h-9 w-full rounded-lg border-0 bg-white text-xs font-bold text-[#2a14b4] shadow-md hover:bg-white/95"
                  >
                    <Link to={setupHref}>Continue setup</Link>
                  </Button>
                </div>
              </section>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
            >
              <ModelList models={models} />
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
