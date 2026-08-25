import { connectToDatabase, PostModel, RawMatchModel } from "@cricket-blog/db";
import {
  normalizeTag,
  normalizeTags,
  sportOf,
  type Post,
  type RawMatch,
  type Sport,
} from "@cricket-blog/types";

function serializePost(post: any): Post {
  return {
    ...post,
    _id: String(post._id),
    matchRef: String(post.matchRef),
    // Posts written before the schema was multi-sport carry no `sport`.
    sport: sportOf(post.sport),
    generatedAt: post.generatedAt?.toISOString?.() ?? post.generatedAt,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString?.() ?? post.publishedAt : null,
  };
}

export async function getPublishedPosts(sport?: Sport): Promise<Post[]> {
  await connectToDatabase();
  const posts = await PostModel.find({
    status: "published",
    ...(sport ? { sport } : {}),
  })
    .sort({ publishedAt: -1 })
    .lean();
  return posts.map(serializePost);
}

/** How many published posts each sport has, for masthead and landing counts. */
export async function getSportCounts(): Promise<Record<Sport, number>> {
  const posts = await getPublishedPosts();
  const counts = { cricket: 0, motorsport: 0 } as Record<Sport, number>;
  for (const post of posts) counts[post.sport] += 1;
  return counts;
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  await connectToDatabase();
  const post = await PostModel.findOne({ slug, status: "published" }).lean();
  return post ? serializePost(post) : null;
}

/**
 * Every tag in use across published posts, most frequent first. Normalised on
 * read as well as on write, so posts stored before normalisation existed don't
 * produce duplicate filter entries.
 */
export async function getTagIndex(sport?: Sport): Promise<string[]> {
  const posts = await getPublishedPosts(sport);
  const counts = new Map<string, { label: string; count: number }>();

  for (const post of posts) {
    for (const tag of normalizeTags(post.tags)) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { label: tag, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).map((e) => e.label);
}

/** Case- and separator-insensitive tag match for filtering. */
export function postHasTag(post: Post, tag: string): boolean {
  const target = normalizeTag(tag).toLowerCase();
  return normalizeTags(post.tags).some((t) => t.toLowerCase() === target);
}

/**
 * The scraped event record reduced to what cover plates and schedule panels
 * need. Head-to-head sports fill `teams`; field events like a Grand Prix leave
 * it empty and carry the event's own name in `headline` instead.
 */
export interface Fixture {
  sport: Sport;
  /** Fixture number for cricket, round number for a race. */
  number: number | null;
  teams: string[];
  /** Event name for field events ("Dutch Grand Prix"); empty for head-to-head. */
  headline: string;
  /** Circuit or ground, short form. */
  location: string;
  date: string;
  localTime: string;
  contested: boolean;
  /** Winner's name once the event has been run. */
  winner: string;
}

function toFixture(raw: any): Fixture {
  const sport = sportOf(raw.sport);
  const scorecard = raw.scorecard ?? {};

  // Cricket titles read "Match 7: A vs B", races read "Round 11: Hungarian
  // Grand Prix" — the number is the season position in both cases.
  const number =
    Number(scorecard.round) ||
    Number(raw.matchTitle?.match(/(?:match|round)\s+(\d+)/i)?.[1]) ||
    null;

  const standings = raw.standings ?? [];

  return {
    sport,
    number,
    teams: raw.teams ?? [],
    headline:
      sport === "cricket"
        ? ""
        : // Strip the "Round N: " prefix; the number is rendered separately.
          String(raw.matchTitle ?? "").replace(/^round\s+\d+:\s*/i, ""),
    location: scorecard.locality || scorecard.circuitName || raw.venue || "",
    date: typeof raw.date === "string" ? raw.date : "",
    localTime: scorecard.localTime ?? "",
    contested:
      standings.length > 0 ||
      (raw.playerPerformances ?? []).length > 0 ||
      scorecard.status === "completed",
    winner: standings[0]?.name ?? scorecard.winner ?? "",
  };
}

/** A plate can label the event only if it has two teams or its own name. */
export function isLabelled(fixture: Fixture | null | undefined): fixture is Fixture {
  return !!fixture && (fixture.teams.length === 2 || fixture.headline.length > 0);
}

export interface PostWithFixture {
  post: Post;
  fixture: Fixture | null;
}

/**
 * Posts joined to the fixture each was generated from, so cards and heroes can
 * label the actual match-up. Batched into one extra query rather than one per
 * post.
 */
export async function withFixtures(posts: Post[]): Promise<PostWithFixture[]> {
  if (posts.length === 0) return [];
  await connectToDatabase();

  const matches = await RawMatchModel.find({
    _id: { $in: posts.map((p) => p.matchRef) },
  }).lean();

  const byId = new Map(
    (matches as any[]).map((m) => [String(m._id), toFixture(m)])
  );

  return posts.map((post) => ({ post, fixture: byId.get(post.matchRef) ?? null }));
}

/**
 * The scraped schedule, whether or not a dispatch has been written for each
 * entry yet. Ordered by fixture/round number rather than `date`, since the
 * scraped date is a display string and not reliably sortable.
 *
 * For a season part-way through, the useful window is around the present: the
 * most recent completed events plus what's next, not round 1 of 23.
 */
export async function getSeasonFixtures(sport?: Sport, limit = 6): Promise<Fixture[]> {
  await connectToDatabase();
  const matches = await RawMatchModel.find(sport ? { sport } : {}).lean();

  const ordered = (matches as any[])
    .map(toFixture)
    .filter(isLabelled)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));

  const nextIndex = ordered.findIndex((f) => !f.contested);
  if (nextIndex === -1) return ordered.slice(-limit);

  // Keep the upcoming event in view with a couple of completed ones for context.
  const start = Math.max(0, nextIndex - 2);
  return ordered.slice(start, start + limit);
}

/**
 * The fixture facts the article was generated from — used for the Match File
 * block so the article page shows verifiable data rather than a restatement of
 * the prose.
 */
export async function getMatchForPost(matchRef: string): Promise<RawMatch | null> {
  await connectToDatabase();
  const match = await RawMatchModel.findById(matchRef).lean();
  if (!match) return null;
  const m = match as any;
  return {
    ...m,
    _id: String(m._id),
    sport: sportOf(m.sport),
    standings: m.standings ?? [],
    playerPerformances: m.playerPerformances ?? [],
    scrapedAt: m.scrapedAt?.toISOString?.() ?? m.scrapedAt,
  } as RawMatch;
}
