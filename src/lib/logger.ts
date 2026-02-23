const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

type LogMethod = (...args: unknown[]) => void;

const noop: LogMethod = () => {};

const devConsole = typeof console !== "undefined" ? console : ({} as Console);

export const log: LogMethod = isDev ? devConsole.log.bind(console) : noop;
export const debug: LogMethod = isDev ? devConsole.debug?.bind(console) || devConsole.log.bind(console) : noop;
export const info: LogMethod = isDev ? devConsole.info?.bind(console) || devConsole.log.bind(console) : noop;
export const warn: LogMethod = isDev ? devConsole.warn?.bind(console) || devConsole.log.bind(console) : noop;
export const error: LogMethod = isDev ? devConsole.error?.bind(console) || devConsole.log.bind(console) : noop;

export const logger = {
  log,
  debug,
  info,
  warn,
  error,
};

