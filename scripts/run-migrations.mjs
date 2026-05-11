/**
 * Apply Drizzle SQL migrations (drizzle/*.sql + meta/_journal.json).
 * Used in Docker before srvx; requires DATABASE_URL and no devDependencies.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "node:path";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const pool = new Pool({ connectionString });
const db = drizzle(pool);

try {
  console.log(`[migrate] Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] Done.");
} catch (err) {
  console.error("[migrate] Failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (process.exitCode === 1) {
  process.exit(1);
}
