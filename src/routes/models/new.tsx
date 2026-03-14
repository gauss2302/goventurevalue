import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_SETTINGS } from "@/lib/calculations";
import type { CreateModelDto, BusinessModelType, StartupStageDto } from "@/lib/dto";

const STAGES: { value: StartupStageDto; label: string }[] = [
  { value: "idea", label: "Pre-seed / Idea" },
  { value: "early_growth", label: "Seed" },
  { value: "scale", label: "Series A+" },
];

const BUSINESS_MODELS: { value: BusinessModelType; label: string }[] = [
  { value: "saas_subscription", label: "SaaS / Subscription" },
  { value: "marketplace", label: "Marketplace" },
  { value: "usage_based", label: "Usage-based" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "other", label: "Other" },
];
import { Sidebar } from "@/components/Sidebar";

const createModel = createServerFn({
  method: "POST",
})
  .inputValidator((data: CreateModelDto) => {
    if (!data.name || data.name.trim() === "") {
      throw new Error("Model name is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const [{ getRequestHeaders }, { requireAuthFromHeaders }, { db }, schema] =
      await Promise.all([
        import("@tanstack/react-start/server"),
        import("@/lib/auth/server"),
        import("@/db/index"),
        import("@/db/schema"),
      ]);

    const {
      financialModels,
      modelScenarios,
      marketSizing,
      modelSettings,
      modelMonthlyMetrics,
    } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const [model] = await db
      .insert(financialModels)
      .values({
        userId: session.user.id,
        name: data.name,
        companyName: data.companyName || null,
        description: data.description || null,
        currency: data.currency || "USD",
        businessModelType: data.businessModelType ?? null,
        stage: data.stage ?? null,
        foundedAt: data.foundedAt ?? null,
        industry: data.industry ?? null,
      })
      .returning();

    const scenarios = [
      {
        type: "conservative" as const,
        params: {
          userGrowth: 0.15,
          arpu: 29,
          churnRate: 0.07,
          cac: 120,
          expansionRate: 0.05,
          grossMarginTarget: 0.65,
        },
      },
      {
        type: "base" as const,
        params: {
          userGrowth: 0.25,
          arpu: 49,
          churnRate: 0.05,
          cac: 150,
          expansionRate: 0.10,
          grossMarginTarget: 0.70,
        },
      },
      {
        type: "optimistic" as const,
        params: {
          userGrowth: 0.40,
          arpu: 79,
          churnRate: 0.03,
          cac: 200,
          expansionRate: 0.15,
          grossMarginTarget: 0.80,
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
        farmerGrowth: "0",
        cac: scenario.params.cac.toString(),
      });
    }

    await db.insert(marketSizing).values({
      modelId: model.id,
      tam: 0,
      sam: 0,
      som: [0, 0, 0, 0, 0],
    });

    await db.insert(modelSettings).values({
      modelId: model.id,
      startUsers: DEFAULT_SETTINGS.startUsers,
      startFarmers: DEFAULT_SETTINGS.startFarmers ?? 0,
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

    if (data.quickSnapshot?.mrr != null || data.quickSnapshot?.customers != null || data.quickSnapshot?.monthlyBurn != null || data.quickSnapshot?.cashBalance != null) {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStr = firstOfMonth.toISOString().slice(0, 10);
      await db.insert(modelMonthlyMetrics).values([
        {
          modelId: model.id,
          month: monthStr,
          mrr: data.quickSnapshot.mrr != null ? String(data.quickSnapshot.mrr) : null,
          customers: data.quickSnapshot.customers ?? null,
          opex: data.quickSnapshot.monthlyBurn != null ? String(data.quickSnapshot.monthlyBurn) : null,
          cashBalance: data.quickSnapshot.cashBalance != null ? String(data.quickSnapshot.cashBalance) : null,
        },
      ]);
    }

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

type WizardStep = 1 | 2 | 3;

function NewModel() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<StartupStageDto>("early_growth");
  const [businessModelType, setBusinessModelType] = useState<BusinessModelType>("saas_subscription");
  const [currency, setCurrency] = useState("USD");
  const [industry, setIndustry] = useState("");
  const [quickMrr, setQuickMrr] = useState<string>("");
  const [quickCustomers, setQuickCustomers] = useState<string>("");
  const [quickBurn, setQuickBurn] = useState<string>("");
  const [quickCash, setQuickCash] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createModelFn = useServerFn(createModel);
  const queryClient = useQueryClient();

  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError("Model name is required");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleBackStep2 = () => setStep(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Model name is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const quickSnapshot =
        quickMrr !== "" || quickCustomers !== "" || quickBurn !== "" || quickCash !== ""
          ? {
              mrr: quickMrr !== "" ? parseFloat(quickMrr) : undefined,
              customers: quickCustomers !== "" ? parseInt(quickCustomers, 10) : undefined,
              monthlyBurn: quickBurn !== "" ? parseFloat(quickBurn) : undefined,
              cashBalance: quickCash !== "" ? parseFloat(quickCash) : undefined,
            }
          : undefined;

      const result = await createModelFn({
        data: {
          name: name.trim(),
          companyName: companyName?.trim() || undefined,
          description: description?.trim() || undefined,
          currency: currency || "USD",
          businessModelType,
          stage,
          industry: industry?.trim() || undefined,
          quickSnapshot,
        },
      });

      if (result?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["models"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        ]);
        router.navigate({
          to: "/models/$modelId",
          params: { modelId: result.id.toString() },
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create model. Please try again.";
      setError(message);
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
                  Create Investor Snapshot
                </h1>
                <p className="text-[var(--brand-muted)]">
                  Set up your financial model in under 10 minutes. Add traction data now or later.
                </p>
              </div>

              <div className="flex gap-2 mb-6">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => s < step && setStep(s as WizardStep)}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      step >= s ? "bg-[var(--brand-primary)]" : "bg-[var(--surface-muted)]"
                    } ${s < step ? "cursor-pointer" : ""}`}
                    aria-label={`Step ${s}`}
                  />
                ))}
              </div>

              <form
                onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep1(); }}
                className="bg-white rounded-2xl border border-[var(--border-soft)] shadow-[0_4px_16px_rgba(17,24,39,0.06)] p-6 space-y-6"
              >
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                        Model Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                        placeholder="e.g., 2026 Seed Plan"
                      />
                    </div>
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                        placeholder="e.g., Acme Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Stage</label>
                      <div className="flex flex-wrap gap-2">
                        {STAGES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setStage(s.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              stage === s.value ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--brand-muted)] hover:bg-[var(--surface-muted-border)]"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Business Model</label>
                      <div className="flex flex-wrap gap-2">
                        {BUSINESS_MODELS.map((b) => (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => setBusinessModelType(b.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              businessModelType === b.value ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--brand-muted)] hover:bg-[var(--surface-muted-border)]"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Currency</label>
                        <select
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="industry" className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Industry (optional)</label>
                        <input
                          type="text"
                          id="industry"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                          placeholder="e.g., B2B SaaS"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Description (optional)</label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                        placeholder="Brief description of this model..."
                      />
                    </div>
                    <div className="flex gap-4">
                      <button type="submit" className="flex-1 px-6 py-3 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-xl transition-colors">
                        Next: Quick Snapshot (optional)
                      </button>
                      <button type="button" onClick={() => router.navigate({ to: "/models" })} className="px-6 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-muted-border)] text-[var(--brand-ink)] font-semibold rounded-xl transition-colors">
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="text-sm text-[var(--brand-muted)]">
                      Add current numbers to pre-fill your first traction month. You can skip and add data in the model editor.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">MRR ($)</label>
                        <input type="number" min={0} step={100} value={quickMrr} onChange={(e) => setQuickMrr(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" placeholder="e.g. 12000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Customers</label>
                        <input type="number" min={0} value={quickCustomers} onChange={(e) => setQuickCustomers(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" placeholder="e.g. 50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Monthly burn ($)</label>
                        <input type="number" min={0} step={1000} value={quickBurn} onChange={(e) => setQuickBurn(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" placeholder="e.g. 50000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Cash balance ($)</label>
                        <input type="number" min={0} step={1000} value={quickCash} onChange={(e) => setQuickCash(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" placeholder="e.g. 200000" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={handleBackStep2} className="px-6 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-muted-border)] text-[var(--brand-ink)] font-semibold rounded-xl transition-colors">
                        Back
                      </button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? "Creating..." : "Create Model"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>

            <aside className="space-y-6">
              <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                  What you get
                </p>
                <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mt-2">
                  Investor-ready snapshot
                </h3>
                <ul className="mt-4 text-sm text-[var(--brand-muted)] space-y-3">
                  <li>• KPI dashboard (ARR, NRR, burn multiple, runway)</li>
                  <li>• Monthly traction table and cohort retention</li>
                  <li>• DCF and revenue multiples valuation</li>
                  <li>• Export to Excel and PDF</li>
                </ul>
              </div>
              <div className="bg-[linear-gradient(135deg,rgba(79,70,186,0.12),rgba(132,232,244,0.18))] rounded-2xl p-6">
                <p className="text-sm font-semibold text-[var(--brand-ink)]">
                  Tip
                </p>
                <p className="text-sm text-[var(--brand-muted)] mt-2">
                  Use a clear name like “2026 Seed Plan” and pick your stage so we can tailor
                  metrics and multiples.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
