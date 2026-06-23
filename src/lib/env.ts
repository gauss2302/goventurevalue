import { env as workerEnv } from "cloudflare:workers";

const readBinding = (key: string): string | null => {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) {
    return fromProcess;
  }

  const fromWorker = (workerEnv as unknown as Record<string, unknown>)[key];
  if (typeof fromWorker === "string") {
    const trimmed = fromWorker.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
};

export const getOptionalEnv = (key: string): string | null => readBinding(key);

export const requireEnv = (key: keyof Env): string => {
  const value = readBinding(key);
  if (!value) {
    throw new Error(`[Env] Missing required environment variable: ${key}`);
  }
  return value;
};
