import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const isTest = process.env.VITEST === "true";
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  plugins: [
    ...(isTest
      ? []
      : [cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart()]),
    react(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
  ],
  test: {
    environment: "jsdom",
    alias: {
      "cloudflare:workers": path.resolve(
        rootDir,
        "src/test/mocks/cloudflare-workers.ts",
      ),
    },
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
