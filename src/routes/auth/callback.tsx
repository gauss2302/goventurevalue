import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSessionWithMock } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const router = useRouter();
  const { data: session, isPending } = useSessionWithMock();
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
        router.navigate({ to: "/dashboard" });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {error ? (
          <>
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Error</h2>
            <p className="text-slate-300 mb-4">{error}</p>
            <p className="text-slate-400 text-sm">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Completing authentication...</h2>
            <p className="text-slate-300">Please wait while we sign you in.</p>
          </>
        )}
      </div>
    </div>
  );
}
