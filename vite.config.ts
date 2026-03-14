import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  plugins: [
    tanstackStart(),
    react(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
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
