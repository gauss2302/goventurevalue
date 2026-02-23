import type { PitchDeckAiStyleInstructions } from "@/lib/dto";
import type { PitchDeckTemplate } from "@/lib/pitchDeck/templates";
import { getTemplateById } from "@/lib/pitchDeck/templates";

/**
 * Maps AI style instructions to our platform's template shape.
 * Uses baseTemplate for any missing fields so rendering stays consistent.
 */
export function aiStyleToTemplate(
  aiStyle: PitchDeckAiStyleInstructions | null | undefined,
  baseTemplateId: string = "minimal",
): PitchDeckTemplate {
  const base = getTemplateById(baseTemplateId);
  if (!aiStyle?.global) return base;

  const g = aiStyle.global;
  const palette = g.palette;
  const colors = { ...base.colors };
  if (palette) {
    if (palette.background) colors.background = palette.background;
    if (palette.heading) colors.heading = palette.heading;
    if (palette.subheading) colors.subheading = palette.subheading;
    if (palette.bullets) colors.bullets = palette.bullets;
    if (palette.accent) colors.accent = palette.accent;
    if (palette.footer) colors.footer = palette.footer;
    if (palette.border) colors.border = palette.border;
  }

  const typographyMap: Record<string, string> = {
    modern: "helvetica",
    classic: "times",
    technical: "courier",
    editorial: "times",
  };
  const headingFont = g.typographyPersonality
    ? typographyMap[g.typographyPersonality.toLowerCase()] ?? base.typography.headingFont
    : base.typography.headingFont;

  const densityMap = { minimal: 13, balanced: 13, dense: 12 };
  const bodySize = g.visualDensity
    ? densityMap[g.visualDensity.toLowerCase() as keyof typeof densityMap] ?? base.typography.bodySize
    : base.typography.bodySize;

  return {
    ...base,
    id: base.id,
    name: base.name,
    colors,
    typography: {
      ...base.typography,
      headingFont,
      bodySize,
    },
    layout: base.layout,
  };
}
