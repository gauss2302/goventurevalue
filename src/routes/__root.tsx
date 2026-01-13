import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import Header from "../components/Header";
import { auth } from "../lib/auth";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // @ts-expect-error - Types will be correct after router regeneration
  loader: async ({ request }) => {
    try {
      const headers = request?.headers || new Headers();
      const session = await auth.api.getSession({
        headers: headers as Headers,
      });
      return { isAuthenticated: !!session?.user };
    } catch (error) {
      console.error("Error in root route loader:", error);
      // Return default state on error to prevent blank page
      return { isAuthenticated: false };
    }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Financial Modeling SaaS",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const pathname = router.location.pathname;

  // Safely get loader data with fallback
  let isAuthenticated = false;
  try {
    const loaderData = Route.useLoaderData();
    isAuthenticated = loaderData?.isAuthenticated ?? false;
  } catch (error) {
    console.error("Error getting root loader data:", error);
    // Default to not authenticated on error
    isAuthenticated = false;
  }

  // Hide header on:
  // 1. Auth pages (/auth/*)
  // 2. Landing page (/) when not authenticated
  const hideHeader =
    pathname.startsWith("/auth/") || (pathname === "/" && !isAuthenticated);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {!hideHeader && <Header />}
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-emerald-600">404</h1>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
