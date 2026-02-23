const isDevelopment =
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

type LogMethod = (...args: unknown[]) => void;

const noop: LogMethod = () => {};

const bindConsole = (method: keyof Console): LogMethod => {
  if (typeof console === "undefined") {
    return noop;
  }

  const target = console[method] as unknown;
  if (typeof target === "function") {
    return (...args) => {
      (target as (...params: unknown[]) => unknown).apply(console, args);
    };
  }

  if (typeof console.log === "function") {
    return console.log.bind(console);
  }

  return noop;
};

const logFallback: LogMethod = bindConsole("log");

export const log: LogMethod = isDevelopment ? logFallback : noop;
export const debug: LogMethod = isDevelopment
  ? bindConsole("debug")
  : noop;
export const info: LogMethod = bindConsole("info");
export const warn: LogMethod = bindConsole("warn");
export const error: LogMethod = bindConsole("error");

export const logger = {
  log,
  debug,
  info,
  warn,
  error,
};
