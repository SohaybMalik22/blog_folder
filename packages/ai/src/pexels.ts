import type { Sport } from "@cricket-blog/types";

export interface StockPhoto {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

const SEARCH_URL = "https://api.pexels.com/v1/search";
const RESULTS_PER_QUERY = 20;

/**
 * Scene-diverse queries per sport. Competitor names are useless here — Pexels
 * has no photography of this particular league, and none of a named driver — so
 * the variety has to come from the kind of moment depicted instead.
 */
const SCENE_QUERIES: Record<Sport, string[]> = {
  cricket: [
    "cricket batsman batting",
    "cricket bowler bowling",
    "cricket stadium floodlights",
    "cricket match crowd",
    "cricket fielding catch",
    "cricket pitch wicket",
    "cricket player action",
    "cricket ground aerial",
  ],
  motorsport: [
    "formula 1 car racing",
    "race car cornering circuit",
    "motorsport pit lane",
    "racing car speed blur",
    "formula racing grandstand crowd",
    "race track aerial circuit",
    "pit stop tyre change",
    "racing helmet driver cockpit",
  ],
};

/** Broad final fallbacks, tried after the sport-specific scenes. */
const GENERIC_QUERIES: Record<Sport, string[]> = {
  cricket: ["cricket"],
  motorsport: ["motorsport racing", "race car"],
};

/** Stable non-crypto hash so a given slug always resolves to the same photo. */
function seedFrom(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pexels photos are licensed for commercial use, so unlike the source site's
 * own photography these can legitimately be published. The licence asks that
 * photographers are credited, which is what `credit`/`creditUrl` carry.
 *
 * `seed` (the post slug) picks both the query and the photo within the result
 * page, so different posts get different covers while regenerating the same
 * post keeps its image.
 */
export async function findStockPhoto(
  queries: string[],
  seed: string
): Promise<StockPhoto | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const seedValue = seedFrom(seed);

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      orientation: "landscape",
      per_page: String(RESULTS_PER_QUERY),
    });

    const response = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      throw new Error(`Pexels search failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      photos?: Array<{
        alt: string;
        photographer: string;
        photographer_url: string;
        url: string;
        src: { landscape?: string; large?: string; original: string };
      }>;
    };

    const photos = data.photos ?? [];
    if (photos.length === 0) continue;

    const photo = photos[seedValue % photos.length];

    return {
      url: photo.src.landscape ?? photo.src.large ?? photo.src.original,
      alt: photo.alt || query,
      credit: `Photo by ${photo.photographer} on Pexels`,
      creditUrl: photo.url,
    };
  }

  return null;
}

/** Place tags worth trying as a literal query, since Pexels does have
 *  photography of well-known venues and cities. */
const PLACE_TAG = /sharjah|dubai|lusaka|stadium|monaco|silverstone|monza|circuit|grand prix/i;

/**
 * Ordered query list for one post: a seed-chosen scene first so covers vary
 * between posts, then progressively broader fallbacks.
 */
export function buildPhotoQueries(
  sport: Sport,
  format: string,
  tags: string[],
  seed = ""
): string[] {
  const scenes = SCENE_QUERIES[sport];
  const primary = scenes[seedFrom(seed) % scenes.length];
  const subject = sport === "motorsport" ? "formula 1" : "cricket";
  const placeTag = tags.find((tag) => PLACE_TAG.test(tag));

  return [
    primary,
    ...(placeTag ? [`${subject} ${placeTag}`] : []),
    `${subject} ${format}`,
    ...GENERIC_QUERIES[sport],
  ];
}
