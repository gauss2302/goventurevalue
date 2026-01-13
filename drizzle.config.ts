import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const nodeEnv = process.env.NODE_ENV?.trim();
const envFiles = [
  nodeEnv ? `.env.${nodeEnv}.local` : null,
  nodeEnv ? `.env.${nodeEnv}` : null,
  ".env.local",
  ".env",
].filter(Boolean) as string[];

for (const envFile of envFiles) {
  const fullPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: false });
  }
}

const parseList = (value?: string) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;

const parseBoolean = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const schema = parseList(process.env.DRIZZLE_SCHEMA) ?? ["./src/db/schema.ts"];
const out = process.env.DRIZZLE_OUT ?? "./drizzle";
const tablesFilter = parseList(process.env.DRIZZLE_TABLES_FILTER);
const schemaFilter = parseList(process.env.DRIZZLE_SCHEMA_FILTER);
const casing = process.env.DRIZZLE_CASING as
  | "camelCase"
  | "snake_case"
  | undefined;
const introspectCasing = process.env.DRIZZLE_INTROSPECT_CASING as
  | "camel"
  | "preserve"
  | undefined;
const verbose = parseBoolean(process.env.DRIZZLE_VERBOSE);
const strict = parseBoolean(process.env.DRIZZLE_STRICT);
const breakpoints = parseBoolean(process.env.DRIZZLE_BREAKPOINTS);
const migrationsTable = process.env.DRIZZLE_MIGRATIONS_TABLE;
const migrationsSchema = process.env.DRIZZLE_MIGRATIONS_SCHEMA;
const migrationsPrefix = process.env.DRIZZLE_MIGRATIONS_PREFIX as
  | "index"
  | "timestamp"
  | "supabase"
  | "unix"
  | "none"
  | undefined;

const migrations =
  migrationsTable || migrationsSchema || migrationsPrefix
    ? {
        table: migrationsTable,
        schema: migrationsSchema,
        prefix: migrationsPrefix,
      }
    : undefined;

export default defineConfig({
  out,
  schema,
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  ...(tablesFilter ? { tablesFilter } : {}),
  ...(schemaFilter ? { schemaFilter } : {}),
  ...(casing ? { casing } : {}),
  ...(introspectCasing ? { introspect: { casing: introspectCasing } } : {}),
  ...(typeof verbose === "boolean" ? { verbose } : {}),
  ...(typeof strict === "boolean" ? { strict } : {}),
  ...(typeof breakpoints === "boolean" ? { breakpoints } : {}),
  ...(migrations ? { migrations } : {}),
});
