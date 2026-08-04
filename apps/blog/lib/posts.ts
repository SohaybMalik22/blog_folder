import { connectToDatabase, PostModel, RawMatchModel } from "@cricket-blog/db";
import { normalizeTag, normalizeTags, type Post, type RawMatch } from "@cricket-blog/types";

function serializePost(post: any): Post {
  return {
    ...post,
    _id: String(post._id),
    matchRef: String(post.matchRef),
    generatedAt: post.generatedAt?.toISOString?.() ?? post.generatedAt,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString?.() ?? post.publishedAt : null,
  };
}

export async function getPublishedPosts(): Promise<Post[]> {
  await connectToDatabase();
  const posts = await PostModel.find({ status: "published" })
    .sort({ publishedAt: -1 })
    .lean();
  return posts.map(serializePost);
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
export async function getTagIndex(): Promise<string[]> {
  const posts = await getPublishedPosts();
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

export interface Fixture {
  number: number | null;
  teams: string[];
  date: string;
  localTime: string;
}

function toFixture(raw: any): Fixture {
  return {
    number: Number(raw.matchTitle?.match(/match\s+(\d+)/i)?.[1]) || null,
    teams: raw.teams ?? [],
    date: typeof raw.date === "string" ? raw.date : "",
    localTime: raw.scorecard?.localTime ?? "",
  };
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
 * The scraped fixture list, whether or not a dispatch has been written for each
 * one yet. Ordered by fixture number parsed from the title, since the scraped
 * `date` is a display string rather than a sortable value.
 */
export async function getSeasonFixtures(limit = 6): Promise<Fixture[]> {
  await connectToDatabase();
  const matches = await RawMatchModel.find({}).lean();

  return (matches as any[])
    .map(toFixture)
    .filter((f) => f.teams.length === 2)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
    .slice(0, limit);
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
    scrapedAt: m.scrapedAt?.toISOString?.() ?? m.scrapedAt,
  } as RawMatch;
}
