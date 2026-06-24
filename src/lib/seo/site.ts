const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const siteConfig = {
  name: "Havamind",
  tagline: "Financial modeling & pitch decks for investors",
  title: "Havamind — AI Financial Modeling & Pitch Decks for Startups",
  description:
    "Build investor-ready financial models, scenario analysis, DCF valuations, and pitch decks in minutes. AI-powered fundraising tools for founders.",
  keywords: [
    "financial modeling",
    "startup financial model",
    "pitch deck generator",
    "DCF valuation",
    "scenario analysis",
    "fundraising tools",
    "investor deck",
    "startup fundraising",
    "AI financial model",
  ],
  locale: "en_US",
  defaultOgImage: "/logo512.png",
  productionUrl: "https://havamind.com",
} as const;

export function getSiteUrl(): string {
  const fromVite = import.meta.env?.VITE_SITE_URL?.trim();
  if (fromVite) {
    return trimTrailingSlash(fromVite);
  }

  const fromAuthUrl =
    import.meta.env?.VITE_BETTER_AUTH_URL?.trim() ||
    (typeof process !== "undefined" ? process.env.BETTER_AUTH_URL?.trim() : undefined);
  if (fromAuthUrl && !fromAuthUrl.includes("localhost")) {
    return trimTrailingSlash(fromAuthUrl);
  }

  return siteConfig.productionUrl;
}
