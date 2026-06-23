import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

const getSafeNextPath = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (value.includes("://")) return null;
  if (value.startsWith("/auth")) return null;
  return value;
};

const getNextFromLocation = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return getSafeNextPath(urlParams.get("next"));
};

function AuthCallback() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    
    if (errorParam) {
      setError("Authentication failed. Please try again.");
      // Redirect to signin after showing error
      setTimeout(() => {
        router.navigate({ to: "/auth/signin" });
      }, 3000);
      return;
    }

    // Wait for session to be loaded
    if (!isPending) {
      if (session) {
        // Successfully authenticated, redirect to dashboard
        const next = getNextFromLocation();
        router.navigate({ to: next || "/dashboard" });
      } else {
        // No session after callback, might be an error
        setError("Authentication failed. Please try again.");
        setTimeout(() => {
          router.navigate({ to: "/auth/signin" });
        }, 3000);
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--page)] px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.03]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-primary)_14%,transparent),transparent_70%)] blur-3xl" />
      <div className="relative w-full max-w-md text-center">
        {error ? (
          <>
            <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-[var(--destructive)]">
              <svg
                className="size-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold text-[var(--brand-ink)]">Authentication Error</h2>
            <p className="mb-4 text-[var(--brand-muted)]">{error}</p>
            <p className="text-sm text-[var(--brand-muted)]">Redirecting to sign in…</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
            <h2 className="font-display mb-2 text-2xl font-bold text-[var(--brand-ink)]">Completing authentication…</h2>
            <p className="text-[var(--brand-muted)]">Please wait while we sign you in.</p>
          </>
        )}
      </div>
    </div>
  );
}
