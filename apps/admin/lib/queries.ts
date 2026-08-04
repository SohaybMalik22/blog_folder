import { connectToDatabase, PostModel, RawMatchModel } from "@cricket-blog/db";
import { normalizeTags, type Post, type PostStatus } from "@cricket-blog/types";

function serialize(post: any): Post {
  return {
    ...post,
    _id: String(post._id),
    matchRef: String(post.matchRef),
    generatedAt: post.generatedAt?.toISOString?.() ?? post.generatedAt,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString?.() ?? post.publishedAt : null,
  };
}

export interface Stats {
  total: number;
  published: number;
  pending: number;
  rejected: number;
  /** Mean Gemini confidence across all posts, 0-100. Drives auto-publish. */
  avgConfidence: number;
  /** Scraped fixtures with no dispatch written yet. */
  fixturesWaiting: number;
}

export async function getStats(): Promise<Stats> {
  await connectToDatabase();

  const [total, published, pending, rejected, fixturesWaiting, agg] = await Promise.all([
    PostModel.countDocuments({}),
    PostModel.countDocuments({ status: "published" }),
    PostModel.countDocuments({ status: "pending" }),
    PostModel.countDocuments({ status: "rejected" }),
    RawMatchModel.countDocuments({ status: "new" }),
    PostModel.aggregate([{ $group: { _id: null, avg: { $avg: "$confidenceScore" } } }]),
  ]);

  return {
    total,
    published,
    pending,
    rejected,
    avgConfidence: Math.round((agg[0]?.avg ?? 0) * 100),
    fixturesWaiting,
  };
}

export async function getRecentPosts(limit = 5): Promise<Post[]> {
  await connectToDatabase();
  const posts = await PostModel.find({}).sort({ generatedAt: -1 }).limit(limit).lean();
  return posts.map(serialize);
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getTopTags(limit = 5): Promise<TagCount[]> {
  await connectToDatabase();
  const posts = await PostModel.find({}, { tags: 1 }).lean();

  const counts = new Map<string, { label: string; count: number }>();
  for (const post of posts as any[]) {
    for (const tag of normalizeTags(post.tags ?? [])) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { label: tag, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => ({ tag: e.label, count: e.count }));
}

export interface PostRow extends Post {
  /** Fixture the dispatch was generated from, for the table's Fixture column. */
  fixture: { label: string; date: string } | null;
}

export interface PostsPage {
  rows: PostRow[];
  total: number;
  page: number;
  totalPages: number;
}

const PER_PAGE = 10;

export async function getPostsPage(options: {
  status?: string;
  q?: string;
  page?: number;
}): Promise<PostsPage> {
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (options.status && options.status !== "all") {
    filter.status = options.status as PostStatus;
  }
  if (options.q?.trim()) {
    // Escaped so a stray regex character in the search box can't throw.
    const safe = options.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { tags: { $regex: safe, $options: "i" } },
    ];
  }

  const total = await PostModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, options.page ?? 1), totalPages);

  const posts = await PostModel.find(filter)
    .sort({ generatedAt: -1 })
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE)
    .lean();

  const matches = await RawMatchModel.find(
    { _id: { $in: (posts as any[]).map((p) => p.matchRef) } },
    { matchTitle: 1, date: 1 }
  ).lean();

  const byId = new Map(
    (matches as any[]).map((m) => [
      String(m._id),
      {
        label: String(m.matchTitle ?? "").replace(/^match\s+\d+:\s*/i, ""),
        date: typeof m.date === "string" ? m.date : "",
      },
    ])
  );

  return {
    rows: (posts as any[]).map((p) => ({
      ...serialize(p),
      fixture: byId.get(String(p.matchRef)) ?? null,
    })),
    total,
    page,
    totalPages,
  };
}

export const POSTS_PER_PAGE = PER_PAGE;
