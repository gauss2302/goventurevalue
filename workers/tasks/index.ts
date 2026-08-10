import { withDb } from "@/db/index";
import {
  handleBreach,
  handleCompanyReview,
  handleReminder,
  isTaskMessage,
  planSweep,
  type TaskMessage,
} from "@/lib/application/sweep";

/**
 * The tasks worker: cron triggers and queue consumers
 * (docs/PRODUCT_PLAN.md §5.4).
 *
 * A separate Worker from the app, for a reason that is easy to get wrong.
 * TanStack Start's `createServerEntry` returns `{ fetch }` and nothing else — a
 * `scheduled` or `queue` handler passed alongside it is silently dropped, so the
 * cron would appear configured and never run. Beyond that, §5.4 already wanted
 * this split: background work has a different CPU profile and must not inflate
 * the SSR worker's startup time.
 *
 * The app keeps the queue *producer* binding; this worker owns the consumers and
 * the schedules.
 *
 * Both handlers here are deliberately thin. Everything they call takes a
 * `Database` and is tested against a real Postgres without a Worker at all
 * (src/lib/application/sweep.ts) — the Worker contributes the trigger and the
 * bindings, not the logic.
 */

type Env = {
  TASKS_QUEUE: Queue<TaskMessage>;
};

/** Which schedule fired. One handler serves all of them, so it must dispatch. */
const SLA_SWEEP_CRON = "0 * * * *";
const INGEST_CRON = "0 3 * * *";
const REVERIFY_CRON = "0 4 * * *";

export default {
  /**
   * Finds work and enqueues it. Deliberately does not do the work.
   *
   * Its runtime is bounded by the size of the query, not by how much there is to
   * do, which is what stops it from one day running out of time half way through
   * and leaving the tail of the queue silently unprocessed.
   */
  async scheduled(event, env: Env, ctx) {
    switch (event.cron) {
      case SLA_SWEEP_CRON: {
        const now = new Date(event.scheduledTime);

        const plan = await withDb((db) => planSweep(db, now));

        for (const message of plan.messages) {
          ctx.waitUntil(env.TASKS_QUEUE.send(message));
        }

        // A capped sweep is reported, never silently truncated: "we processed
        // everything" and "we processed the first 500" must not look the same in
        // the logs.
        for (const note of plan.truncated) {
          console.warn(`[sweep] ${note}`);
        }

        console.log(
          `[sweep] queued ${plan.messages.length} task(s) at ${now.toISOString()}`,
        );
        return;
      }

      case INGEST_CRON:
      case REVERIFY_CRON:
        // Prospect ingest and role reverification arrive with the prospecting
        // engine (§7 Phase 2). The schedules are declared so the topology is
        // real, and saying so beats a silent no-op.
        console.log(`[cron] ${event.cron} has no handler yet`);
        return;

      default:
        console.warn(`[cron] unrecognised schedule ${event.cron}`);
    }
  },

  /**
   * Does one item of work per message.
   *
   * Queues deliver at least once, so every handler is idempotent and re-checks
   * its own precondition. `stale` is a success: it means the world moved between
   * enqueue and delivery, which is expected, not an error to retry.
   */
  async queue(batch, env: Env) {
    for (const message of batch.messages) {
      if (!isTaskMessage(message.body)) {
        // Unparseable messages will never become parseable. Retrying to the DLQ
        // is the only outcome that leaves evidence.
        console.error("[queue] unrecognised message", JSON.stringify(message.body));
        message.ack();
        continue;
      }

      const task = message.body;

      try {
        const outcome = await withDb(async (db) => {
          switch (task.kind) {
            case "sla.remind":
              return handleReminder(db, task);
            case "sla.breach":
              return handleBreach(db, task);
            case "company.review":
              return handleCompanyReview(db, task);
          }
        });

        if (outcome.status === "stale") {
          console.log(`[queue] ${task.kind} skipped: ${outcome.reason}`);
        } else if (outcome.follow) {
          for (const next of outcome.follow) {
            await env.TASKS_QUEUE.send(next);
          }
        }

        message.ack();
      } catch (error) {
        // Retried with backoff, then to the dead letter queue. Left visible
        // rather than swallowed: a task that silently gives up on telling a
        // candidate they were ignored is worse than a loud failure.
        console.error(`[queue] ${task.kind} failed`, error);
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
