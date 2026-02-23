import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExportPaywallModal } from "@/components/billing/ExportPaywallModal";
import { Sidebar } from "@/components/Sidebar";
import {
  EditableSlideView,
  SlideCarousel,
  AutosaveIndicator,
  RetryModal,
  StyleQuestionnaireModal,
} from "@/components/pitch-deck";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import type {
  PitchDeckSlideDto,
  PitchDeckBriefDto,
  PresentationStatus,
  PitchDeckDesignMode,
  PitchDeckStyleQuestionnaireInput,
  PitchDeckAiStyleInstructions,
} from "@/lib/dto";
import {
  improvePitchDeckTextWithGemini,
  type ImproveTextFieldType,
} from "@/lib/pitchDeck/improveText";
import { exportPitchDeckToPdf } from "@/lib/pitchDeck/pdf";
import { getTemplateById, getAllTemplates } from "@/lib/pitchDeck/templates";
import { aiStyleToTemplate } from "@/lib/pitchDeck/aiStyleAdapter";
import type { ModelContextSummary } from "@/lib/pitchDeck/types";
import { assertExportAccess } from "@/lib/billing/serverFns";

const toSlides = (value: unknown): PitchDeckSlideDto[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((slide, index) => {
      const candidate = slide as Partial<PitchDeckSlideDto>;
      if (!candidate || typeof candidate !== "object") return null;
      const keyMetrics = Array.isArray(candidate.keyMetrics)
        ? candidate.keyMetrics.filter((item) => typeof item === "string").slice(0, 4)
        : undefined;
      const emphasisBulletIndex =
        typeof candidate.emphasisBulletIndex === "number" &&
        Number.isInteger(candidate.emphasisBulletIndex) &&
        candidate.emphasisBulletIndex >= 0
          ? candidate.emphasisBulletIndex
          : undefined;
      const imageUrl =
        typeof candidate.imageUrl === "string" && candidate.imageUrl.trim()
          ? candidate.imageUrl.trim()
          : undefined;
      const layout =
        candidate.layout === "image-left" ||
        candidate.layout === "image-right" ||
        candidate.layout === "image-top" ||
        candidate.layout === "image-full"
          ? candidate.layout
          : "default";
      const imageScale =
        typeof candidate.imageScale === "number" &&
        candidate.imageScale >= 0.25 &&
        candidate.imageScale <= 3
          ? candidate.imageScale
          : undefined;
      const imagePanX =
        typeof candidate.imagePanX === "number" &&
        candidate.imagePanX >= 0 &&
        candidate.imagePanX <= 1
          ? candidate.imagePanX
          : undefined;
      const imagePanY =
        typeof candidate.imagePanY === "number" &&
        candidate.imagePanY >= 0 &&
        candidate.imagePanY <= 1
          ? candidate.imagePanY
          : undefined;
      return {
        id: typeof candidate.id === "string" ? candidate.id : `slide-${index + 1}`,
        type: (candidate.type as PitchDeckSlideDto["type"]) || "cover",
        heading: typeof candidate.heading === "string" ? candidate.heading : "",
        subheading: typeof candidate.subheading === "string" ? candidate.subheading : "",
        bullets: Array.isArray(candidate.bullets)
          ? candidate.bullets
              .filter((item) => typeof item === "string")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        speakerNotes: typeof candidate.speakerNotes === "string" ? candidate.speakerNotes : "",
        ...(keyMetrics?.length ? { keyMetrics } : {}),
        ...(emphasisBulletIndex !== undefined ? { emphasisBulletIndex } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        layout,
        ...(imageScale !== undefined ? { imageScale } : {}),
        ...(imagePanX !== undefined ? { imagePanX } : {}),
        ...(imagePanY !== undefined ? { imagePanY } : {}),
      } as PitchDeckSlideDto;
    })
    .filter((slide): slide is PitchDeckSlideDto => !!slide);
};

const validateSlides = (slides: PitchDeckSlideDto[]) => {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error("Slides payload is empty");
  }

  slides.forEach((slide, index) => {
    if (!slide.heading?.trim()) {
      throw new Error(`Slide ${index + 1} is missing heading`);
    }
    if (!Array.isArray(slide.bullets)) {
      throw new Error(`Slide ${index + 1} has invalid bullets`);
    }
  });

  return slides;
};

const loadPitchDeckDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { deckId: number }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      { pitchDecks },
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    const template =
      (deck.template as "minimal" | "professional-blue" | "bold-dark" | "warm-earthy" | "tech-modern") ??
      "minimal";
    const designMode = (deck.designMode as PitchDeckDesignMode) ?? "manual_template";
    const aiStyleInput = deck.aiStyleInput as PitchDeckStyleQuestionnaireInput | null;
    const aiStyleInstructions = deck.aiStyleInstructions as PitchDeckAiStyleInstructions | null;

    return {
      id: deck.id,
      title: deck.title,
      startupName: deck.startupName,
      oneLiner: deck.oneLiner,
      audience: deck.audience,
      language: deck.language,
      currency: deck.currency,
      provider: deck.provider,
      providerModel: deck.providerModel,
      status: deck.status,
      brief: deck.brief as PitchDeckBriefDto,
      slides: toSlides(deck.slides),
      template,
      designMode,
      aiStyleInput,
      aiStyleInstructions,
      modelId: deck.modelId,
      lastError: deck.lastError,
      updatedAt: deck.updatedAt,
    };
  });

const savePitchDeckSlides = createServerFn({ method: "POST" })
  .inputValidator((data: { deckId: number; slides: PitchDeckSlideDto[] }) => ({
    deckId: data.deckId,
    slides: validateSlides(data.slides),
  }))
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      { pitchDecks },
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    await db
      .update(pitchDecks)
      .set({
        slides: data.slides,
        status: "ready",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(pitchDecks.id, deck.id));

    return { success: true };
  });

const savePitchDeckTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      deckId: number;
      templateId: "minimal" | "professional-blue" | "bold-dark" | "warm-earthy" | "tech-modern";
    }) => data
  )
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      { pitchDecks },
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    await db
      .update(pitchDecks)
      .set({ template: data.templateId, updatedAt: new Date() })
      .where(eq(pitchDecks.id, deck.id));

    return { success: true };
  });

const improvePitchDeckText = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      deckId: number;
      fieldType: ImproveTextFieldType;
      currentValue: string;
      slideType: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      { pitchDecks },
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    const improvedText = await improvePitchDeckTextWithGemini({
      fieldType: data.fieldType,
      currentValue: data.currentValue,
      context: {
        slideType: data.slideType,
        startupName: deck.startupName,
        language: deck.language ?? "en",
      },
    });

    return { improvedText };
  });

