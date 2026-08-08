import { getRequestHeaders } from "@tanstack/react-start/server";

import type { Database } from "@/db/index";
import { withAuthDb } from "@/lib/auth/server";
import { loadActor, type Actor } from "@/lib/company/context";

/**
 * Request context for company-side server functions.
 *
 * One database connection per request serves both the session lookup and the
 * work that follows (§5.6: Supabase direct connections are scarce), and the
 * actor is resolved once so every capability check in the request sees the same
 * membership set.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Sign in required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type RequestContext = {
  db: Database;
  actor: Actor;
  user: { id: string; name: string; email: string; image?: string | null };
};

export const withRequestContext = async <T>(
  fn: (ctx: RequestContext) => Promise<T>,
): Promise<T> =>
  withAuthDb(async ({ auth, db }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });

    if (!session?.user) {
      throw new UnauthorizedError();
    }

    const actor = await loadActor(db, session.user.id);

    return fn({
      db,
      actor,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });
  });
