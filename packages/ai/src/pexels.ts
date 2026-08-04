export interface StockPhoto {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

const SEARCH_URL = "https://api.pexels.com/v1/search";
const RESULTS_PER_QUERY = 20;

/**
 * Scene-diverse queries. Team names are useless here — Pexels has no photography
 * of this particular league — so the variety has to come from the kind of
 * cricket moment depicted instead.
 */
const SCENE_QUERIES = [
  "cricket batsman batting",
  "cricket bowler bowling",
  "cricket stadium floodlights",
  "cricket match crowd",
  "cricket fielding catch",
  "cricket pitch wicket",
  "cricket player action",
  "cricket ground aerial",
];

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

/**
 * Ordered query list for one post: a seed-chosen scene first so covers vary
 * between posts, then progressively broader fallbacks.
 */
export function buildPhotoQueries(format: string, tags: string[], seed = ""): string[] {
  const primary = SCENE_QUERIES[seedFrom(seed) % SCENE_QUERIES.length];
  const venueTag = tags.find((tag) => /sharjah|dubai|lusaka|stadium/i.test(tag));

  return [
    primary,
    ...(venueTag ? [`cricket ${venueTag}`] : []),
    `cricket ${format}`,
    "cricket",
  ];
}