const regeneratePitchDeck = createServerFn({ method: "POST" })
  .inputValidator((data: { deckId: number }) => data)
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

    const { pitchDecks, financialModels, modelScenarios, modelSettings } = schema;
    const { generatePitchDeck } = await import("@/lib/pitchDeck/generate");

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    let modelContext: ModelContextSummary | null = null;

    if (deck.modelId) {
      const model = await db.query.financialModels.findFirst({
        where: and(eq(financialModels.id, deck.modelId), eq(financialModels.userId, session.user.id)),
      });

      if (model) {
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
    }

    await db
      .update(pitchDecks)
      .set({ status: "generating", lastError: null, updatedAt: new Date() })
      .where(eq(pitchDecks.id, deck.id));

    try {
      const generated = await generatePitchDeck({
        provider: deck.provider,
        providerModel: deck.providerModel,
        input: {
          title: deck.title,
          startupName: deck.startupName,
          oneLiner: deck.oneLiner || undefined,
          audience: deck.audience,
          language: deck.language,
          currency: deck.currency,
          brief: deck.brief as PitchDeckBriefDto,
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
        success: true,
        slides: generated.slides,
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

      throw new Error(`Deck regeneration failed: ${message}`);
    }
  });

const regeneratePitchDeckFullAi = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { deckId: number; styleQuestionnaire: PitchDeckStyleQuestionnaireInput }) => ({
      deckId: data.deckId,
      styleQuestionnaire: data.styleQuestionnaire ?? {},
    }),
  )
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

    const { pitchDecks, financialModels, modelScenarios, modelSettings } = schema;
    const { generatePitchDeckFullAi, resolveProviderModel } = await import("@/lib/pitchDeck/generate");

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const deck = await db.query.pitchDecks.findFirst({
      where: and(eq(pitchDecks.id, data.deckId), eq(pitchDecks.userId, session.user.id)),
    });

    if (!deck) {
      throw new Error("Pitch deck not found");
    }

    let modelContext: ModelContextSummary | null = null;

    if (deck.modelId) {
      const model = await db.query.financialModels.findFirst({
        where: and(
          eq(financialModels.id, deck.modelId),
          eq(financialModels.userId, session.user.id),
        ),
      });

      if (model) {
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
    }

    const providerModel = resolveProviderModel("gemini", undefined);

    await db
      .update(pitchDecks)
      .set({
        status: "generating",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(pitchDecks.id, deck.id));

    try {
      const generated = await generatePitchDeckFullAi({
        title: deck.title,
        startupName: deck.startupName,
        oneLiner: deck.oneLiner || undefined,
        audience: deck.audience,
        language: deck.language,
        currency: deck.currency,
        brief: deck.brief as PitchDeckBriefDto,
        modelContext,
        styleQuestionnaire: data.styleQuestionnaire,
      });

      await db
        .update(pitchDecks)
        .set({
          status: "ready",
          provider: "gemini",
          providerModel,
          designMode: "ai_designed",
          aiStyleInput: data.styleQuestionnaire,
          aiStyleInstructions: generated.styleInstructions,
          slides: generated.slides,
          generationMeta: generated.generationMeta,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(pitchDecks.id, deck.id));

      return {
        success: true,
        slides: generated.slides,
        styleInstructions: generated.styleInstructions,
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

      throw new Error(`Full AI deck regeneration failed: ${message}`);
    }
  });

const pitchDeckQueryOptions = (deckId: number) => ({
  queryKey: ["pitch-deck", deckId] as const,
  queryFn: () =>
    loadPitchDeckDetail({ data: { deckId } }) as Promise<{
      id: number;
      title: string;
      startupName: string;
      oneLiner: string | null;
      audience: string;
      language: string;
      currency: string;
      provider: string;
      providerModel: string | null;
      status: PresentationStatus;
      brief: PitchDeckBriefDto;
      slides: PitchDeckSlideDto[];
      template: string;
      designMode: PitchDeckDesignMode;
      aiStyleInput: PitchDeckStyleQuestionnaireInput | null;
      aiStyleInstructions: PitchDeckAiStyleInstructions | null;
      modelId: number | null;
      lastError: string | null;
      updatedAt: Date;
    }>,
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/pitch-decks/$deckId")({
  loader: async ({ params, location, context }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    const deckId = Number((params as { deckId: string }).deckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new Error("Invalid deck id");
    }
    await context.queryClient.prefetchQuery(pitchDeckQueryOptions(deckId));
    return null;
  },
  component: PitchDeckDetailPage,
});

function PitchDeckDetailPage() {
  const params = Route.useParams() as { deckId: string };
  const deckId = Number(params.deckId);
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery(pitchDeckQueryOptions(deckId));
  const router = useRouter();
  const queryClient = useQueryClient();
  const saveSlidesFn = useServerFn(savePitchDeckSlides);
  const saveTemplateFn = useServerFn(savePitchDeckTemplate);
  const improvePitchDeckTextFn = useServerFn(improvePitchDeckText);
  const regenerateDeckFn = useServerFn(regeneratePitchDeck);
  const regenerateFullAiFn = useServerFn(regeneratePitchDeckFullAi);
  const assertExportAccessFn = useServerFn(assertExportAccess);
  const slidesSyncedRef = useRef(false);
  const hasShownFailedToastRef = useRef(false);
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [fullAiModalOpen, setFullAiModalOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [slides, setSlides] = useState<PitchDeckSlideDto[]>([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const prevDeckIdRef = useRef(deckId);

  const saveMutation = useMutation({
    mutationFn: (vars: { deckId: number; slides: PitchDeckSlideDto[] }) =>
      saveSlidesFn({ data: vars }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["pitch-deck", vars.deckId] });
      const previous = queryClient.getQueryData(["pitch-deck", vars.deckId]);
      queryClient.setQueryData(["pitch-deck", vars.deckId], (old: unknown) =>
        old && typeof old === "object" && "slides" in old
          ? { ...(old as object), slides: vars.slides }
          : old
      );
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous != null) {
        queryClient.setQueryData(["pitch-deck", vars.deckId], ctx.previous);
      }
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pitch-deck", vars.deckId] });
      queryClient.invalidateQueries({ queryKey: ["pitch-decks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (vars: { deckId: number }) => regenerateDeckFn({ data: vars }),
    onSuccess: (_data, vars) => {
      if (_data?.slides) {
        queryClient.setQueryData(["pitch-deck", vars.deckId], (old: unknown) =>
          old && typeof old === "object"
            ? { ...(old as object), slides: _data.slides, status: "ready" as const }
            : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["pitch-deck", vars.deckId] });
      queryClient.invalidateQueries({ queryKey: ["pitch-decks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate deck");
    },
  });

  const fullAiRegenerateMutation = useMutation({
    mutationFn: (vars: {
      deckId: number;
      styleQuestionnaire: PitchDeckStyleQuestionnaireInput;
    }) => regenerateFullAiFn({ data: vars }),
    onSuccess: (_data, vars) => {
      if (_data?.slides) {
        queryClient.setQueryData(["pitch-deck", vars.deckId], (old: unknown) =>
          old && typeof old === "object"
            ? {
                ...(old as object),
                slides: _data.slides,
                status: "ready" as const,
                designMode: "ai_designed" as const,
                aiStyleInput: vars.styleQuestionnaire,
                aiStyleInstructions: _data.styleInstructions ?? null,
              }
            : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["pitch-deck", vars.deckId] });
      queryClient.invalidateQueries({ queryKey: ["pitch-decks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Full AI regeneration failed");
    },
  });

  const improveTextMutation = useMutation({
    mutationFn: (vars: {
      deckId: number;
      fieldType: ImproveTextFieldType;
      currentValue: string;
      slideType: string;
    }) => improvePitchDeckTextFn({ data: vars }).then((r) => r.improvedText),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to improve text");
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (vars: {
      deckId: number;
      templateId: "minimal" | "professional-blue" | "bold-dark" | "warm-earthy" | "tech-modern";
    }) => saveTemplateFn({ data: vars }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["pitch-deck", vars.deckId] });
      const previous = queryClient.getQueryData(["pitch-deck", vars.deckId]);
      queryClient.setQueryData(["pitch-deck", vars.deckId], (old: unknown) =>
        old && typeof old === "object" ? { ...(old as object), template: vars.templateId } : old
      );
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous != null) {
        queryClient.setQueryData(["pitch-deck", vars.deckId], ctx.previous);
      }
      toast.error("Failed to save template");
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pitch-deck", vars.deckId] });
    },
  });

  const debouncedSave = useDebouncedCallback(
    (id: number, nextSlides: PitchDeckSlideDto[]) => {
      saveMutation.mutate({ deckId: id, slides: nextSlides });
    },
    600
  );

  const selectedSlide = useMemo(
    () => slides[selectedSlideIndex] ?? slides[0],
    [slides, selectedSlideIndex],
  );

  useEffect(() => {
    if (!data) return;
    if (prevDeckIdRef.current !== deckId) {
      prevDeckIdRef.current = deckId;
      setSlides(data.slides);
      slidesSyncedRef.current = true;
    } else if (slides.length === 0 && data.slides.length > 0) {
      setSlides(data.slides);
      slidesSyncedRef.current = true;
    }
  }, [deckId, data, slides.length]);

  useEffect(() => {
    if (!data || slides.length === 0 || slidesSyncedRef.current) {
      slidesSyncedRef.current = false;
      return;
    }
    debouncedSave(data.id, slides);
  }, [slides, data?.id, debouncedSave]);

  useEffect(() => {
    if (data?.status === "failed" && !hasShownFailedToastRef.current) {
      hasShownFailedToastRef.current = true;
      toast.error("Presentation generation failed.", {
        action: {
          label: "Retry",
          onClick: () => setRetryModalOpen(true),
        },
      });
    }
  }, [data?.status]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-[var(--brand-muted)]">
          Loading pitch deck...
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-red-600">
          Failed to load pitch deck. Please refresh the page.
        </div>
      </div>
    );
  }

  const updateSlide = (index: number, patch: Partial<PitchDeckSlideDto>) => {
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  };

  const updateBullet = (slideIndex: number, bulletIndex: number, value: string) => {
    setSlides((prev) =>
      prev.map((slide, index) => {
        if (index !== slideIndex) return slide;
        const nextBullets = [...slide.bullets];
        nextBullets[bulletIndex] = value;
        return { ...slide, bullets: nextBullets };
      }),
    );
  };

  const addBullet = (slideIndex: number) => {
    setSlides((prev) =>
      prev.map((slide, index) =>
        index === slideIndex ? { ...slide, bullets: [...slide.bullets, ""] } : slide,
      ),
    );
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    setSlides((prev) =>
      prev.map((slide, index) => {
        if (index !== slideIndex) return slide;
        return {
          ...slide,
          bullets: slide.bullets.filter((_, i) => i !== bulletIndex),
        };
      }),
    );
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate(
      { deckId: data.id },
      {
        onSuccess: (result) => {
          if (result?.slides) {
            setSlides(result.slides);
            setSelectedSlideIndex(0);
          }
        },
      }
    );
  };

  const template =
    data.designMode === "ai_designed" && data.aiStyleInstructions
      ? aiStyleToTemplate(data.aiStyleInstructions, data.template ?? "minimal")
      : getTemplateById(data.template ?? "minimal");

  const ensureExportAllowed = async () => {
    try {
      const access = await assertExportAccessFn({
        data: { returnPath: `/pitch-decks/${data.id}` },
      });

      if (access.allowed) {
        return true;
      }

      setCheckoutUrl(access.checkoutUrl);
      setPaywallOpen(true);
      return false;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not verify subscription. Please try again.",
      );
      return false;
    }
  };

  const handleExportPdf = async () => {
    try {
      const allowed = await ensureExportAllowed();
      if (!allowed) {
        return;
      }

      await exportPitchDeckToPdf({
        title: data.title,
        startupName: data.startupName,
        slides,
        template,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export PDF.",
      );
    }
  };

  const handleTemplateChange = (templateId: "minimal" | "professional-blue" | "bold-dark" | "warm-earthy" | "tech-modern") => {
    saveTemplateMutation.mutate({ deckId: data.id, templateId });
  };

  const regenerating = regenerateMutation.isPending;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <ExportPaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        checkoutUrl={checkoutUrl}
        title="Upgrade to export this pitch deck"
        description="Pitch deck creation is free. PDF export requires Pro ($10/month)."
      />
      <RetryModal
        open={retryModalOpen}
        onOpenChange={setRetryModalOpen}
        onConfirm={handleRegenerate}
        isPending={regenerating}
      />
      <StyleQuestionnaireModal
        open={fullAiModalOpen}
        onOpenChange={setFullAiModalOpen}
        onSubmit={(styleQuestionnaire) => {
          fullAiRegenerateMutation.mutate(
            { deckId: data.id, styleQuestionnaire },
            {
              onSuccess: (result) => {
                if (result?.slides) {
                  setSlides(result.slides);
                  setSelectedSlideIndex(0);
                }
              },
            },
          );
        }}
        isPending={fullAiRegenerateMutation.isPending}
        title="Full AI slides — style"
        submitLabel="Regenerate with Full AI"
      />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="px-6 py-8 lg:px-10 max-w-[1600px] mx-auto space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                Pitch Deck Editor
              </p>
              <h1 className="text-3xl font-[var(--font-display)]">{data.title}</h1>
              <p className="text-sm text-[var(--brand-muted)] mt-1">{data.startupName}</p>
              <p className="text-xs text-[var(--brand-muted)] mt-1 flex items-center gap-2">
                Status: <span className="font-semibold">{data.status}</span>
                {data.lastError ? ` • ${data.lastError}` : ""}
                <AutosaveIndicator
                  isPending={saveMutation.isPending}
                  isSuccess={saveMutation.isSuccess}
                  isError={saveMutation.isError}
                />
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {data.designMode === "ai_designed" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--brand-primary)]/40 bg-[rgba(79,70,186,0.08)] text-sm text-[var(--brand-primary)]">
                  <span aria-hidden>AI-designed style</span>
                </span>
              ) : (
                <>
                  <label className="text-xs text-[var(--brand-muted)] mr-1">
                    Template
                  </label>
                  <select
                    value={data.template ?? "minimal"}
                    onChange={(e) =>
                      handleTemplateChange(
                        e.target.value as "minimal" | "professional-blue" | "bold-dark" | "warm-earthy" | "tech-modern"
                      )
                    }
                    disabled={saveTemplateMutation.isPending}
                    className="px-3 py-2 rounded-xl border border-[var(--border-soft)] text-sm bg-white disabled:opacity-50"
                  >
                    {getAllTemplates().map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                type="button"
                onClick={() => router.navigate({ to: "/pitch-decks" as any })}
                className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setRetryModalOpen(true)}
                disabled={regenerating}
                className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm disabled:opacity-50"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => setFullAiModalOpen(true)}
                disabled={regenerating || fullAiRegenerateMutation.isPending}
                className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm disabled:opacity-50"
              >
                {fullAiRegenerateMutation.isPending ? "Full AI…" : "Full AI slides"}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2 rounded-xl bg-[rgba(79,70,186,0.12)] text-[var(--brand-primary)] text-sm"
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setSelectedSlideIndex((i) => Math.max(0, i - 1))}
                disabled={selectedSlideIndex === 0}
                className="shrink-0 w-10 h-10 rounded-full border border-[var(--border-soft)] flex items-center justify-center text-[var(--brand-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-muted)]"
                aria-label="Previous slide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 flex justify-center max-w-4xl w-full min-w-0">
                {selectedSlide ? (
                  <EditableSlideView
                    slide={selectedSlide}
                    startupName={data.startupName}
                    slideIndex={selectedSlideIndex}
                    totalSlides={slides.length}
                    template={template}
                    onUpdate={(patch) => updateSlide(selectedSlideIndex, patch)}
                    onUpdateBullet={(bulletIndex, value) =>
                      updateBullet(selectedSlideIndex, bulletIndex, value)
                    }
                    onAddBullet={() => addBullet(selectedSlideIndex)}
                    onRemoveBullet={(bulletIndex) =>
                      removeBullet(selectedSlideIndex, bulletIndex)
                    }
                    onImproveWithAi={async ({ fieldType, currentValue }) =>
                      improveTextMutation.mutateAsync({
                        deckId: data.id,
                        fieldType,
                        currentValue,
                        slideType: selectedSlide.type,
                      })
                    }
                    isImproving={improveTextMutation.isPending}
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedSlideIndex((i) => Math.min(slides.length - 1, i + 1))
                }
                disabled={selectedSlideIndex >= slides.length - 1}
                className="shrink-0 w-10 h-10 rounded-full border border-[var(--border-soft)] flex items-center justify-center text-[var(--brand-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-muted)]"
                aria-label="Next slide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div>
              <p className="text-xs text-[var(--brand-muted)] mb-2">Slides</p>
              <SlideCarousel
                slides={slides}
                selectedIndex={selectedSlideIndex}
                onSelectSlide={setSelectedSlideIndex}
                template={template}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
