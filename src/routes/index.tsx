import { createFileRoute, redirect } from "@tanstack/react-router";
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
      console.error("Error in home route loader:", error);
      return null;
    }
  },
});

function Home() {
  return <LandingPage />;
}
