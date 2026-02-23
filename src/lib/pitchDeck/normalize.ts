import { DECK_SLIDE_ORDER } from "@/lib/pitchDeck/types";
import type {
  PitchDeckAiStyleGlobal,
  PitchDeckAiStyleInstructions,
  PitchDeckSlideDto,
  PitchDeckSlideTypeDto,
} from "@/lib/dto";

const MAX_HEADING = 90;
const MAX_SUBHEADING = 180;
const MAX_BULLET = 140;
const MAX_KEY_METRIC = 30;
const MAX_KEY_METRICS = 4;

const sanitize = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
};

const sanitizeBullets = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  const bullets = value
    .map((item) => sanitize(item, MAX_BULLET))
    .filter((item) => item.length > 0)
    .slice(0, 6);
  return bullets;
};

const sanitizeKeyMetrics = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitize(item, MAX_KEY_METRIC))
    .filter((item) => item.length > 0)
    .slice(0, MAX_KEY_METRICS);
};

const typeSet = new Set<PitchDeckSlideTypeDto>(DECK_SLIDE_ORDER.map((item) => item.type));

const extractJsonObject = (rawText: string) => {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Empty AI response");
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const normalizeSlide = (
  type: PitchDeckSlideTypeDto,
  label: string,
  source: any,
  index: number,
): PitchDeckSlideDto => {
  const heading = sanitize(source?.heading, MAX_HEADING) || label;
  const subheading = sanitize(source?.subheading, MAX_SUBHEADING);
  const bullets = sanitizeBullets(source?.bullets);
  const speakerNotes = sanitize(source?.speakerNotes, 1500);
  const keyMetrics = sanitizeKeyMetrics(source?.keyMetrics);
  const rawEmphasis = source?.emphasisBulletIndex;
  const emphasisBulletIndex =
    typeof rawEmphasis === "number" &&
    Number.isInteger(rawEmphasis) &&
    rawEmphasis >= 0 &&
    rawEmphasis < 6
      ? rawEmphasis
      : undefined;

  return {
    id: `${type}-${index + 1}`,
    type,
    heading,
    subheading,
    bullets: bullets.length > 0 ? bullets : ["Define the key message for this slide."],
    speakerNotes,
    ...(keyMetrics.length > 0 ? { keyMetrics } : {}),
    ...(emphasisBulletIndex !== undefined ? { emphasisBulletIndex } : {}),
  };
};

export const normalizePitchDeckSlides = (rawText: string): PitchDeckSlideDto[] => {
  let parsed: any;
  try {
    parsed = JSON.parse(extractJsonObject(rawText));
  } catch (error) {
    throw new Error("AI response is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.slides)) {
    throw new Error("AI response does not include slides array");
  }

  const byType = new Map<PitchDeckSlideTypeDto, any>();
  const byPosition = parsed.slides as any[];

  parsed.slides.forEach((slide: any) => {
    const type = typeof slide?.type === "string" ? (slide.type as PitchDeckSlideTypeDto) : null;
    if (type && typeSet.has(type) && !byType.has(type)) {
      byType.set(type, slide);
    }
  });

  return DECK_SLIDE_ORDER.map((template, index) => {
    const source = byType.get(template.type) ?? byPosition[index] ?? null;
    return normalizeSlide(template.type, template.label, source, index);
  });
};

const MAX_STYLE_STRING = 200;
const hexColor = /^#[0-9A-Fa-f]{6}$/;
const sanitizeStyleString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_STYLE_STRING);
};
const sanitizeHex = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return hexColor.test(v) ? v : "";
};

export function normalizePitchDeckFullAiResponse(rawText: string): {
  slides: PitchDeckSlideDto[];
  styleInstructions: PitchDeckAiStyleInstructions;
} {
  let parsed: any;
  try {
    parsed = JSON.parse(extractJsonObject(rawText));
  } catch (error) {
    throw new Error("Full AI response is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Full AI response is not an object");
  }

  const slidesRaw =
    typeof parsed.slides === "string"
      ? (() => {
          try {
            return JSON.parse(parsed.slides);
          } catch {
            return [];
          }
        })()
      : parsed.slides;
  const slides = Array.isArray(slidesRaw)
    ? normalizePitchDeckSlides(JSON.stringify({ slides: slidesRaw }))
    : [];

  const rawStyle = parsed.styleInstructions;
  const styleInstructions: PitchDeckAiStyleInstructions = {};

  if (rawStyle && typeof rawStyle === "object") {
    if (rawStyle.global && typeof rawStyle.global === "object") {
      const g = rawStyle.global;
      let palette: NonNullable<PitchDeckAiStyleGlobal["palette"]> | undefined = undefined;
      if (g.palette && typeof g.palette === "object") {
        const p: Record<string, string> = {};
        for (const key of ["background", "heading", "subheading", "bullets", "accent", "footer", "border"]) {
          const v = sanitizeHex((g.palette as Record<string, unknown>)[key]);
          if (v) p[key] = v;
        }
        palette = Object.keys(p).length > 0 ? (p as NonNullable<PitchDeckAiStyleGlobal["palette"]>) : undefined;
      }
      styleInstructions.global = {
        ...(palette ? { palette } : {}),
        typographyPersonality: sanitizeStyleString(g.typographyPersonality) || undefined,
        visualDensity: sanitizeStyleString(g.visualDensity) || undefined,
        motif: sanitizeStyleString(g.motif) || undefined,
        brandAlignment: sanitizeStyleString(g.brandAlignment) || undefined,
        investorEmphasis: sanitizeStyleString(g.investorEmphasis) || undefined,
      };
      if (
        !styleInstructions.global.palette &&
        !styleInstructions.global.typographyPersonality &&
        !styleInstructions.global.visualDensity &&
        !styleInstructions.global.motif &&
        !styleInstructions.global.brandAlignment &&
        !styleInstructions.global.investorEmphasis
      ) {
        styleInstructions.global = undefined;
      }
    }

    if (rawStyle.slideHints && typeof rawStyle.slideHints === "object") {
      const hints: PitchDeckAiStyleInstructions["slideHints"] = {};
      const validTypes = new Set(DECK_SLIDE_ORDER.map((s) => s.type));
      for (const [key, value] of Object.entries(rawStyle.slideHints)) {
        if (!validTypes.has(key as PitchDeckSlideTypeDto) || !value || typeof value !== "object")
          continue;
        const v = value as { layoutEmphasis?: unknown; visualMotif?: unknown };
        const layoutEmphasis = sanitizeStyleString(v.layoutEmphasis);
        const visualMotif = sanitizeStyleString(v.visualMotif);
        if (layoutEmphasis || visualMotif) {
          hints[key as PitchDeckSlideTypeDto] = {
            ...(layoutEmphasis ? { layoutEmphasis } : {}),
            ...(visualMotif ? { visualMotif } : {}),
          };
        }
      }
      if (Object.keys(hints).length > 0) {
        styleInstructions.slideHints = hints;
      }
    }
  }

  return { slides, styleInstructions };
}
