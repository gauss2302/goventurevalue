import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const journalPath = path.resolve(migrationsFolder, "meta", "_journal.json");

const readJournal = (): { entries?: Array<{ tag: string }> } | null => {
  if (!fs.existsSync(journalPath)) return null;
  const contents = fs.readFileSync(journalPath, "utf-8");
  return JSON.parse(contents) as { entries?: Array<{ tag: string }> };
};

const dropJournalTag = (tag: string) => {
  const journal = readJournal();
  if (!journal?.entries?.some((entry) => entry.tag === tag)) {
    return;
  }

  journal.entries = journal.entries.filter((entry) => entry.tag !== tag);
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n");
};

const run = async () => {
  // If a migration file was removed after being applied, drop it from the journal
  // so Drizzle doesn't try to re-run the removed file later.
  dropJournalTag("0006_boring_black_bird");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    process.stdout.write(`Running migrations from: ${migrationsFolder}\n`);
    await migrate(db, { migrationsFolder });
    process.stdout.write("Migrations completed.\n");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  process.stderr.write(
    `Migration failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
