import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/calculations";
import type { CreateModelDto } from "@/lib/dto";
import { Sidebar } from "@/components/Sidebar";

const createModel = createServerFn({
  method: "POST",
})
  .inputValidator((data: CreateModelDto) => {
    // Validate and return the data
    if (!data.name || data.name.trim() === "") {
      throw new Error("Model name is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const [{ getRequestHeaders }, { requireAuthFromHeaders }, { db }, schema] =
      await Promise.all([
        import("@tanstack/react-start/server"),
        import("@/lib/auth/requireAuth"),
        import("@/db/index"),
        import("@/db/schema"),
      ]);

    const { financialModels, modelScenarios, marketSizing, modelSettings } =
      schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    // Create model
    const [model] = await db
      .insert(financialModels)
      .values({
        userId: session.user.id,
        name: data.name,
        companyName: data.companyName || null,
        description: data.description || null,
        currency: data.currency || "USD",
      })
      .returning();

    // Create default scenarios
    const scenarios = [
      {
        type: "conservative" as const,
        params: {
          userGrowth: 0.15,
          arpu: 2.5,
          churnRate: 0.08,
          farmerGrowth: 0.1,
          cac: 12,
        },
      },
      {
        type: "base" as const,
        params: {
          userGrowth: 0.25,
          arpu: 4.0,
          churnRate: 0.05,
          farmerGrowth: 0.2,
          cac: 18,
        },
      },
      {
        type: "optimistic" as const,
        params: {
          userGrowth: 0.4,
          arpu: 6.0,
          churnRate: 0.03,
          farmerGrowth: 0.35,
          cac: 24,
        },
      },
    ];

    for (const scenario of scenarios) {
      await db.insert(modelScenarios).values({
        modelId: model.id,
        scenarioType: scenario.type,
        userGrowth: scenario.params.userGrowth.toString(),
        arpu: scenario.params.arpu.toString(),
        churnRate: scenario.params.churnRate.toString(),
        farmerGrowth: scenario.params.farmerGrowth.toString(),
        cac: scenario.params.cac.toString(),
      });
    }

    // Create default market sizing
    await db.insert(marketSizing).values({
      modelId: model.id,
      tam: 850000000,
      sam: 42000000,
      som: [210000, 840000, 2520000, 6300000, 12600000],
    });

    // Create default model settings
    await db.insert(modelSettings).values({
      modelId: model.id,
      startUsers: DEFAULT_SETTINGS.startUsers,
      startFarmers: DEFAULT_SETTINGS.startFarmers,
      taxRate: DEFAULT_SETTINGS.taxRate.toString(),
      discountRate: DEFAULT_SETTINGS.discountRate.toString(),
      terminalGrowth: DEFAULT_SETTINGS.terminalGrowth.toString(),
      safetyBuffer: DEFAULT_SETTINGS.safetyBuffer,
      personnelByYear: DEFAULT_SETTINGS.personnelByYear,
      employeesByYear: DEFAULT_SETTINGS.employeesByYear,
      capexByYear: DEFAULT_SETTINGS.capexByYear,
      depreciationByYear: DEFAULT_SETTINGS.depreciationByYear,
      projectionYears: DEFAULT_SETTINGS.projectionYears,
    });

    return model;
  });

export const Route = createFileRoute("/models/new")({
  loader: async ({ location }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    return null;
  },
  component: NewModel,
});

function NewModel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createModelFn = useServerFn(createModel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Model name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("Submitting form with data:", { name, companyName, description });
      
      // Call server function using useServerFn hook
      const result = await createModelFn({
        data: {
          name: name.trim(),
          companyName: companyName?.trim() || undefined,
          description: description?.trim() || undefined,
        },
      });
      
      console.log("Model created successfully:", result);
      
      if (result && result.id) {
        // Invalidate router cache to refresh the models list
        router.invalidate();
        
        router.navigate({
          to: "/models/$modelId",
          params: { modelId: result.id.toString() },
        });
      } else {
        console.error("Invalid response:", result);
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Failed to create model - full error:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to create model. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1100px] mx-auto">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.15),transparent_70%)]" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                  New Model
                </p>
                <h1 className="text-3xl font-[var(--font-display)] mb-2">
                  Create New Financial Model
                </h1>
                <p className="text-[var(--brand-muted)]">
                  Start with a clean template and refine assumptions in minutes.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-[var(--border-soft)] shadow-[0_4px_16px_rgba(17,24,39,0.06)] p-6 space-y-6"
              >
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--brand-muted)] mb-2"
                  >
                    Model Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    placeholder="e.g., Q1 2025 Financial Model"
                  />
                </div>

                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-[var(--brand-muted)] mb-2"
                  >
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    placeholder="e.g., AgroGame Inc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-[var(--brand-muted)] mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    placeholder="Optional description of your financial model..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Creating..." : "Create Model"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.navigate({ to: "/models" })}
                    className="px-6 py-3 bg-[#F6F6FC] hover:bg-[#EDEDF7] text-[var(--brand-ink)] font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <aside className="space-y-6">
              <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                  What you get
                </p>
                <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mt-2">
                  Investor-ready output
                </h3>
                <ul className="mt-4 text-sm text-[var(--brand-muted)] space-y-3">
                  <li>• Auto-built base, optimistic, and conservative scenarios</li>
                  <li>• Built-in DCF valuation, exports, and charts</li>
                  <li>• Editable assumptions with version history</li>
                </ul>
              </div>
              <div className="bg-[linear-gradient(135deg,rgba(79,70,186,0.12),rgba(132,232,244,0.18))] rounded-2xl p-6">
                <p className="text-sm font-semibold text-[var(--brand-ink)]">
                  Tip
                </p>
                <p className="text-sm text-[var(--brand-muted)] mt-2">
                  Use a clear naming convention like “2026 Seed Plan” to keep
                  versions organized.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
