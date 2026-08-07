# Startup Jobs

Job search platform for startups, hosted on Cloudflare Workers.

**Product name is still open** — see `docs/PRODUCT_PLAN.md` §11.1. Every user-visible
brand string lives in `src/config/brand.ts`, so renaming is a single edit.

## Documents

- **`docs/PRODUCT_PLAN.md`** — product and technical plan. Read §0 first: it records
  the decisions that are settled and must not be relitigated. §3 explains the core
  mechanism (the response promise), §6.4 the data honesty contract, §6.5 automoderation.
- **`docs/PHASE_0.md`** — platform spike results: what is verified, and what still
  needs a Cloudflare account. Read before assuming anything about deployment.
- **`docs/design-system.md`**, **`docs/tokens.json`** — design tokens, carried over.

## Stack

TanStack Start (React 19) on Cloudflare Workers · Supabase Postgres via Hyperdrive ·
Drizzle ORM · pgvector for matching · Better Auth · R2 / KV / Queues / Workers AI

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in BETTER_AUTH_SECRET and Google OAuth
pnpm dev
```

`pnpm dev` needs `CLOUDFLARE_API_TOKEN`: the Workers AI binding cannot be emulated
locally, so the Vite plugin opens a remote session. See `docs/PHASE_0.md`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (needs a Cloudflare token, see above) |
| `pnpm build` | Build the Worker bundle |
| `pnpm deploy` | Build and `wrangler deploy` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests. Integration tests skip without `DATABASE_URL` |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` — run after editing `wrangler.jsonc` |
| `pnpm db:generate` | Generate a migration from the Drizzle schema |
| `pnpm db:migrate` | Apply migrations |

## Database

```bash
createdb startup_jobs
psql -d startup_jobs -f drizzle/0000_clumsy_starfox.sql
DATABASE_URL=postgresql://localhost/startup_jobs pnpm vitest run src/db
```

The baseline migration begins with a hand-added `CREATE EXTENSION IF NOT EXISTS vector;`
— `drizzle-kit` does not emit extension statements, so keep that line at the top.

## Conventions worth knowing before editing

- **Never read `process.env` or a binding at module scope.** The Hyperdrive binding only
  exists inside a request context. Use the accessors in `src/lib/env.ts`, and `withDb` /
  `withAuth` for database and auth work.
- **Company numbers are `Signal<T>`, never `number | null`.** Render them through
  `SignalValue`, and always pass the output of `publicView(...)`. This is what keeps the
  honesty contract (§6.4) structural instead of a code-review habit.
- **Keep pure logic free of `cloudflare:workers` imports** so it stays unit-testable;
  `vitest` stubs that module rather than emulating a Worker.
