import { DEFAULT_TEMPERATURE, type LlmProvider, type LlmRequest } from "@/lib/ai/types";

/**
 * Gemini provider.
 *
 * Ported from the previous product's pitch-deck provider, keeping the hardening
 * that was earned there the hard way:
 *   - API version candidates (v1 then v1beta), because model availability differs;
 *   - static + discovered model fallbacks, because a configured model can vanish;
 *   - a compatibility payload for versions that reject `systemInstruction` /
 *     `responseMimeType`;
 *   - 429 retry honouring the `RetryInfo` delay Gemini returns.
 *
 * Changed for Workers: all configuration is injected, nothing reads process.env.
 */

const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";

const DEFAULT_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const MAX_QUOTA_RETRIES = 2;
/** Cap on how long we honour a Gemini-supplied retry delay. */
const MAX_RETRY_WAIT_SECONDS = 60;
const DEFAULT_RETRY_WAIT_SECONDS = 24;

export type GeminiProviderConfig = {
  apiKey: string;
  model: string;
  /** Preferred API version; v1 then v1beta are always tried as fallbacks. */
  apiVersion?: string;
  modelFallbacks?: string[];
};

const normalizeModelName = (model: string) => model.replace(/^models\//, "").trim();

const unique = (values: string[]) => Array.from(new Set(values.filter((v) => v.length > 0)));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isModelNotFoundError = (status: number, body: string) =>
  status === 404 &&
  /(not found|not supported for generateContent|ListModels|models\/)/i.test(body);

const isPayloadSchemaMismatchError = (status: number, body: string) =>
  status === 400 &&
  /(Unknown name "systemInstruction"|Unknown name "responseMimeType"|Invalid JSON payload received)/i.test(
    body,
  );

const isQuotaExhaustedError = (status: number) => status === 429;

/** Parse the retry delay (seconds) out of a Gemini 429 body. */
export const parseRetryDelaySeconds = (body: string): number | undefined => {
  try {
    const data = JSON.parse(body) as {
      error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> };
    };
    const retryInfo = data?.error?.details?.find(
      (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    const delay = retryInfo?.retryDelay;
    if (delay) {
      const seconds = Number.parseFloat(delay.replace("s", ""));
      return Number.isFinite(seconds)
        ? Math.min(Math.ceil(seconds), MAX_RETRY_WAIT_SECONDS)
        : undefined;
    }
  } catch {
    // Body was not JSON — fall through to the textual match below.
  }

  const match = body.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    const seconds = Number.parseFloat(match[1]);
    return Number.isFinite(seconds)
      ? Math.min(Math.ceil(seconds), MAX_RETRY_WAIT_SECONDS)
      : undefined;
  }

  return undefined;
};

type AttemptResult = { ok: true; data: any } | { ok: false; status: number; body: string };

const isError = (r: AttemptResult): r is { ok: false; status: number; body: string } => !r.ok;

type AttemptParams = {
  apiKey: string;
  apiVersion: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json: boolean;
  temperature: number;
  compatibilityMode?: boolean;
};

const attemptGenerateContent = async ({
  apiKey,
  apiVersion,
  model,
  systemPrompt,
  userPrompt,
  json,
  temperature,
  compatibilityMode = false,
}: AttemptParams): Promise<AttemptResult> => {
  const endpoint = `${GEMINI_API_HOST}/${apiVersion}/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = compatibilityMode
    ? {
        // For API versions/models that reject systemInstruction/responseMimeType.
        contents: [
          {
            role: "user",
            parts: [{ text: `System instructions:\n${systemPrompt}\n\nUser request:\n${userPrompt}` }],
          },
        ],
        generationConfig: { temperature },
      }
    : {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, body: await response.text() };
  }

  return { ok: true, data: await response.json() };
};

const listGenerateContentModels = async (
  apiKey: string,
  apiVersion: string,
): Promise<string[]> => {
  const endpoint = `${GEMINI_API_HOST}/${apiVersion}/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  return unique(
    (data.models ?? [])
      .filter((entry) => entry.supportedGenerationMethods?.includes("generateContent"))
      .map((entry) => (typeof entry.name === "string" ? normalizeModelName(entry.name) : "")),
  );
};

const extractGeneratedText = (data: any): string => {
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim()
    : "";

  if (!text) {
    throw new Error("[ai/gemini] returned empty content");
  }

  return text;
};

export const createGeminiProvider = ({
  apiKey,
  model,
  apiVersion,
  modelFallbacks,
}: GeminiProviderConfig): LlmProvider => ({
  name: "gemini",

  async complete({ systemPrompt, userPrompt, json, temperature }: LlmRequest) {
    if (!apiKey) {
      throw new Error("[ai/gemini] apiKey is required");
    }

    const requestedModel = normalizeModelName(model);
    if (!requestedModel) {
      throw new Error("[ai/gemini] model is required");
    }

    const resolvedTemperature = temperature ?? DEFAULT_TEMPERATURE;
    const wantJson = json ?? false;
    const apiVersions = unique([apiVersion ?? "", "v1", "v1beta"]);
    const staticFallbacks = unique([
      ...(modelFallbacks ?? []).map(normalizeModelName),
      ...DEFAULT_MODEL_FALLBACKS,
    ]);

    const attempted: string[] = [];
    let lastNotFound: string | null = null;

    for (const version of apiVersions) {
      const discovered = await listGenerateContentModels(apiKey, version);
      const candidates = unique([requestedModel, ...staticFallbacks, ...discovered]);

      for (const candidate of candidates) {
        const base: AttemptParams = {
          apiKey,
          apiVersion: version,
          model: candidate,
          systemPrompt,
          userPrompt,
          json: wantJson,
          temperature: resolvedTemperature,
        };

        let result = await attemptGenerateContent(base);

        if (isError(result) && isPayloadSchemaMismatchError(result.status, result.body)) {
          result = await attemptGenerateContent({ ...base, compatibilityMode: true });
        }

        if (isError(result) && isQuotaExhaustedError(result.status)) {
          for (let retry = 0; retry < MAX_QUOTA_RETRIES; retry += 1) {
            const waitSeconds =
              parseRetryDelaySeconds(result.body) ?? DEFAULT_RETRY_WAIT_SECONDS;
            await sleep(waitSeconds * 1000);
            result = await attemptGenerateContent(base);
            if (!(isError(result) && isQuotaExhaustedError(result.status))) {
              break;
            }
          }

          if (isError(result) && isQuotaExhaustedError(result.status)) {
            throw new Error(
              "[ai/gemini] rate limit exceeded. Wait a few minutes or check quota at https://ai.google.dev/gemini-api/docs/rate-limits",
            );
          }
        }

        if (result.ok) {
          return {
            rawText: extractGeneratedText(result.data),
            provider: "gemini",
            model: candidate,
            usage: {
              promptTokens: result.data?.usageMetadata?.promptTokenCount,
              completionTokens: result.data?.usageMetadata?.candidatesTokenCount,
              totalTokens: result.data?.usageMetadata?.totalTokenCount,
            },
          };
        }

        attempted.push(`${version}/${candidate}`);

        if (isModelNotFoundError(result.status, result.body)) {
          lastNotFound = `[ai/gemini] model unavailable on API ${version}: ${candidate}`;
          continue;
        }

        throw new Error(`[ai/gemini] request failed (${result.status}): ${result.body}`);
      }
    }

    const attemptsLabel = attempted.length ? ` Attempted: ${attempted.join(", ")}.` : "";
    throw new Error(
      `${lastNotFound ?? "[ai/gemini] no supported model for generateContent."}${attemptsLabel}`,
    );
  },
});
