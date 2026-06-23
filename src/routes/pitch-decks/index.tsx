import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubTitle } from "@/components/ui/typography";
import { AppShell, PageContainer, PageHeader, EmptyState, LoadingState, ErrorState } from "@/components/layout";
import { usePageMotion } from "@/lib/motion";
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

const statusBadgeVariant: Record<
  PresentationStatus,
  "secondary" | "info" | "success" | "destructive"
> = {
  draft: "secondary",
  generating: "info",
  ready: "success",
  failed: "destructive",
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
  const { container, item } = usePageMotion();

  if (isPending) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <LoadingState message="Loading your pitch decks…" />
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !decks) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <ErrorState message="We couldn't load your pitch decks. Please refresh the page." />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <div className="space-y-[var(--space-6)]">
          <PageHeader
            eyebrow="Studio"
            title="Pitch Decks"
            description="Generate and manage investor-ready pitch decks."
            actions={
              <Button variant="brand" asChild>
                <Link to={"/pitch-decks/new" as any}>New Pitch Deck</Link>
              </Button>
            }
          />

          {decks.length === 0 ? (
            <EmptyState
              icon={Presentation}
              title="No pitch decks yet"
              description="Create your first investor-ready deck with AI in a few minutes. Add your brief, pick a style, and get a full 10-slide presentation you can edit and export."
              action={
                <Button variant="brand" asChild>
                  <Link to={"/pitch-decks/new" as any}>Create your first deck</Link>
                </Button>
              }
            />
          ) : (
            <motion.div
              className="grid gap-[var(--space-4)] md:grid-cols-2 xl:grid-cols-3"
              variants={container}
              initial="hidden"
              animate="visible"
            >
              {decks.map((deck) => (
                <motion.div key={deck.id} variants={item}>
                  <Link
                    to={"/pitch-decks/$deckId" as any}
                    params={{ deckId: String(deck.id) } as any}
                    className="group block h-full rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-5)] shadow-[var(--card-shadow)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-primary)_35%,var(--border-soft))] hover:shadow-[var(--card-shadow-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={statusBadgeVariant[deck.status] ?? "secondary"} className="capitalize">
                        {deck.status}
                      </Badge>
                      <span className="text-[var(--text-caption2)] uppercase tracking-[0.1em] text-[var(--brand-muted)]">
                        {deck.provider}
                      </span>
                    </div>
                    <SubTitle className="mt-[var(--space-3)] line-clamp-2 transition-colors group-hover:text-[var(--brand-primary-hover)]">
                      {deck.title}
                    </SubTitle>
                    <p className="mt-1 text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                      {deck.startupName}
                    </p>
                    <p className="mt-[var(--space-4)] text-[var(--text-caption1)] text-[var(--brand-muted)]">
                      Updated {new Date(deck.updatedAt).toLocaleString()}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
