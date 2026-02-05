import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import ModelList from "../../components/ModelList";
import { Sidebar } from "../../components/Sidebar";
import type { Model } from "../../components/ModelList";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

type LoaderData = {
  models: Model[];
};

const loadModels = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    { financialModels },
    { eq, desc },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/requireAuth"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const models = await db.query.financialModels.findMany({
    where: eq(financialModels.userId, session.user.id),
    orderBy: [desc(financialModels.updatedAt)],
  });

  return models.map((m) => ({
    id: m.id,
    name: m.name,
    companyName: m.companyName,
    description: m.description,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
});

export const Route = createFileRoute("/models/")({
  loader: async ({ location }): Promise<LoaderData> => {
    await requireAuthForLoader(location);
    const models = await loadModels();

    return {
      models,
    };
  },
  component: ModelsIndex,
});

function ModelsIndex() {
  const { models } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-8 lg:px-10 max-w-[1100px] mx-auto">
          <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.14),transparent_70%)]" />
          <div className="pointer-events-none absolute top-32 -left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(132,232,244,0.18),transparent_70%)]" />

          <div className="relative space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                Library
              </p>
              <h1 className="text-3xl lg:text-4xl font-[var(--font-display)] text-[var(--brand-ink)]">
                My Models
              </h1>
              <p className="text-[var(--brand-muted)]">
                Keep every valuation, scenario, and revision in one place.
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search models, companies, or tags..."
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-soft)] bg-white text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)]">
                  Last updated
                </button>
                <button className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)]">
                  All statuses
                </button>
              </div>
            </div>
            <ModelList models={models} />
          </div>
        </div>
      </main>
    </div>
  );
}
