import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { StyleQuestionnaireModal } from "@/components/pitch-deck";
import type {
  CreatePitchDeckDto,
  PitchDeckBriefDto,
  PitchDeckTemplateId,
  PitchDeckStyleQuestionnaireInput,
} from "@/lib/dto";
import { getAllTemplates } from "@/lib/pitchDeck/templates";
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

const BRIEF_MAX_LENGTH = 2000;

const BRIEF_FIELD_CONFIG: Record<
  keyof PitchDeckBriefDto,
  { label: string; description: string; placeholder: string }
> = {
  problem: {
    label: "Problem",
    description: "What pain point does your startup address? Who experiences it?",
    placeholder: "Describe the problem you're solving and for whom. Be specific about the scale and urgency.",
  },
  solution: {
    label: "Solution",
    description: "How does your product or service solve this problem?",
    placeholder: "Explain your approach and why it's better than existing alternatives.",
  },
  product: {
    label: "Product",
    description: "What are you building? Key features and differentiators.",
    placeholder: "Outline your product, main features, and what makes it unique.",
  },
  market: {
    label: "Market",
    description: "Target market size, segments, and opportunity.",
    placeholder: "TAM/SAM/SOM, target segments, and why now.",
  },
  businessModel: {
    label: "Business Model",
    description: "How you make money — pricing, unit economics.",
    placeholder: "Revenue streams, pricing model, and key unit economics.",
  },
  traction: {
    label: "Traction",
    description: "Proof of progress — metrics, milestones, validation.",
    placeholder: "Key metrics, customer wins, partnerships, or milestones to date.",
  },
  goToMarket: {
    label: "Go-to-Market",
    description: "How you acquire and retain customers.",
    placeholder: "Channels, sales motion, and growth strategy.",
  },
  competition: {
    label: "Competition",
    description: "Competitive landscape and your positioning.",
    placeholder: "Main competitors and how you differentiate.",
  },
  financialHighlights: {
    label: "Financial Highlights",
    description: "Revenue, margins, and key financial projections.",
    placeholder: "Past performance and forward-looking key numbers.",
  },
  fundingAsk: {
    label: "Funding Ask",
    description: "Amount, use of funds, and round context.",
    placeholder: "Amount you're raising, use of funds, and round (e.g. Seed, Series A).",
  },
};

const BRIEF_GROUPS: { title: string; keys: Array<keyof PitchDeckBriefDto> }[] = [
  { title: "Story", keys: ["problem", "solution", "product"] },
  { title: "Market & Strategy", keys: ["market", "businessModel", "goToMarket", "competition"] },
  { title: "Proof & Ask", keys: ["traction", "financialHighlights", "fundingAsk"] },
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

    const templateId = data.template ?? "minimal";

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
        template: templateId,
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

type CreatePitchDeckFullAiDto = Omit<CreatePitchDeckDto, "provider" | "providerModel" | "template"> & {
  styleQuestionnaire: PitchDeckStyleQuestionnaireInput;
};

const validateCreateFullAiPayload = (data: CreatePitchDeckFullAiDto): CreatePitchDeckFullAiDto => {
  if (!data.title?.trim()) throw new Error("Title is required");
  if (!data.startupName?.trim()) throw new Error("Startup name is required");
  BRIEF_KEYS.forEach((key) => {
    if (!data.brief[key]?.trim()) throw new Error(`Brief field is required: ${key}`);
    if (data.brief[key].length > 2000) throw new Error(`Brief field is too long: ${key}`);
  });
  if (!data.styleQuestionnaire || typeof data.styleQuestionnaire !== "object") {
    throw new Error("Style questionnaire is required");
  }
  return data;
};

const createPitchDeckFullAi = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePitchDeckFullAiDto) => validateCreateFullAiPayload(data))
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
    const { generatePitchDeckFullAi, resolveProviderModel } = await import("@/lib/pitchDeck/generate");

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

    const providerModel = resolveProviderModel("gemini", undefined);

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
        provider: "gemini",
        providerModel,
        status: "generating",
        brief: data.brief,
        slides: [],
        template: "minimal",
        designMode: "ai_designed",
        aiStyleInput: data.styleQuestionnaire,
        aiStyleInstructions: null,
        generationMeta: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .returning({ id: pitchDecks.id });

    try {
      const generated = await generatePitchDeckFullAi({
        title: data.title.trim(),
        startupName: data.startupName.trim(),
        oneLiner: data.oneLiner?.trim(),
        audience: data.audience?.trim() || "investors",
        language: data.language?.trim() || "en",
        currency: resolvedCurrency,
        brief: data.brief,
        modelContext,
        styleQuestionnaire: data.styleQuestionnaire,
      });

      await db
        .update(pitchDecks)
        .set({
          status: "ready",
          slides: generated.slides,
          aiStyleInstructions: generated.styleInstructions,
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

      throw new Error(`Full AI deck generation failed: ${message}`);
    }
  });

const createDeckDataQueryOptions = () => ({
  queryKey: ["pitch-decks-create-data"] as const,
  queryFn: () =>
    loadCreateDeckData() as Promise<
      Array<{
        id: number;
        name: string;
        companyName: string | null;
        currency: string;
      }>
    >,
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/pitch-decks/new")({
  loader: async ({ location, context }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    await context.queryClient.prefetchQuery(createDeckDataQueryOptions());
    return null;
  },
  component: NewPitchDeckPage,
});

