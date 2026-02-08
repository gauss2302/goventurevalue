import type { PitchDeckProvider } from "@/lib/pitchDeck/providers/types";

const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

const normalizeModelName = (model: string) => model.replace(/^models\//, "").trim();

const unique = (values: string[]) => Array.from(new Set(values.filter((value) => value.length > 0)));

const getVersionCandidates = () => {
  const configured = process.env.GEMINI_API_VERSION?.trim();
  return unique([configured ?? "", "v1", "v1beta"]);
};

const getFallbackModelCandidates = () => {
  const envModels = (process.env.GEMINI_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((value) => normalizeModelName(value))
    .filter((value) => value.length > 0);

  return unique([...envModels, ...DEFAULT_GEMINI_MODEL_FALLBACKS]);
};

const isModelNotFoundError = (status: number, body: string) =>
  status === 404 &&
  /(not found|not supported for generateContent|ListModels|models\/)/i.test(body);

const isPayloadSchemaMismatchError = (status: number, body: string) =>
  status === 400 &&
  /(Unknown name \"systemInstruction\"|Unknown name \"responseMimeType\"|Invalid JSON payload received)/i.test(
    body,
  );

type GenerateRequestParams = {
  apiKey: string;
  apiVersion: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  compatibilityMode?: boolean;
};

type GenerateAttemptResult =
  | { ok: true; data: any }
  | { ok: false; status: number; body: string };

const isGenerateAttemptError = (
  result: GenerateAttemptResult,
): result is { ok: false; status: number; body: string } => !result.ok;

const attemptGenerateContent = async ({
  apiKey,
  apiVersion,
  model,
  systemPrompt,
  userPrompt,
  compatibilityMode = false,
}: GenerateRequestParams): Promise<GenerateAttemptResult> => {
  const endpoint = `${GEMINI_API_HOST}/${apiVersion}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = compatibilityMode
    ? {
        // Compatibility mode for API versions/models that reject systemInstruction/responseMimeType.
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `System instructions:\n${systemPrompt}\n\nUser request:\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      }
    : {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: await response.text(),
    };
  }

  return {
    ok: true,
    data: await response.json(),
  };
};

const listGenerateContentModels = async (apiKey: string, apiVersion: string): Promise<string[]> => {
  const endpoint = `${GEMINI_API_HOST}/${apiVersion}/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    return [];
  }

  const data: any = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];

  return unique(
    models
      .filter(
        (entry: any) =>
          Array.isArray(entry?.supportedGenerationMethods) &&
          entry.supportedGenerationMethods.includes("generateContent"),
      )
      .map((entry: any) =>
        typeof entry?.name === "string" ? normalizeModelName(entry.name) : "",
      ),
  );
};

const extractGeneratedText = (data: any) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim()
    : "";

  if (!text) {
    throw new Error("Gemini returned empty content");
  }

  return text;
};

export const geminiPitchDeckProvider: PitchDeckProvider = {
  async generate({ model, systemPrompt, userPrompt }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const requestedModel = normalizeModelName(model);
    if (!requestedModel) {
      throw new Error("Gemini model is required");
    }

    const apiVersions = getVersionCandidates();
    const staticFallbackModels = getFallbackModelCandidates();
    const attemptedTargets: string[] = [];
    let lastNotFoundError: string | null = null;

    for (const apiVersion of apiVersions) {
      const discoveredModels = await listGenerateContentModels(apiKey, apiVersion);
      const modelCandidates = unique([requestedModel, ...staticFallbackModels, ...discoveredModels]);

      for (const candidateModel of modelCandidates) {
        const targetLabel = `${apiVersion}/${candidateModel}`;
        let result = await attemptGenerateContent({
          apiKey,
          apiVersion,
          model: candidateModel,
          systemPrompt,
          userPrompt,
        });

        if (isGenerateAttemptError(result) && isPayloadSchemaMismatchError(result.status, result.body)) {
          result = await attemptGenerateContent({
            apiKey,
            apiVersion,
            model: candidateModel,
            systemPrompt,
            userPrompt,
            compatibilityMode: true,
          });
        }

        if (result.ok) {
          const text = extractGeneratedText(result.data);
          return {
            rawText: text,
            usage: {
              promptTokens: result.data?.usageMetadata?.promptTokenCount,
              completionTokens: result.data?.usageMetadata?.candidatesTokenCount,
              totalTokens: result.data?.usageMetadata?.totalTokenCount,
            },
          };
        }

        if (isGenerateAttemptError(result)) {
          attemptedTargets.push(targetLabel);

          if (isModelNotFoundError(result.status, result.body)) {
            lastNotFoundError = `Gemini model is unavailable on API ${apiVersion}: ${candidateModel}`;
            continue;
          }

          throw new Error(`Gemini request failed (${result.status}): ${result.body}`);
        }
      }
    }

    const attemptsLabel = attemptedTargets.length
      ? ` Attempted: ${attemptedTargets.join(", ")}.`
      : "";

    throw new Error(
      `${lastNotFoundError ?? "Gemini did not return a supported model for generateContent."}${attemptsLabel} Set GEMINI_PITCH_MODEL to a valid model or update GEMINI_MODEL_FALLBACKS.`,
    );
  },
};
