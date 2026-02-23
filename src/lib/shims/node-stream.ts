type AnyFn = (...args: Array<unknown>) => unknown;

type NodeStreamModule = {
  Stream?: new (...args: Array<unknown>) => unknown;
  Readable?: {
    new (...args: Array<unknown>): unknown;
    fromWeb?<T>(stream: T): T;
    toWeb?<T>(stream: T): T;
  };
  Writable?: {
    new (...args: Array<unknown>): unknown;
    fromWeb?<T>(stream: T): T;
    toWeb?<T>(stream: T): T;
  };
  Duplex?: new (...args: Array<unknown>) => unknown;
  Transform?: new (...args: Array<unknown>) => unknown;
  PassThrough?: new (...args: Array<unknown>) => unknown;
  addAbortSignal?: AnyFn;
  compose?: AnyFn;
  destroy?: AnyFn;
  finished?: AnyFn;
  isDestroyed?: AnyFn;
  isDisturbed?: AnyFn;
  isErrored?: AnyFn;
  isReadable?: AnyFn;
  isWritable?: AnyFn;
  pipeline?: AnyFn;
  getDefaultHighWaterMark?: AnyFn;
  setDefaultHighWaterMark?: AnyFn;
  promises?: {
    finished?: AnyFn;
    pipeline?: AnyFn;
  };
};

let nodeStream: NodeStreamModule | null = null;

if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    nodeStream = require("node:stream") as NodeStreamModule;
  } catch {
    nodeStream = null;
  }
}

class StreamFallback {
  destroyed = false;

  pipe() {
    return this;
  }

  on() {
    return this;
  }

  once() {
    return this;
  }

  destroy() {
    this.destroyed = true;
    return this;
  }
}

class ReadableFallback extends StreamFallback {
  static fromWeb<T>(stream: T): T {
    return stream;
  }

  static toWeb<T>(stream: T): T {
    return stream;
  }
}

class WritableFallback extends StreamFallback {
  static fromWeb<T>(stream: T): T {
    return stream;
  }

  static toWeb<T>(stream: T): T {
    return stream;
  }
}

class DuplexFallback extends ReadableFallback {}

class TransformFallback extends DuplexFallback {}

class PassThroughFallback extends TransformFallback {}

const addAbortSignalFallback = <T>(_: unknown, stream: T): T => stream;

const composeFallback = (...streams: Array<unknown>) =>
  streams[0] ?? new PassThroughFallback();

const destroyFallback = (stream: unknown) => stream;

const finishedFallback = (...args: Array<unknown>) => {
  const callback = args[args.length - 1];
  if (typeof callback === "function") {
    (callback as (error?: unknown) => void)(undefined);
  }
};

const pipelineFallback = (...args: Array<unknown>) => {
  const callback = args[args.length - 1];
  if (typeof callback === "function") {
    (callback as (error?: unknown) => void)(undefined);
  }
  return args.find((value) => value instanceof PassThroughFallback);
};

const falseFallback = () => false;

const getDefaultHighWaterMarkFallback = () => 0;

const setDefaultHighWaterMarkFallback = () => undefined;

const promisesFallback = {
  finished: async () => undefined,
  pipeline: async (...streams: Array<unknown>) =>
    streams[0] ?? new PassThroughFallback(),
};

export const Stream = nodeStream?.Stream ?? StreamFallback;
export const Readable = nodeStream?.Readable ?? ReadableFallback;
export const Writable = nodeStream?.Writable ?? WritableFallback;
export const Duplex = nodeStream?.Duplex ?? DuplexFallback;
export const Transform = nodeStream?.Transform ?? TransformFallback;
export const PassThrough = nodeStream?.PassThrough ?? PassThroughFallback;
export const addAbortSignal = nodeStream?.addAbortSignal ?? addAbortSignalFallback;
export const compose = nodeStream?.compose ?? composeFallback;
export const destroy = nodeStream?.destroy ?? destroyFallback;
export const finished = nodeStream?.finished ?? finishedFallback;
export const isDestroyed = nodeStream?.isDestroyed ?? falseFallback;
export const isDisturbed = nodeStream?.isDisturbed ?? falseFallback;
export const isErrored = nodeStream?.isErrored ?? falseFallback;
export const isReadable = nodeStream?.isReadable ?? falseFallback;
export const isWritable = nodeStream?.isWritable ?? falseFallback;
export const pipeline = nodeStream?.pipeline ?? pipelineFallback;
export const getDefaultHighWaterMark =
  nodeStream?.getDefaultHighWaterMark ?? getDefaultHighWaterMarkFallback;
export const setDefaultHighWaterMark =
  nodeStream?.setDefaultHighWaterMark ?? setDefaultHighWaterMarkFallback;
export const promises = nodeStream?.promises ?? promisesFallback;

const fallbackModule = {
  Stream,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  addAbortSignal,
  compose,
  destroy,
  finished,
  isDestroyed,
  isDisturbed,
  isErrored,
  isReadable,
  isWritable,
  pipeline,
  getDefaultHighWaterMark,
  setDefaultHighWaterMark,
  promises,
};

export default nodeStream ?? fallbackModule;
