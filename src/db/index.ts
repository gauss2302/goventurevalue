import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";
import { logger } from "@/lib/logger";

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const resolveDatabaseUrl = () => {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    logger.warn("[DB] DATABASE_URL is not set. Using local development fallback.");
    return DEFAULT_LOCAL_DATABASE_URL;
  }

  throw new Error("[DB] Missing required environment variable: DATABASE_URL");
};

const connectionString = resolveDatabaseUrl();

// Create database pool
const pool = new Pool({
  connectionString,
  // Connection pool settings for better reliability
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle connection errors gracefully
pool.on("error", (err) => {
  logger.error("Unexpected error on idle database client", err);
});

// Create drizzle instance
export const db = drizzle(pool, { schema });
export { pool };
