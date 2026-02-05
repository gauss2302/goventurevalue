import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // TanStack Start plugin should be first to generate virtual modules
    tanstackStart(),
    react(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
  ],
  esbuild: {
    jsx: "automatic",
  },
  optimizeDeps: {
    exclude: [
      "#tanstack-router-entry",
      "#tanstack-start-entry",
      "tanstack-start-manifest:v",
      "tanstack-start-injected-head-scripts:v",
    ],
    esbuildOptions: {
      jsx: "automatic",
    },
  },
  ssr: {
    noExternal: ["@tanstack/react-start"],
  },
});
