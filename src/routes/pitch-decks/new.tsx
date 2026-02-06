import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import type { CreatePitchDeckDto, PitchDeckBriefDto } from "@/lib/dto";
import type { ModelContextSummary } from "@/lib/pitchDeck/types";

const BRIEF_KEYS: Array<keyof PitchDeckBriefDto> = [
  "problem",
  "solution",
  "product",
  "market",
  "businessModel",
  "traction",
  "goToMarket",
  "competition",
  "financialHighlights",
  "fundingAsk",
];

const validateCreatePayload = (data: CreatePitchDeckDto): CreatePitchDeckDto => {
  if (!data.title?.trim()) {
    throw new Error("Title is required");
  }
  if (!data.startupName?.trim()) {
    throw new Error("Startup name is required");
  }
  if (data.provider !== "openai" && data.provider !== "gemini") {
    throw new Error("Unsupported AI provider");
  }

  BRIEF_KEYS.forEach((key) => {
    if (!data.brief[key] || !data.brief[key].trim()) {
      throw new Error(`Brief field is required: ${key}`);
    }
    if (data.brief[key].length > 2000) {
      throw new Error(`Brief field is too long: ${key}`);
    }
  });

  return data;
};

const loadCreateDeckData = createServerFn({ method: "GET" }).handler(async () => {
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

  return models.map((model) => ({
    id: model.id,
    name: model.name,
    companyName: model.companyName,
    currency: model.currency,
  }));
});

