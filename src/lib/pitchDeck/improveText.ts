/**
 * Calls Gemini to improve a single pitch deck text field.
 * Returns plain text only (no JSON).
 */

const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.0-flash";

export type ImproveTextFieldType = "heading" | "subheading" | "bullet" | "speakerNotes";

export type ImproveTextContext = {
  slideType: string;
  startupName: string;
  language?: string;
};

const FIELD_INSTRUCTIONS: Record<
  ImproveTextFieldType,
  string
> = {
  heading:
    "Improve this slide heading for an investor pitch. Keep it concise and impactful (under 90 characters). Return only the improved heading, no quotes or explanation.",
  subheading:
    "Improve this slide subheading for an investor pitch. Keep it clear and under 180 characters. Return only the improved subheading, no quotes or explanation.",
  bullet:
    "Improve this bullet point for an investor pitch. Keep it concise (under 140 characters), specific, and impactful. Return only the improved bullet text, no quotes or explanation.",
  speakerNotes:
    "Improve these speaker notes for an investor pitch. Keep them practical and useful for the presenter. Return only the improved speaker notes, no quotes or explanation.",
};

function normalizeModel(m: string) {
  return m.replace(/^models\//, "").trim();
}

export async function improvePitchDeckTextWithGemini(params: {
  fieldType: ImproveTextFieldType;
  currentValue: string;
  context: ImproveTextContext;
  model?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = normalizeModel(params.model ?? process.env.GEMINI_PITCH_MODEL ?? DEFAULT_MODEL);
  const instruction = FIELD_INSTRUCTIONS[params.fieldType];
  const lang = params.context.language || "en";

  const userPrompt = [
    `Language: ${lang}.`,
    `Slide type: ${params.context.slideType}.`,
    `Startup: ${params.context.startupName}.`,
    "",
    "Current text:",
    params.currentValue.trim() || "(empty)",
    "",
    instruction,
  ].join("\n");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini improve-text failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("Gemini returned empty content");
  }

  return text.replace(/^["']|["']$/g, "").trim();
}
