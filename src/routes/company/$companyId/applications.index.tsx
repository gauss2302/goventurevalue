import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/company/$companyId/applications/")({
  component: NoApplicationSelected,
});

function NoApplicationSelected() {
  return (
    <Card className="flex h-full min-h-[280px] items-center justify-center p-10 text-center">
      <div>
        <p className="font-semibold text-[var(--brand-ink)]">Pick an application</p>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          The list is ordered by how soon each reply is due.
        </p>
      </div>
    </Card>
  );
}
