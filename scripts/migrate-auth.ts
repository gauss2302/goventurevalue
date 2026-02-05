import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "node:path";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

const run = async () => {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    console.log("Running migrations from:", migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
