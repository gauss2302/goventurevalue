import { getSiteUrl, siteConfig } from "@/lib/seo/site";

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

type PageSeoOptions = {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
  jsonLd?: JsonLd;
};

export function buildPageHead(options: PageSeoOptions = {}) {
  const siteUrl = getSiteUrl();
  const path = options.path ?? "/";
  const canonical = `${siteUrl}${path === "/" ? "" : path}`;
  const title = options.title ?? siteConfig.title;
  const description = options.description ?? siteConfig.description;
  const ogImage = `${siteUrl}${options.ogImage ?? siteConfig.defaultOgImage}`;

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: siteConfig.keywords.join(", ") },
    { name: "author", content: siteConfig.name },
    {
      name: "robots",
      content: options.noIndex ? "noindex, nofollow" : "index, follow",
    },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteConfig.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:locale", content: siteConfig.locale },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "512" },
    { property: "og:image:height", content: "512" },
    {
      property: "og:image:alt",
      content: `${siteConfig.name} — ${siteConfig.tagline}`,
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];

  const links = [{ rel: "canonical", href: canonical }];

  const scripts = options.jsonLd
    ? [
        {
          type: "application/ld+json",
          children: JSON.stringify(options.jsonLd),
        },
      ]
    : [];

  return { meta, links, scripts };
}

export function buildLandingJsonLd() {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}${siteConfig.defaultOgImage}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en-US",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
          width: 512,
          height: 512,
        },
        description: siteConfig.description,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: siteConfig.name,
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free starter plan available",
        },
        featureList: [
          "AI-powered financial modeling",
          "Investor-ready pitch deck generation",
          "Scenario analysis",
          "DCF valuation",
          "Excel export",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: siteConfig.title,
        description: siteConfig.description,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#software` },
        inLanguage: "en-US",
      },
    ],
  };
}

export function buildLandingHead() {
  return buildPageHead({
    path: "/",
    jsonLd: buildLandingJsonLd(),
  });
}
