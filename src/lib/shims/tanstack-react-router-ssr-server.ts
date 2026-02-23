export * from "./tanstack-router-ssr-server";

const serverOnlyError = () =>
  new Error("Server-only @tanstack/react-router/ssr/server import in client build.");

export const RouterServer = () => {
  throw serverOnlyError();
};

export const defaultRenderHandler = () => {
  throw serverOnlyError();
};

export const defaultStreamHandler = () => {
  throw serverOnlyError();
};

export const renderRouterToStream = async () => {
  throw serverOnlyError();
};

export const renderRouterToString = async () => {
  throw serverOnlyError();
};