function NewPitchDeckPage() {
  const { data: models, isPending, error: loadError } = useQuery(
    createDeckDataQueryOptions(),
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPitchDeckFn = useServerFn(createPitchDeck);
  const createPitchDeckFullAiFn = useServerFn(createPitchDeckFullAi);

  const [title, setTitle] = useState("");
  const [startupName, setStartupName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [providerModel, setProviderModel] = useState("");
  const [modelId, setModelId] = useState<string>("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [audience, setAudience] = useState("investors");
  const [templateId, setTemplateId] = useState<PitchDeckTemplateId>("minimal");

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
  const [fullAiModalOpen, setFullAiModalOpen] = useState(false);
  const [fullAiSubmitting, setFullAiSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => models?.find((model) => model.id === Number(modelId)),
    [modelId, models],
  );

  const updateBriefField = (key: keyof PitchDeckBriefDto, value: string) => {
    setBrief((prev) => ({ ...prev, [key]: value }));
  };

  const handleFullAiSubmit = async (styleQuestionnaire: PitchDeckStyleQuestionnaireInput) => {
    setFullAiSubmitting(true);
    setError(null);
    try {
      const result = await createPitchDeckFullAiFn({
        data: {
          title,
          startupName,
          oneLiner,
          audience,
          language,
          currency: selectedModel?.currency || currency,
          modelId: modelId ? Number(modelId) : undefined,
          brief,
          styleQuestionnaire,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pitch-decks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      router.navigate({
        to: "/pitch-decks/$deckId" as any,
        params: { deckId: String(result.id) } as any,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Full AI deck generation failed");
    } finally {
      setFullAiSubmitting(false);
    }
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
          template: templateId,
          brief,
        },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pitch-decks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
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

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-[var(--brand-muted)]">
          Loading pitch deck setup...
        </div>
      </div>
    );
  }

  if (loadError || !models) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-red-600">
          Failed to load models for pitch deck. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <StyleQuestionnaireModal
        open={fullAiModalOpen}
        onOpenChange={setFullAiModalOpen}
        onSubmit={handleFullAiSubmit}
        isPending={fullAiSubmitting}
        title="Full AI slides — style"
        submitLabel="Generate with Full AI"
      />
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

                  <div className="md:col-span-2">
                    <p className="text-sm text-[var(--brand-muted)] mb-2">Template</p>
                    <div className="flex flex-wrap gap-3">
                      {getAllTemplates().map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTemplateId(t.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-left transition-colors ${
                            templateId === t.id
                              ? "border-[var(--brand-primary)] bg-[rgba(79,70,186,0.08)]"
                              : "border-[var(--border-soft)] bg-white hover:border-[var(--brand-primary)]/40"
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-lg shrink-0 border border-[var(--border-soft)]"
                            style={{ backgroundColor: t.colors.background }}
                          />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: t.colors.accent }}
                          />
                          <span className="text-sm font-medium text-[var(--brand-ink)]">
                            {t.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                      placeholder={provider === "openai" ? "gpt-4.1-mini" : "gemini-2.0-flash"}
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

              <section className="bg-white rounded-2xl border border-[var(--border-soft)] shadow-[var(--card-shadow)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--border-soft)] bg-[var(--page)]">
                  <h2 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                    Structured Brief
                  </h2>
                  <p className="mt-1 text-sm text-[var(--brand-muted)] max-w-2xl">
                    Fill in each section to guide AI generation. More detail yields a stronger deck.
                  </p>
                </div>
                <div className="p-6 space-y-10">
                  {BRIEF_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-5">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)] border-b border-[var(--surface-muted-border)] pb-2">
                        {group.title}
                      </h3>
                      <div className="space-y-5">
                        {group.keys.map((key) => {
                          const config = BRIEF_FIELD_CONFIG[key];
                          const length = brief[key].length;
                          const nearLimit = length > BRIEF_MAX_LENGTH * 0.9;
                          return (
                            <div key={key} className="space-y-2">
                              <label
                                htmlFor={`brief-${key}`}
                                className="block text-sm font-medium text-[var(--brand-ink)]"
                              >
                                {config.label}
                              </label>
                              <p className="text-xs text-[var(--brand-muted)]">
                                {config.description}
                              </p>
                              <textarea
                                id={`brief-${key}`}
                                value={brief[key]}
                                onChange={(event) => updateBriefField(key, event.target.value)}
                                placeholder={config.placeholder}
                                rows={6}
                                maxLength={BRIEF_MAX_LENGTH}
                                className="mt-1 w-full min-h-[140px] px-4 py-3 rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] resize-y"
                                required
                              />
                              <div
                                className={`text-xs ${nearLimit ? "text-amber-600" : "text-[var(--brand-muted)]"}`}
                              >
                                {length} / {BRIEF_MAX_LENGTH}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                disabled={submitting || fullAiSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-60"
              >
                {submitting ? "Generating..." : "Generate Pitch Deck"}
              </button>

              <button
                type="button"
                onClick={() => setFullAiModalOpen(true)}
                disabled={submitting || fullAiSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] disabled:opacity-60"
              >
                {fullAiSubmitting ? "Full AI…" : "Full AI slides"}
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
