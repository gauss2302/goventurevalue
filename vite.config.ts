import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const routerSsrServerShim = fileURLToPath(
  new URL("./src/lib/shims/tanstack-router-ssr-server.ts", import.meta.url),
);
const reactRouterSsrServerShim = fileURLToPath(
  new URL(
    "./src/lib/shims/tanstack-react-router-ssr-server.ts",
    import.meta.url,
  ),
);
const startStorageContextShim = fileURLToPath(
  new URL("./src/lib/shims/tanstack-start-storage-context.ts", import.meta.url),
);
const nodeAsyncHooksShim = fileURLToPath(
  new URL("./src/lib/shims/node-async-hooks.ts", import.meta.url),
);
const nodeStreamShim = fileURLToPath(
  new URL("./src/lib/shims/node-stream.ts", import.meta.url),
);
const nodeStreamWebShim = fileURLToPath(
  new URL("./src/lib/shims/node-stream-web.ts", import.meta.url),
);

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    // TanStack Start plugin should be first to generate virtual modules
    tanstackStart(),
    react(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: isSsrBuild
      ? []
      : [
          {
            find: "@tanstack/router-core/ssr/server",
            replacement: routerSsrServerShim,
          },
          {
            find: "@tanstack/react-router/ssr/server",
            replacement: reactRouterSsrServerShim,
          },
          {
            find: "@tanstack/start-storage-context",
            replacement: startStorageContextShim,
          },
          {
            find: /^node:async_hooks$/,
            replacement: nodeAsyncHooksShim,
          },
          {
            find: /^node:stream\/web$/,
            replacement: nodeStreamWebShim,
          },
          {
            find: /^node:stream$/,
            replacement: nodeStreamShim,
          },
          {
            find: /^stream\/web$/,
            replacement: nodeStreamWebShim,
          },
          {
            find: /^stream$/,
            replacement: nodeStreamShim,
          },
        ],
  },
  esbuild: {
    jsx: "automatic" as const,
  },
  optimizeDeps: {
    exclude: [
      "#tanstack-router-entry",
      "#tanstack-start-entry",
      "tanstack-start-manifest:v",
      "tanstack-start-injected-head-scripts:v",
    ],
    esbuildOptions: {
      jsx: "automatic" as const,
    },
  },
  ssr: {
    noExternal: ["@tanstack/react-start"],
  },
}));
