import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";

// Get connection string with fallback for development
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

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
  console.error("Unexpected error on idle database client", err);
});

// Create drizzle instance
export const db = drizzle(pool, { schema });
export { pool };
