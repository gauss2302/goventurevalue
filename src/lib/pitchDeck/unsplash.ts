import type { PitchDeckThemePhoto } from "@/lib/dto";

export type UnsplashSearchResult = {
  photos: PitchDeckThemePhoto[];
  total: number;
};

type UnsplashApiPhoto = {
  id: string;
  urls: { small: string; regular: string };
  alt_description: string | null;
  description: string | null;
  user: { name: string };
};

type UnsplashApiResponse = {
  results: UnsplashApiPhoto[];
  total: number;
};

export const searchUnsplashPhotos = async (
  query: string,
  perPage = 12,
): Promise<UnsplashSearchResult> => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as UnsplashApiResponse;

  return {
    total: data.total,
    photos: data.results.map((photo) => ({
      url: photo.urls.regular,
      alt: photo.alt_description ?? photo.description ?? query,
      unsplashId: photo.id,
      photographerName: photo.user.name,
    })),
  };
};

/**
 * Given a style questionnaire (color direction, imagery style, optional note, startup name)
 * returns a set of Unsplash search queries that would produce on-theme imagery.
 */
export const buildUnsplashQueriesFromStyle = (params: {
  imageryStyle?: string;
  colorDirection?: string;
  optionalNote?: string;
  startupName?: string;
}): string[] => {
  const { imageryStyle, colorDirection, optionalNote, startupName } = params;

  const queries: string[] = [];

  const styleMap: Record<string, string[]> = {
    "product-centric": ["technology product", "startup workspace", "modern software"],
    abstract: ["abstract geometric", "minimalist texture", "gradient background"],
    people: ["team collaboration", "business people meeting", "diverse professionals"],
    "data-heavy": ["data visualization", "analytics dashboard", "financial charts"],
  };

  const colorMap: Record<string, string> = {
    cool: "blue teal modern",
    warm: "warm orange amber",
    monochrome: "black white minimal",
    vibrant: "vibrant colorful bold",
  };

  const baseQueries = imageryStyle ? styleMap[imageryStyle] ?? [imageryStyle] : ["business", "startup"];

  for (const base of baseQueries.slice(0, 2)) {
    const colorSuffix = colorDirection ? colorMap[colorDirection] ?? colorDirection : "";
    queries.push([base, colorSuffix].filter(Boolean).join(" "));
  }

  if (optionalNote) {
    const words = optionalNote.split(/\s+/).slice(0, 4).join(" ");
    queries.push(words);
  }

  if (startupName) {
    queries.push(`${startupName} brand`);
  }

  return [...new Set(queries)].slice(0, 4);
};
