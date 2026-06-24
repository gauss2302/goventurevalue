import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Link,
  useRouterState,
} from "@tanstack/react-router";

import Header from "../components/Header";

import appCss from "../styles.css?url";
import { Toaster } from "sonner";

import type { QueryClient } from "@tanstack/react-query";
import { getRootAuth } from "@/lib/auth/rootAuth";
import { logger } from "@/lib/logger";
import { siteConfig } from "@/lib/seo/site";

interface MyRouterContext {
  queryClient: QueryClient;
  isAuthenticated?: boolean;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    if (!import.meta.env.SSR) {
      return { isAuthenticated: false };
    }
    const { isAuthenticated } = await getRootAuth();
    return { isAuthenticated };
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
        title: siteConfig.title,
      },
      {
        name: "description",
        content: siteConfig.description,
      },
      {
        name: "theme-color",
        content: "#0c1222",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo192.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const router = useRouterState();
  const pathname = router?.location?.pathname ?? "/";

  // Safely get route context with fallback
  let isAuthenticated = false;
  try {
    const context = Route.useRouteContext();
    isAuthenticated = context?.isAuthenticated ?? false;
  } catch (error) {
    logger.error("Error getting root route context:", error);
    // Default to not authenticated on error
    isAuthenticated = false;
  }

  const hideHeader =
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/billing/") ||
    (pathname === "/" && !isAuthenticated) ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/models") ||
    pathname.startsWith("/pitch-decks") ||
    pathname.startsWith("/academy") ||
    pathname.startsWith("/assumptions");

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {!hideHeader && <Header />}
        {children}
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-[var(--page)] flex items-center justify-center px-[var(--space-4)]">
      <div className="text-center max-w-md">
        <div className="mb-[var(--space-5)]">
        <h1
          className="font-display text-[var(--brand-primary)]"
          style={{ fontWeight: 800, fontSize: "8rem", lineHeight: 1, letterSpacing: "-0.03em" }}
        >
            404
          </h1>
        </div>
        <h2 className="font-display text-[var(--text-title1)] font-bold text-[var(--brand-ink)] mb-[var(--space-4)]">
          Page Not Found
        </h2>
        <p className="text-[var(--text-body)] text-[var(--brand-muted)] mb-[var(--space-6)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-[var(--space-5)] py-[var(--space-3)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-full transition-all shadow-[0_6px_18px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)] hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--brand-primary)_42%,transparent)]"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
