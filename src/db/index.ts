/**
 * Per-request database access.
 *
 * The previous product created a module-scope `Pool` from `process.env`. That
 * cannot work on Workers: the Hyperdrive binding only exists inside a request
 * context, so a module-scope connection throws at import time
 * (docs/PRODUCT_PLAN.md §5.3, blocker #1).
 *
 * Hyperdrive already pools connections at the edge, so a Worker wants a single
 * `Client` per request rather than a pool of its own. The client is closed after
 * the response via `waitUntil`, which keeps teardown off the response path.
 */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { waitUntil } from "cloudflare:workers";

import * as schema from "./schema";
import { getConnectionString } from "@/lib/env";
import { logger } from "@/lib/logger";

export type Database = NodePgDatabase<typeof schema>;

export { schema };

export type DbHandle = {
  db: Database;
  /** Closes the underlying connection. Safe to call more than once. */
  close: () => Promise<void>;
};

/**
 * Opens a connection and returns a Drizzle handle.
 *
 * Prefer {@link withDb}, which cannot leak the connection. Use this directly
 * only when the caller genuinely owns the connection lifetime — a Queue
 * consumer processing a batch, for example.
 */
export const openDb = async (): Promise<DbHandle> => {
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();

  let closed = false;
  const close = async () => {
    if (closed) {
      return;
    }
    closed = true;
    try {
      await client.end();
    } catch (error) {
      // A failed teardown must never surface as a request error.
      logger.error("[db] failed to close connection", error);
    }
  };

  return { db: drizzle(client, { schema }), close };
};

/**
 * Runs `fn` with a database handle, always closing the connection afterwards.
 *
 * Teardown is handed to `waitUntil` so the response is not held up by it. If
 * `waitUntil` is unavailable (tests, local tooling) the close is awaited
 * inline instead.
 */
export const withDb = async <T>(fn: (db: Database) => Promise<T>): Promise<T> => {
  const { db, close } = await openDb();

  try {
    return await fn(db);
  } finally {
    try {
      waitUntil(close());
    } catch {
      await close();
    }
  }
};
