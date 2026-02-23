// Client-build shim for server-only TanStack Router SSR helpers.
// These APIs should never execute in the browser bundle.
export const createRequestHandler = () => {
  throw new Error("Server-only module imported in client build.");
};

export const defineHandlerCallback = <T>(callback: T) => callback;

export const transformPipeableStreamWithRouter = <T>(_: unknown, stream: T) =>
  stream;
export const transformStreamWithRouter = <T>(_: unknown, stream: T) => stream;
export const transformReadableStreamWithRouter = <T>(_: unknown, stream: T) =>
  stream;

export const attachRouterServerSsrUtils = () => {};
export const getNormalizedURL = (url: string) => new URL(url, "http://localhost");
export const getOrigin = (url: string) => new URL(url, "http://localhost").origin;
