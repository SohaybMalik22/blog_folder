import { connectToDatabase, PageViewModel, PostModel } from "@cricket-blog/db";
import { SPORT_LABELS, type Sport } from "@cricket-blog/types";

/**
 * Read side of the first-party analytics in `packages/db/src/models/PageView.ts`.
 *
 * Every function here takes a day window and aggregates in Mongo rather than
 * pulling events into Node — the raw collection is the one that grows without
 * bound, so it must never be loaded wholesale.
 */

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(raw: string | undefined): RangeDays {
  const value = Number(raw);
  return (RANGE_OPTIONS as readonly number[]).includes(value) ? (value as RangeDays) : 7;
}

function since(days: number): Date {
  return new Date(Date.now() - days * 86400_000);
}

export interface TrafficSummary {
  views: number;
  visitors: number;
  /** Same-length window immediately before this one, for the delta. */
  previousViews: number;
  previousVisitors: number;
  /** Views per visitor, the cheapest "did they read more than one page?" signal. */
  viewsPerVisitor: number;
  /** True when nothing has ever been recorded — drives the setup empty state. */
  everRecorded: boolean;
}

export async function getTrafficSummary(days: RangeDays): Promise<TrafficSummary> {
  await connectToDatabase();

  const windowStart = since(days);
  const previousStart = since(days * 2);

  const [current, previous, everRecorded] = await Promise.all([
    countWindow(windowStart, undefined),
    countWindow(previousStart, windowStart),
    PageViewModel.countDocuments({}).then((n) => n > 0),
  ]);

  return {
    views: current.views,
    visitors: current.visitors,
    previousViews: previous.views,
    previousVisitors: previous.visitors,
    viewsPerVisitor: current.visitors ? current.views / current.visitors : 0,
    everRecorded,
  };
}

async function countWindow(start: Date, end: Date | undefined) {
  const match: Record<string, unknown> = end
    ? { ts: { $gte: start, $lt: end } }
    : { ts: { $gte: start } };

  const [result] = await PageViewModel.aggregate([
    { $match: match },
    { $group: { _id: null, views: { $sum: 1 }, visitors: { $addToSet: "$visitorHash" } } },
    { $project: { views: 1, visitors: { $size: "$visitors" } } },
  ]);

  return { views: result?.views ?? 0, visitors: result?.visitors ?? 0 };
}

export interface DailyPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  views: number;
  visitors: number;
}

/**
 * One point per day across the whole window, including days with no traffic —
 * a chart that silently omits empty days compresses the x-axis and overstates
 * how busy the site is.
 */
export async function getDailySeries(days: RangeDays): Promise<DailyPoint[]> {
  await connectToDatabase();

  const rows = await PageViewModel.aggregate([
    { $match: { ts: { $gte: since(days) } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
        views: { $sum: 1 },
        visitors: { $addToSet: "$visitorHash" },
      },
    },
    { $project: { views: 1, visitors: { $size: "$visitors" } } },
  ]);

  const byDate = new Map(rows.map((r: any) => [r._id, r]));

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400_000)
      .toISOString()
      .slice(0, 10);
    const row = byDate.get(date);
    return { date, views: row?.views ?? 0, visitors: row?.visitors ?? 0 };
  });
}

export interface RankedRow {
  key: string;
  label: string;
  /** Set for post rows so the admin can link straight to the dispatch. */
  postId?: string;
  views: number;
  visitors: number;
}

/** Top articles by views, resolved to post titles rather than bare slugs. */
export async function getTopPosts(days: RangeDays, limit = 8): Promise<RankedRow[]> {
  await connectToDatabase();

  const rows = await PageViewModel.aggregate([
    { $match: { ts: { $gte: since(days) }, postSlug: { $ne: null } } },
    {
      $group: {
        _id: "$postSlug",
        views: { $sum: 1 },
        visitors: { $addToSet: "$visitorHash" },
      },
    },
    { $project: { views: 1, visitors: { $size: "$visitors" } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);

  if (rows.length === 0) return [];

  const posts = await PostModel.find(
    { slug: { $in: rows.map((r: any) => r._id) } },
    { slug: 1, title: 1 }
  ).lean();
  const byslug = new Map((posts as any[]).map((p) => [p.slug, p]));

  return rows.map((row: any) => {
    const post = byslug.get(row._id);
    return {
      key: row._id,
      // A deleted post still has views worth showing; fall back to its slug.
      label: post?.title ?? row._id,
      postId: post ? String(post._id) : undefined,
      views: row.views,
      visitors: row.visitors,
    };
  });
}

/**
 * Where readers came from. Direct/unknown is reported as its own row rather than
 * dropped — on a new site it is usually the largest bucket, and hiding it makes
 * the referral numbers look better than they are.
 */
export async function getTopReferrers(days: RangeDays, limit = 8): Promise<RankedRow[]> {
  await connectToDatabase();

  const rows = await PageViewModel.aggregate([
    { $match: { ts: { $gte: since(days) } } },
    {
      $group: {
        _id: { $ifNull: ["$referrerHost", "__direct__"] },
        views: { $sum: 1 },
        visitors: { $addToSet: "$visitorHash" },
      },
    },
    { $project: { views: 1, visitors: { $size: "$visitors" } } },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row: any) => ({
    key: row._id,
    label: row._id === "__direct__" ? "Direct / unknown" : row._id,
    views: row.views,
    visitors: row.visitors,
  }));
}

export interface SplitRow {
  key: string;
  label: string;
  views: number;
}

/** Views per sport. Pages that belong to no sport are their own row. */
export async function getSportSplit(days: RangeDays): Promise<SplitRow[]> {
  await connectToDatabase();

  const rows = await PageViewModel.aggregate([
    { $match: { ts: { $gte: since(days) } } },
    { $group: { _id: { $ifNull: ["$sport", "__none__"] }, views: { $sum: 1 } } },
    { $sort: { views: -1 } },
  ]);

  return rows.map((row: any) => ({
    key: row._id,
    label:
      row._id === "__none__"
        ? "Other pages"
        : (SPORT_LABELS[row._id as Sport] ?? row._id),
    views: row.views,
  }));
}

export async function getDeviceSplit(days: RangeDays): Promise<SplitRow[]> {
  await connectToDatabase();

  const rows = await PageViewModel.aggregate([
    { $match: { ts: { $gte: since(days) } } },
    { $group: { _id: "$device", views: { $sum: 1 } } },
    { $sort: { views: -1 } },
  ]);

  const LABELS: Record<string, string> = {
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
  };

  return rows.map((row: any) => ({
    key: row._id ?? "desktop",
    label: LABELS[row._id] ?? "Desktop",
    views: row.views,
  }));
}
