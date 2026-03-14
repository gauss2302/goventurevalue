import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const { data: session } = authClient.useSession();
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
      logger.error("Google sign-in error:", err);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--page)] px-4 py-10 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.03]" />
      <div className="pointer-events-none absolute -top-32 right-[10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.08),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[10%] -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(132,232,244,0.08),transparent_70%)] blur-3xl" />

      <motion.div
        className="relative w-full max-w-[420px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      >
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="mb-8 text-center">
            <Link to="/" className="mb-6 inline-flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-ink)] shadow-[var(--shadow-md)]">
                <div className="grid grid-cols-2 gap-[3px]">
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-ink)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                </div>
              </div>
            </Link>
            <h1
              className="text-2xl text-[var(--brand-ink)]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Sign in to your Havamind workspace
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[13px] font-medium text-[var(--brand-ink)]"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-[var(--radius-md)] border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm focus-visible:ring-[var(--brand-primary)]"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[13px] font-medium text-[var(--brand-ink)]"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-[var(--radius-md)] border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm focus-visible:ring-[var(--brand-primary)]"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(79,70,186,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3d36a3] hover:shadow-[0_12px_32px_rgba(79,70,186,0.4)] active:scale-[0.97]"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-soft)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-[var(--brand-muted)]">
                or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-white text-sm font-medium text-[var(--brand-ink)] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <p className="mt-6 text-center text-sm text-[var(--brand-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/signup"
              className="font-semibold text-[var(--brand-primary)] transition-colors hover:text-[#3d36a3]"
            >
              Create one
            </Link>
          </p>
        </div>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--brand-muted)]">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
