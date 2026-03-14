import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import LandingPage from "@/components/LandingPage";
import { getSessionForLoader } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async ({ location }) => {
    try {
      // Guard: location may be undefined in some SSR/request edge cases
      if (location == null) return null;
      const session = await getSessionForLoader();
      if (session?.user) {
        throw redirect({ to: "/dashboard" });
      }
      return null;
    } catch (error) {
      // Re-throw redirects so TanStack Router can perform the navigation
      if (isRedirect(error)) throw error;
      logger.error("Error in home route loader:", error);
      return null;
    }
  },
});

function Home() {
  return <LandingPage />;
}
