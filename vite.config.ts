import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  plugins: [
    // The Cloudflare plugin must come first — it owns the SSR environment that
    // tanstackStart() then builds into. Order here is load-bearing.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
  ],
  esbuild: {
    jsx: "automatic" as const,
  },
  optimizeDeps: {
    exclude: [
      "#tanstack-router-entry",
      "#tanstack-start-entry",
      "tanstack-start-manifest:v",
      "tanstack-start-injected-head-scripts:v",
      // node-postgres is resolved through nodejs_compat at runtime, not prebundled.
      "pg",
    ],
    esbuildOptions: {
      jsx: "automatic" as const,
    },
  },
  ssr: {
    noExternal: ["@tanstack/react-start"],
  },
}));
