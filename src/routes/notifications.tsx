import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { listMyNotifications, markNotificationsReadFn } from "@/lib/server/candidateFns";

export const Route = createFileRoute("/notifications")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async () => listMyNotifications(),
  component: Notifications,
});

/**
 * Everything we have told this person.
 *
 * Deliberately short and dull. Every entry corresponds to a fact that changed —
 * a reply arrived, a deadline passed, a warning was issued. There is nothing here
 * that exists to create engagement, because a notification that says nothing
 * trains people to ignore the ones that matter (§3.2).
 */
function Notifications() {
  const { notifications, unread } = Route.useLoaderData();
  const marked = useRef(false);

  // Marked read after rendering, so the unread markers on what just arrived are
  // visible on this visit.
  useEffect(() => {
    if (marked.current || unread === 0) {
      return;
    }
    marked.current = true;
    // Deliberately no `invalidate()` afterwards: re-rendering would strip the
    // "New" badges off the very things the person came here to read.
    void markNotificationsReadFn().catch(() => undefined);
  }, [unread]);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10">
      <h1
        className="text-[var(--text-title1)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">Nothing to tell you</p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            You will hear from us when a company replies, or when one misses the deadline it
            committed to. Not otherwise.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((item) => {
            const body = (
              <Card
                className="p-4 transition-colors hover:border-[var(--brand-primary)]/40"
                style={
                  item.readAt
                    ? undefined
                    : { borderColor: "color-mix(in srgb, var(--brand-primary) 35%, transparent)" }
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--brand-ink)]">
                    {item.title}
                  </span>
                  {!item.readAt && <Badge variant="brand">New</Badge>}
                  <span className="text-xs text-[var(--brand-muted)]">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {item.body && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--brand-muted)]">
                    {item.body}
                  </p>
                )}
              </Card>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link to={item.href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
