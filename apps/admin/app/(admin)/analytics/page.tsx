import Link from "next/link";
import { PAGE_VIEW_RETENTION_DAYS } from "@cricket-blog/db";
import {
  getDailySeries,
  getDeviceSplit,
  getSportSplit,
  getTopPosts,
  getTopReferrers,
  getTrafficSummary,
  parseRange,
  RANGE_OPTIONS,
} from "@/lib/analytics";
import { DailyColumns, RankedList, SplitBar, StatTile } from "./charts";

// Traffic must reflect the last few seconds, not a cached render.
export const dynamic = "force-dynamic";

function Panel({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {hint && <p className="text-[0.6875rem] text-ink-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = parseRange(range);

  const [summary, series, topPosts, referrers, sportSplit, deviceSplit] = await Promise.all([
    getTrafficSummary(days),
    getDailySeries(days),
    getTopPosts(days),
    getTopReferrers(days),
    getSportSplit(days),
    getDeviceSplit(days),
  ]);

  // Distinguishes "nobody has visited" from "tracking isn't running" — without
  // this the page looks identical in both cases and there's nothing to act on.
  if (!summary.everRecorded) {
    return (
      <div className="card px-6 py-16 text-center">
        <p className="text-sm font-semibold text-ink">No pageviews recorded yet</p>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          The blog reports views to its own <code>/api/track</code> endpoint. If the
          blog app is running and you have opened a page on it, a view should appear
          here within seconds — reload to check.
        </p>
        <p className="mx-auto mt-3 max-w-md text-[0.75rem] text-ink-faint">
          Known crawlers are filtered out on purpose, so bot hits will never show
          up as traffic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range filter: one row above the charts. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/analytics?range=${option}`}
              aria-current={days === option ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                days === option
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-ink-soft hover:bg-line-soft"
              }`}
            >
              Last {option} days
            </Link>
          ))}
        </div>
        <p className="text-[0.6875rem] text-ink-faint">
          First-party · no cookies · bots filtered · events kept{" "}
          {PAGE_VIEW_RETENTION_DAYS} days
        </p>
      </div>

      {/* The headline answer: is traffic coming? */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Pageviews" value={summary.views} previous={summary.previousViews} />
        <StatTile
          label="Unique visitors"
          value={summary.visitors}
          previous={summary.previousVisitors}
        />
        <StatTile
          label="Views per visitor"
          value={Math.round(summary.viewsPerVisitor * 10) / 10}
          note="Above 1 means readers opened more than one page"
        />
        <StatTile
          label="Articles read"
          value={topPosts.reduce((sum, row) => sum + row.views, 0)}
          note="Views on dispatch pages only"
        />
      </div>

      <Panel title={`Views per day · last ${days} days`} hint="Hover a column for that day">
        <div className="px-4 py-5">
          <DailyColumns points={series} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most-read dispatches" hint="Click through to review">
          <RankedList rows={topPosts} emptyLabel="No article views in this period yet." />
        </Panel>

        <Panel title="Traffic sources">
          <RankedList
            rows={referrers}
            emptyLabel="No views in this period yet."
          />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Views by sport">
          <SplitBar rows={sportSplit} emptyLabel="No views in this period yet." />
        </Panel>

        <Panel title="Views by device">
          <SplitBar rows={deviceSplit} emptyLabel="No views in this period yet." />
        </Panel>
      </div>
    </div>
  );
}
