import { DEFAULT_TEMPERATURE, type LlmProvider, type LlmRequest } from "@/lib/ai/types";

export type OpenAiProviderConfig = {
  apiKey: string;
  model: string;
};

export const createOpenAiProvider = ({ apiKey, model }: OpenAiProviderConfig): LlmProvider => ({
  name: "openai",

  async complete({ systemPrompt, userPrompt, json, temperature }: LlmRequest) {
    if (!apiKey) {
      throw new Error("[ai/openai] apiKey is required");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: temperature ?? DEFAULT_TEMPERATURE,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`[ai/openai] request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("[ai/openai] returned empty content");
    }

    return {
      rawText: content,
      provider: "openai",
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    };
  },
});