const createPitchDeck = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePitchDeckDto) => validateCreatePayload(data))
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, modelScenarios, modelSettings, pitchDecks } = schema;
    const { generatePitchDeck, resolveProviderModel } = await import("@/lib/pitchDeck/generate");

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    let modelContext: ModelContextSummary | null = null;
    let resolvedCurrency = data.currency?.trim() || "USD";

    if (data.modelId) {
      const model = await db.query.financialModels.findFirst({
        where: and(
          eq(financialModels.id, data.modelId),
          eq(financialModels.userId, session.user.id),
        ),
      });

      if (!model) {
        throw new Error("Model not found");
      }

      const [baseScenario, settings] = await Promise.all([
        db.query.modelScenarios.findFirst({
          where: and(
            eq(modelScenarios.modelId, model.id),
            eq(modelScenarios.scenarioType, "base"),
          ),
        }),
        db.query.modelSettings.findFirst({
          where: eq(modelSettings.modelId, model.id),
        }),
      ]);

      resolvedCurrency = model.currency;

      modelContext = {
        modelName: model.name,
        currency: model.currency,
        companyName: model.companyName,
        description: model.description,
        baseScenario: baseScenario
          ? {
              userGrowth: Number(baseScenario.userGrowth),
              arpu: Number(baseScenario.arpu),
              churnRate: Number(baseScenario.churnRate),
              farmerGrowth: Number(baseScenario.farmerGrowth),
              cac: Number(baseScenario.cac),
            }
          : undefined,
        keySettings: settings
          ? {
              startUsers: settings.startUsers,
              startFarmers: settings.startFarmers,
              taxRate: Number(settings.taxRate),
              discountRate: Number(settings.discountRate),
              terminalGrowth: Number(settings.terminalGrowth),
            }
          : undefined,
      };
    }

    const providerModel = resolveProviderModel(data.provider, data.providerModel);

    const [deck] = await db
      .insert(pitchDecks)
      .values({
        userId: session.user.id,
        modelId: data.modelId ?? null,
        title: data.title.trim(),
        startupName: data.startupName.trim(),
        oneLiner: data.oneLiner?.trim() || null,
        audience: data.audience?.trim() || "investors",
        language: data.language?.trim() || "en",
        currency: resolvedCurrency,
        provider: data.provider,
        providerModel,
        status: "generating",
        brief: data.brief,
        slides: [],
        generationMeta: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .returning({ id: pitchDecks.id });

    try {
      const generated = await generatePitchDeck({
        provider: data.provider,
        providerModel,
        input: {
          title: data.title.trim(),
          startupName: data.startupName.trim(),
          oneLiner: data.oneLiner?.trim(),
          audience: data.audience?.trim() || "investors",
          language: data.language?.trim() || "en",
          currency: resolvedCurrency,
          brief: data.brief,
          modelContext,
        },
      });

      await db
        .update(pitchDecks)
        .set({
          status: "ready",
          slides: generated.slides,
          generationMeta: generated.generationMeta,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(pitchDecks.id, deck.id));

      return {
        id: deck.id,
        status: "ready" as const,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error";

      await db
        .update(pitchDecks)
        .set({
          status: "failed",
          lastError: message.slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(eq(pitchDecks.id, deck.id));

      throw new Error(`Deck generation failed: ${message}`);
    }
  });

export const Route = createFileRoute("/pitch-decks/new")({
  loader: async ({ location }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    const models = await loadCreateDeckData();
    return { models };
  },
  component: NewPitchDeckPage,
});

function NewPitchDeckPage() {
  const { models } = Route.useLoaderData();
  const router = useRouter();
  const createPitchDeckFn = useServerFn(createPitchDeck);

  const [title, setTitle] = useState("");
  const [startupName, setStartupName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [providerModel, setProviderModel] = useState("");
  const [modelId, setModelId] = useState<string>("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [audience, setAudience] = useState("investors");

  const [brief, setBrief] = useState<PitchDeckBriefDto>({
    problem: "",
    solution: "",
    product: "",
    market: "",
    businessModel: "",
    traction: "",
    goToMarket: "",
    competition: "",
    financialHighlights: "",
    fundingAsk: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === Number(modelId)),
    [modelId, models],
  );

  const updateBriefField = (key: keyof PitchDeckBriefDto, value: string) => {
    setBrief((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await createPitchDeckFn({
        data: {
          title,
          startupName,
          oneLiner,
          audience,
          language,
          currency: selectedModel?.currency || currency,
          provider,
          providerModel,
          modelId: modelId ? Number(modelId) : undefined,
          brief,
        },
      });

      await router.invalidate();
      router.navigate({
        to: "/pitch-decks/$deckId" as any,
        params: { deckId: String(result.id) } as any,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to generate pitch deck";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1200px] mx-auto">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.12),transparent_70%)]" />

          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">Pitch Decks</p>
            <h1 className="text-3xl font-[var(--font-display)] text-[var(--brand-ink)] mt-2">
              Generate New Pitch Deck
            </h1>
            <p className="text-sm text-[var(--brand-muted)] mt-2 max-w-2xl">
              Create a structured investor deck with AI. You can optionally attach one of your financial models to enrich the financial narrative.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-[var(--border-soft)] p-6 shadow-[var(--card-shadow)] space-y-4">
                <h2 className="text-lg font-[var(--font-display)]">Deck Setup</h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-[var(--brand-muted)]">
                    Title
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder="Seed Round Pitch Deck"
                      required
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Startup Name
                    <input
                      type="text"
                      value={startupName}
                      onChange={(event) => setStartupName(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder="Acme AI"
                      required
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)] md:col-span-2">
                    One-liner
                    <input
                      type="text"
                      value={oneLiner}
                      onChange={(event) => setOneLiner(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder="AI co-pilot for field sales teams"
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Provider
                    <select
                      value={provider}
                      onChange={(event) => setProvider(event.target.value as "openai" | "gemini")}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Provider Model (optional override)
                    <input
                      type="text"
                      value={providerModel}
                      onChange={(event) => setProviderModel(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder={provider === "openai" ? "gpt-4.1-mini" : "gemini-1.5-flash"}
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Link Financial Model (optional)
                    <select
                      value={modelId}
                      onChange={(event) => setModelId(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                    >
                      <option value="">No model linked</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}{model.companyName ? ` (${model.companyName})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Audience
                    <input
                      type="text"
                      value={audience}
                      onChange={(event) => setAudience(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder="investors"
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Language
                    <input
                      type="text"
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      placeholder="en"
                    />
                  </label>

                  <label className="text-sm text-[var(--brand-muted)]">
                    Currency
                    <select
                      value={selectedModel?.currency || currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      disabled={!!selectedModel}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-[var(--border-soft)] p-6 shadow-[var(--card-shadow)] space-y-4">
                <h2 className="text-lg font-[var(--font-display)]">Structured Brief</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {BRIEF_KEYS.map((key) => (
                    <label key={key} className="text-sm text-[var(--brand-muted)] md:col-span-1">
                      {key}
                      <textarea
                        value={brief[key]}
                        onChange={(event) => updateBriefField(key, event.target.value)}
                        rows={4}
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                        required
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="bg-white rounded-2xl border border-[var(--border-soft)] p-5 shadow-[var(--card-shadow)]">
                <h3 className="font-semibold text-[var(--brand-ink)]">Output</h3>
                <ul className="mt-3 text-sm text-[var(--brand-muted)] space-y-2">
                  <li>10-slide investor deck</li>
                  <li>Editable slide titles, bullets, and notes</li>
                  <li>PDF export with presentation layout</li>
                  <li>Per-user privacy and ownership checks</li>
                </ul>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Generating..." : "Generate Pitch Deck"}
              </button>

              <button
                type="button"
                onClick={() => router.navigate({ to: "/pitch-decks" as any })}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-soft)] text-[var(--brand-muted)]"
              >
                Cancel
              </button>
            </aside>
          </form>
        </div>
      </main>
    </div>
  );
}
