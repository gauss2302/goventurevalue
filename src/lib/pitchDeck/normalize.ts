import { DECK_SLIDE_ORDER } from "@/lib/pitchDeck/types";
import type { PitchDeckSlideDto, PitchDeckSlideTypeDto } from "@/lib/dto";

const MAX_HEADING = 90;
const MAX_SUBHEADING = 180;
const MAX_BULLET = 140;

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

  return {
    id: `${type}-${index + 1}`,
    type,
    heading,
    subheading,
    bullets: bullets.length > 0 ? bullets : ["Define the key message for this slide."],
    speakerNotes,
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
