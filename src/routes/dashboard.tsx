import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sidebar } from "../components/Sidebar";
import { DashboardStats } from "../components/DashboardStats";
import { RecentActivity } from "../components/RecentActivity";
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
  activities: Array<{
    id: number;
    action: string;
    target: string;
    at: string;
  }>;
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

  const activities = models.slice(0, 4).map((model) => ({
    id: model.id,
    action:
      model.updatedAt.getTime() === model.createdAt.getTime()
        ? "Created model"
        : "Updated model",
    target: model.name,
    at: (model.updatedAt || model.createdAt).toISOString(),
  }));

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
    activities,
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

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page)]">
        <div className="text-[13px] text-[var(--brand-muted)]">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page)]">
        <div className="text-[13px] text-red-600">
          Failed to load dashboard. Please refresh the page.
        </div>
      </div>
    );
  }

  const {
    models,
    user,
    stats,
    lastLoginAt: _lastLoginAt,
    activities,
    pitchDecks,
  } = data;
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "GV";

  const numberFormat = new Intl.NumberFormat();
  const formatDateShort = (value: string | null) => {
    if (!value) return "\u2014";
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const statsData = [
    {
      label: "Models",
      value: numberFormat.format(stats.modelsCount),
      helper: "Financial",
      tone: "primary" as const,
    },
    {
      label: "Scenarios",
      value: numberFormat.format(stats.scenariosCount),
      helper: "Active",
      tone: "secondary" as const,
    },
    {
      label: "Starting Users",
      value: numberFormat.format(stats.totalStartingUsers),
      helper: "Cohorts",
      tone: "ice" as const,
    },
    {
      label: "Last Update",
      value: formatDateShort(stats.lastModelUpdatedAt),
      helper: "Recent",
      tone: "accent" as const,
    },
  ];

  const formatCompact = (value: number) =>
    new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
  const planLabel = user.plan === "pro" ? "Pro" : "Free";

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

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--brand-ink)]">
      <Sidebar />

      <main className="relative transition-[margin] duration-300 md:ml-[var(--sidebar-width)]">
        <div className="relative mx-auto max-w-[1200px] px-3 py-4 lg:px-4">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.04, delayChildren: 0.03 },
              },
            }}
            className="relative space-y-4"
          >
            {/* ── Application header: title + controls ── */}
            <motion.header
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
              }}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <h1
                className="text-base font-bold text-[var(--brand-ink)]"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[var(--border-soft)] bg-white px-2.5 py-1.5 text-[11px] text-[var(--brand-muted)]">
                  {formatDateShort(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())} – {formatDateShort(new Date().toISOString())}
                </span>
                <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-[11px]">
                  Export
                </Button>
                <Button
                  size="sm"
                  className="h-7 shrink-0 rounded-full bg-[var(--brand-primary)] px-2.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_rgba(27,118,252,0.25)] hover:bg-[#1565D8]"
                  asChild
                >
                  <Link to="/models/new">+ New model</Link>
                </Button>
              </div>
            </motion.header>

            {/* ── Row 1: 3 KPI cards ── */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
              }}
            >
              <DashboardStats stats={statsData.slice(0, 3)} />
            </motion.div>

            {/* ── Row 2: 2/3 + 1/3 — Pitch Decks (left), Profile / Subscriber (right) ── */}
            <motion.div
              className="grid gap-4 lg:grid-cols-3"
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
              }}
            >
              <section className="rounded-lg border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)] lg:col-span-2">
                <div className="flex items-center justify-between px-4 py-3">
                  <h2
                    className="text-[14px] text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                  >
                    Pitch Decks
                  </h2>
                  <Button
                    size="sm"
                    className="h-6 rounded-full bg-[var(--brand-primary)] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1565D8]"
                    asChild
                  >
                    <Link to={"/pitch-decks/new" as any}>New deck</Link>
                  </Button>
                </div>
                <div className="border-t border-[var(--border-soft)] px-4 py-3">
                  {pitchDecks.length === 0 ? (
                    <p className="text-[13px] text-[var(--brand-muted)]">
                      No pitch decks yet.{" "}
                      <Link to={"/pitch-decks/new" as any} className="font-semibold text-[var(--brand-primary)] hover:underline">
                        Create your first deck
                      </Link>
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {pitchDecks.map((deck) => (
                        <Link
                          key={deck.id}
                          to={"/pitch-decks/$deckId" as any}
                          params={{ deckId: String(deck.id) } as any}
                          className="flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors hover:bg-[var(--surface)]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[var(--brand-ink)]">
                              {deck.title}
                            </p>
                            <p className="truncate text-[11px] text-[var(--brand-muted)]">
                              {deck.startupName}
                            </p>
                          </div>
                          <div className="ml-3 flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-px text-[10px] font-medium ${statusClassName[deck.status] ?? statusClassName.draft}`}
                            >
                              {deck.status}
                            </span>
                            <span className="text-[11px] tabular-nums text-[var(--brand-muted)]">
                              {new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </Link>
                      ))}
                      <Link
                        to={"/pitch-decks" as any}
                        className="mt-2 inline-block text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                      >
                        View all decks
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-[var(--brand-primary)]"
                    style={{
                      fontFamily: "var(--font-display)",
                      background: "linear-gradient(135deg, rgba(27,118,252,0.12), rgba(54,201,249,0.12))",
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[12px] font-semibold text-[var(--brand-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {user.name || "Founder"}
                    </p>
                    <p className="truncate text-[10px] text-[var(--brand-muted)]">
                      {user.email || "No email set"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--brand-primary)]">
                    {planLabel}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-md bg-[var(--surface)] p-2 text-center">
                  <div>
                    <p className="text-xs font-semibold tabular-nums text-[var(--brand-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                      {numberFormat.format(stats.modelsCount)}
                    </p>
                    <p className="text-[9px] text-[var(--brand-muted)]">Models</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tabular-nums text-[var(--brand-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                      {numberFormat.format(stats.scenariosCount)}
                    </p>
                    <p className="text-[9px] text-[var(--brand-muted)]">Scenarios</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tabular-nums text-[var(--brand-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                      {formatCompact(stats.totalStartingUsers)}
                    </p>
                    <p className="text-[9px] text-[var(--brand-muted)]">Users</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 flex-1 rounded-md bg-[var(--brand-primary)] text-[11px] font-semibold text-white hover:bg-[#1565D8]"
                    onClick={handleStartCheckout}
                  >
                    {user.plan === "pro" ? "Change plan" : "Upgrade"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 rounded-md text-[11px]"
                    onClick={handleOpenPortal}
                  >
                    Billing
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ── Row 3: 1/2 + 1/2 — Distribution / Next steps (left), Model list (right) ── */}
            <motion.div
              className="grid gap-4 lg:grid-cols-2"
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
              }}
            >
              <div className="rounded-lg border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)]">
                <div className="px-3 py-2.5">
                  <h3
                    className="text-[12px] font-semibold text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Next steps
                  </h3>
                </div>
                <div className="space-y-px border-t border-[var(--border-soft)]">
                  <div className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--surface)]">
                    <span className="truncate text-[12px] text-[var(--brand-muted)]">Upload your logo</span>
                    <span className="ml-2 shrink-0 text-[10px] font-semibold text-[var(--brand-primary)]">Add</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--surface)]">
                    <span className="truncate text-[12px] text-[var(--brand-muted)]">Set default currency</span>
                    <span className="ml-2 shrink-0 text-[10px] font-semibold text-[var(--brand-primary)]">Update</span>
                  </div>
                </div>
              </div>

              <div className="lg:min-w-0">
                <ModelList models={models} />
              </div>
            </motion.div>

            {/* ── Recent activity (full width below row 3) ── */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
              }}
            >
              <RecentActivity activities={activities} />
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
