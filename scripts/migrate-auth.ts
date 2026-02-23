import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import path from "node:path";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const writeStdout = (message: string) => process.stdout.write(`${message}\n`);
const writeStderr = (message: string) => process.stderr.write(`${message}\n`);

const run = async () => {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    writeStdout(`Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    writeStdout("Migrations completed.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  writeStderr(
    `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
