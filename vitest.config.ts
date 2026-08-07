import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

/**
 * Vitest runs against its own config on purpose.
 *
 * The main vite.config.ts loads @cloudflare/vite-plugin, which opens a remote
 * proxy session because the Workers AI binding cannot be emulated locally. That
 * requires CLOUDFLARE_API_TOKEN and network access — neither of which a unit
 * test should need.
 *
 * Consequence to respect when writing tests: anything importing
 * `cloudflare:workers` (src/lib/env.ts, src/db/index.ts, src/lib/auth/server.ts)
 * will not resolve here. Those modules are covered by integration testing
 * against a real Worker, not by unit tests. Keep pure logic — the Signal
 * contract, calculations, normalization — free of Worker imports so it stays
 * testable in isolation.
 */
export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] })],
  resolve: {
    alias: {
      // Stands in for the virtual module, modelling "running outside a Worker".
      "cloudflare:workers": new URL(
        "./src/test/cloudflare-workers-stub.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
