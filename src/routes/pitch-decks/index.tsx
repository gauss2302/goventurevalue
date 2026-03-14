import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import type { PresentationStatus } from "@/lib/dto";

const loadPitchDecks = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    { pitchDecks },
    { eq, desc },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/server"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const decks = await db.query.pitchDecks.findMany({
    where: eq(pitchDecks.userId, session.user.id),
    orderBy: [desc(pitchDecks.updatedAt)],
  });

  return decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    startupName: deck.startupName,
    status: deck.status,
    provider: deck.provider,
    updatedAt: deck.updatedAt,
    createdAt: deck.createdAt,
  }));
});

const pitchDecksQueryOptions = () => ({
  queryKey: ["pitch-decks"] as const,
  queryFn: () => loadPitchDecks() as Promise<
    Array<{
      id: number;
      title: string;
      startupName: string;
      status: PresentationStatus;
      provider: string;
      updatedAt: Date;
      createdAt: Date;
    }>
  >,
  staleTime: 60 * 1000,
});

const statusClassName: Record<PresentationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/pitch-decks/")({
  loader: async ({ location, context }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);
    await context.queryClient.prefetchQuery(pitchDecksQueryOptions());
    return null;
  },
  component: PitchDecksPage,
});

function PitchDecksPage() {
  const { data: decks, isPending, error } = useQuery(pitchDecksQueryOptions());

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-[var(--brand-muted)]">Loading pitch decks...</div>
      </div>
    );
  }

  if (error || !decks) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-red-600">
          Failed to load pitch decks. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1200px] mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">Studio</p>
              <h1 className="text-3xl font-[var(--font-display)]">Pitch Decks</h1>
              <p className="text-sm text-[var(--brand-muted)] mt-1">
                Generate and manage investor-ready pitch decks.
              </p>
            </div>
            <Link
              to={"/pitch-decks/new" as any}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold"
            >
              New Pitch Deck
            </Link>
          </div>

          {decks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--border-soft)] p-12 text-center shadow-[var(--card-shadow)]">
              <div className="max-w-sm mx-auto">
                <h2 className="text-xl font-[var(--font-display)] text-[var(--brand-ink)]">No pitch decks yet</h2>
                <p className="text-sm text-[var(--brand-muted)] mt-2 leading-relaxed">
                  Create your first investor-ready deck with AI in a few minutes. Add your brief, pick a style, and get a full 10-slide presentation you can edit and export.
                </p>
                <Link
                  to={"/pitch-decks/new" as any}
                  className="inline-flex items-center justify-center mt-6 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
                >
                  Create your first deck
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {decks.map((deck) => (
                <Link
                  key={deck.id}
                  to={"/pitch-decks/$deckId" as any}
                  params={{ deckId: String(deck.id) } as any}
                  className="bg-white rounded-2xl border border-[var(--border-soft)] p-5 shadow-[var(--card-shadow)] hover:border-[var(--brand-primary)]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusClassName[deck.status] || statusClassName.draft}`}>
                      {deck.status}
                    </span>
                    <span className="text-xs text-[var(--brand-muted)] uppercase">{deck.provider}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-[var(--font-display)] text-[var(--brand-ink)] line-clamp-2">
                    {deck.title}
                  </h3>
                  <p className="text-sm text-[var(--brand-muted)] mt-1">{deck.startupName}</p>
                  <p className="text-xs text-[var(--brand-muted)] mt-4">
                    Updated {new Date(deck.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
