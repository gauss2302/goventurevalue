import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db/index";
import { financialModels } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import ModelList from "@/components/ModelList";
import AuthButton from "@/components/AuthButton";
import LandingPage from "@/components/LandingPage";

type LoaderData = {
  models: Array<{
    id: number;
    name: string;
    companyName: string | null;
    description: string | null;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  isAuthenticated: boolean;
};

export const Route = createFileRoute("/")({
  component: Home,
  // @ts-expect-error - Types will be correct after router regeneration
  loader: async ({ request }): Promise<LoaderData> => {
    try {
      // Handle request headers properly for TanStack Start
      // Better Auth's tanstackStartCookies plugin handles cookies automatically
      const headers = request?.headers || new Headers();

      // Get session from Better Auth
      const session = await auth.api.getSession({
        headers: headers as Headers,
      });

      const isAuthenticated = !!session?.user;

      // If not authenticated, return empty state (will show landing page)
      if (!isAuthenticated) {
        return {
          models: [],
          isAuthenticated: false,
        };
      }

      // Fetch user's financial models
      const models = await db.query.financialModels.findMany({
        where: eq(financialModels.userId, session.user.id),
        orderBy: [desc(financialModels.updatedAt)],
      });

      return {
        models: models.map((m) => ({
          id: m.id,
          name: m.name,
          companyName: m.companyName,
          description: m.description,
          currency: m.currency,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        isAuthenticated: true,
      };
    } catch (error) {
      console.error("Error in home route loader:", error);
      // Return empty state on error to prevent blank page
      // This ensures the landing page is shown even if there's an error
      return {
        models: [],
        isAuthenticated: false,
      };
    }
  },
});

function Home() {
  const loaderData = Route.useLoaderData();

  // Safety check: if loader data is not available, show landing page
  if (!loaderData) {
    console.warn("Loader data not available, showing landing page");
    return <LandingPage />;
  }

  const { models, isAuthenticated } = loaderData;

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Financial Models
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage your startup financial models
            </p>
          </div>
          <AuthButton />
        </div>
        <ModelList models={models} />
      </div>
    </div>
  );
}
