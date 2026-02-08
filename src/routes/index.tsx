import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import LandingPage from "@/components/LandingPage";
import { getSessionForLoader } from "@/lib/auth/requireAuth";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    try {
      const session = await getSessionForLoader();
      if (session?.user) {
        throw redirect({ to: "/dashboard" });
      }
      return null;
    } catch (error) {
      // Re-throw redirects so TanStack Router can perform the navigation
      if (isRedirect(error)) throw error;
      console.error("Error in home route loader:", error);
      return null;
    }
  },
});

function Home() {
  return <LandingPage />;
}
