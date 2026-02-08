import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { authClient, useSessionWithMock } from "@/lib/auth/client";

export const Route = createFileRoute("/auth/signin")({
  component: SignIn,
});

const getSafeNextPath = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("://")) return null;
  if (value.startsWith("/auth")) return null;
  return value;
};

const getNextFromLocation = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return getSafeNextPath(urlParams.get("next"));
};

function SignIn() {
  const router = useRouter();
  const { data: session } = useSessionWithMock();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (session) {
      const next = getNextFromLocation();
      router.navigate({ to: next || "/dashboard" });
    }
  }, [session, router]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam === "google_auth_failed") {
      setError("Google authentication failed. Please try again.");
      window.history.replaceState({}, "", "/auth/signin");
    }
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
      } else {
        const next = getNextFromLocation();
        router.navigate({ to: next || "/dashboard" });
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const next = getNextFromLocation() || "/dashboard";
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL: "/auth/signin?error=google_auth_failed",
      });

      if (result?.data?.url) {
        window.location.href = result.data.url;
      } else if (result?.error) {
        setIsGoogleLoading(false);
        setError(result.error.message || "Failed to sign in with Google");
      }
    } catch (err) {
      setIsGoogleLoading(false);
      setError("An error occurred with Google sign-in. Please try again.");
      console.error("Google sign-in error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.12),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-16 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(249,137,107,0.12),transparent_70%)] blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-8 shadow-[var(--card-shadow)]">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-3xl bg-[linear-gradient(135deg,rgba(79,70,186,0.2),rgba(249,137,107,0.2))] items-center justify-center text-[var(--brand-primary)] mb-4">
              <svg
                className="w-9 h-9"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)] mb-1">
              Sign in
            </p>
            <h1 className="text-2xl font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--brand-muted)]">
              Sign in to your GoVentureValue account
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--brand-ink)] mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[var(--border-soft)] rounded-2xl text-[var(--brand-ink)] placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--brand-ink)] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[var(--border-soft)] rounded-2xl text-[var(--brand-ink)] placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-2xl shadow-[0_4px_14px_rgba(79,70,186,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,186,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-soft)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[var(--brand-muted)]">
                or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-[var(--border-soft)] rounded-2xl hover:bg-[var(--surface-muted)] transition-all font-medium text-[var(--brand-ink)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          <p className="mt-8 text-center text-sm text-[var(--brand-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/signup"
              className="text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] font-semibold transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-muted)] hover:text-[var(--brand-ink)] transition-colors"
          >
            <ChevronLeft size={18} />
            Back to home
          </Link>
        </div>

        <p className="text-center text-xs text-[var(--brand-muted)] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
