import { createFileRoute, Link } from "@tanstack/react-router";

import { BRAND, SLA_RESPONSE_DAYS, WEEKLY_APPLICATION_LIMIT } from "@/config/brand";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * Placeholder landing page.
 *
 * The real candidate-facing product arrives in Phase 4 (docs/PRODUCT_PLAN.md §7);
 * signed-in redirects land here too until the dashboards exist. What this page
 * does carry already is the promise itself, because the promise is the product
 * and every later screen has to stay consistent with it.
 */
function Home() {
  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-2xl text-center">
          <p className="text-sm uppercase tracking-widest text-[var(--brand-muted)] mb-6">
            {BRAND.name}
          </p>

          <h1
            className="text-[var(--brand-ink)] mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1.05,
            }}
          >
            {BRAND.tagline}
          </h1>

          <p className="text-lg text-[var(--brand-muted)] mb-4">{BRAND.promise}</p>

          <p className="text-sm text-[var(--brand-muted)] mb-10">
            Companies accept a {SLA_RESPONSE_DAYS}-day reply commitment and we publish how
            well they keep it. Candidates get {WEEKLY_APPLICATION_LIMIT} applications a week —
            the cap is what makes the commitment possible.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild>
              <Link to="/auth/signup">Create an account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth/signin">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
