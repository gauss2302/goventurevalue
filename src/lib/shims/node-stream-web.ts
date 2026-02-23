type NodeStreamWebModule = Record<string, unknown>;

let nodeStreamWeb: NodeStreamWebModule | null = null;

if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    nodeStreamWeb = require("node:stream/web") as NodeStreamWebModule;
  } catch {
    nodeStreamWeb = null;
  }
}

const webGlobals = globalThis as Record<string, unknown>;

const FallbackWebClass = class {};

const pickClass = <T>(name: string): T =>
  (nodeStreamWeb?.[name] as T | undefined) ??
  (webGlobals[name] as T | undefined) ??
  (FallbackWebClass as unknown as T);

export const ReadableStream = pickClass<typeof globalThis.ReadableStream>(
  "ReadableStream",
);
export const WritableStream = pickClass<typeof globalThis.WritableStream>(
  "WritableStream",
);
export const TransformStream = pickClass<typeof globalThis.TransformStream>(
  "TransformStream",
);
export const ReadableStreamBYOBReader = pickClass("ReadableStreamBYOBReader");
export const ReadableStreamBYOBRequest = pickClass(
  "ReadableStreamBYOBRequest",
);
export const ReadableByteStreamController = pickClass(
  "ReadableByteStreamController",
);
export const ReadableStreamDefaultController = pickClass(
  "ReadableStreamDefaultController",
);
export const ReadableStreamDefaultReader = pickClass(
  "ReadableStreamDefaultReader",
);
export const TransformStreamDefaultController = pickClass(
  "TransformStreamDefaultController",
);
export const WritableStreamDefaultController = pickClass(
  "WritableStreamDefaultController",
);
export const WritableStreamDefaultWriter = pickClass(
  "WritableStreamDefaultWriter",
);
export const ByteLengthQueuingStrategy = pickClass(
  "ByteLengthQueuingStrategy",
);
export const CountQueuingStrategy = pickClass("CountQueuingStrategy");
export const TextEncoderStream = pickClass("TextEncoderStream");
export const TextDecoderStream = pickClass("TextDecoderStream");
export const CompressionStream = pickClass("CompressionStream");
export const DecompressionStream = pickClass("DecompressionStream");

const fallbackModule = {
  ReadableStream,
  WritableStream,
  TransformStream,
  ReadableStreamBYOBReader,
  ReadableStreamBYOBRequest,
  ReadableByteStreamController,
  ReadableStreamDefaultController,
  ReadableStreamDefaultReader,
  TransformStreamDefaultController,
  WritableStreamDefaultController,
  WritableStreamDefaultWriter,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
  TextEncoderStream,
  TextDecoderStream,
  CompressionStream,
  DecompressionStream,
};

export default nodeStreamWeb ?? fallbackModule;
