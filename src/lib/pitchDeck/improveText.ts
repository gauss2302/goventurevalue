/**
 * Calls Gemini to improve a single pitch deck text field.
 * Returns plain text only (no JSON).
 */

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
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env file (see .env.example), then restart the dev server so it picks up the change.",
    );
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

  const doRequest = () =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  let response = await doRequest();
  if (!response.ok && response.status === 429) {
    const parseRetrySec = (respBody: string): number => {
      try {
        const data = JSON.parse(respBody) as { error?: { details?: Array<{ retryDelay?: string }> } };
        const retryInfo = data?.error?.details?.find((d) => d.retryDelay);
        if (retryInfo?.retryDelay) {
          const s = parseFloat(retryInfo.retryDelay.replace("s", ""));
          return Number.isFinite(s) ? Math.min(Math.ceil(s), 60) : 24;
        }
      } catch {
        // ignore
      }
      return 24;
    };
    for (let retry = 0; retry < 2; retry++) {
      const bodyText = await response.text();
      const waitSec = parseRetrySec(bodyText);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      response = await doRequest();
      if (response.ok || response.status !== 429) break;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      throw new Error(
        "Gemini rate limit exceeded (free tier quota). Please wait a few minutes and try again, or check https://ai.google.dev/gemini-api/docs/rate-limits.",
      );
    }
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
