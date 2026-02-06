import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import type { PitchDeckSlideDto, PitchDeckBriefDto } from "@/lib/dto";
import { exportPitchDeckToPdf } from "@/lib/pitchDeck/pdf";
import type { ModelContextSummary } from "@/lib/pitchDeck/types";

const toSlides = (value: unknown): PitchDeckSlideDto[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((slide, index) => {
      const candidate = slide as Partial<PitchDeckSlideDto>;
      if (!candidate || typeof candidate !== "object") return null;
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

export const Route = createFileRoute("/pitch-decks/$deckId")({
  loader: async ({ params, location }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    const deckId = Number((params as { deckId: string }).deckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new Error("Invalid deck id");
    }
    return loadPitchDeckDetail({ data: { deckId } });
  },
  component: PitchDeckDetailPage,
});

function PitchDeckDetailPage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  const saveSlidesFn = useServerFn(savePitchDeckSlides);
  const regenerateDeckFn = useServerFn(regeneratePitchDeck);

  const [slides, setSlides] = useState<PitchDeckSlideDto[]>(data.slides);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlide = useMemo(
    () => slides[selectedSlideIndex] || slides[0],
    [slides, selectedSlideIndex],
  );

  const updateSlide = (index: number, patch: Partial<PitchDeckSlideDto>) => {
    setSlides((prev) =>
      prev.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...patch } : slide,
      ),
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
        const nextBullets = slide.bullets.filter((_, i) => i !== bulletIndex);
        return { ...slide, bullets: nextBullets };
      }),
    );
  };

  const moveSlide = (slideIndex: number, direction: "up" | "down") => {
    setSlides((prev) => {
      const next = [...prev];
      const toIndex = direction === "up" ? slideIndex - 1 : slideIndex + 1;
      if (toIndex < 0 || toIndex >= next.length) return prev;
      const [current] = next.splice(slideIndex, 1);
      next.splice(toIndex, 0, current);
      setSelectedSlideIndex(toIndex);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSlidesFn({ data: { deckId: data.id, slides } });
      await router.invalidate();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save slides";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const result = await regenerateDeckFn({ data: { deckId: data.id } });
      setSlides(result.slides);
      setSelectedSlideIndex(0);
      await router.invalidate();
    } catch (regenerationError) {
      const message = regenerationError instanceof Error ? regenerationError.message : "Failed to regenerate deck";
      setError(message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportPdf = () => {
    exportPitchDeckToPdf({
      title: data.title,
      startupName: data.startupName,
      slides,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="px-6 py-8 lg:px-10 max-w-[1400px] mx-auto space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">Pitch Deck Editor</p>
              <h1 className="text-3xl font-[var(--font-display)]">{data.title}</h1>
              <p className="text-sm text-[var(--brand-muted)] mt-1">{data.startupName}</p>
              <p className="text-xs text-[var(--brand-muted)] mt-1">
                Status: <span className="font-semibold">{data.status}</span>
                {data.lastError ? ` • ${data.lastError}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.navigate({ to: "/pitch-decks" as any })}
                className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="bg-white rounded-2xl border border-[var(--border-soft)] p-4 shadow-[var(--card-shadow)] h-fit">
              <h2 className="text-sm font-semibold text-[var(--brand-muted)] mb-3">Slides</h2>
              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setSelectedSlideIndex(index)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedSlideIndex === index
                        ? "border-[rgba(79,70,186,0.35)] bg-[rgba(79,70,186,0.06)]"
                        : "border-[var(--border-soft)] bg-white"
                    }`}
                  >
                    <p className="text-xs text-[var(--brand-muted)] uppercase">{slide.type}</p>
                    <p className="text-sm font-medium text-[var(--brand-ink)] mt-1 line-clamp-2">
                      {slide.heading || `Slide ${index + 1}`}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            {selectedSlide ? (
              <section className="bg-white rounded-2xl border border-[var(--border-soft)] p-6 shadow-[var(--card-shadow)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-[var(--font-display)]">
                    Slide {selectedSlideIndex + 1}: {selectedSlide.type}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveSlide(selectedSlideIndex, "up")}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-soft)] text-xs"
                      disabled={selectedSlideIndex === 0}
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(selectedSlideIndex, "down")}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-soft)] text-xs"
                      disabled={selectedSlideIndex === slides.length - 1}
                    >
                      Move Down
                    </button>
                  </div>
                </div>

                <label className="block text-sm text-[var(--brand-muted)]">
                  Heading
                  <input
                    type="text"
                    value={selectedSlide.heading}
                    onChange={(event) =>
                      updateSlide(selectedSlideIndex, { heading: event.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                  />
                </label>

                <label className="block text-sm text-[var(--brand-muted)]">
                  Subheading
                  <input
                    type="text"
                    value={selectedSlide.subheading}
                    onChange={(event) =>
                      updateSlide(selectedSlideIndex, { subheading: event.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--brand-muted)]">Bullets</p>
                    <button
                      type="button"
                      onClick={() => addBullet(selectedSlideIndex)}
                      className="text-xs px-2 py-1 rounded border border-[var(--border-soft)]"
                    >
                      Add Bullet
                    </button>
                  </div>
                  {selectedSlide.bullets.map((bullet, bulletIndex) => (
                    <div key={`${selectedSlide.id}-bullet-${bulletIndex}`} className="flex gap-2">
                      <textarea
                        value={bullet}
                        onChange={(event) =>
                          updateBullet(selectedSlideIndex, bulletIndex, event.target.value)
                        }
                        rows={2}
                        className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                      />
                      <button
                        type="button"
                        onClick={() => removeBullet(selectedSlideIndex, bulletIndex)}
                        className="px-3 py-2 rounded-xl border border-[var(--border-soft)] text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <label className="block text-sm text-[var(--brand-muted)]">
                  Speaker Notes
                  <textarea
                    value={selectedSlide.speakerNotes}
                    onChange={(event) =>
                      updateSlide(selectedSlideIndex, { speakerNotes: event.target.value })
                    }
                    rows={6}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[var(--border-soft)]"
                  />
                </label>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
