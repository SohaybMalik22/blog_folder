import Link from "next/link";
import { getRecentPosts, getStats, getTopTags } from "@/lib/queries";
import { getTrafficSummary } from "@/lib/analytics";
import { statusClass, timeAgo } from "@/lib/format";
import { AUTO_PUBLISH_THRESHOLD } from "@/lib/publish";
import { StatTile } from "../analytics/charts";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  suffix,
  tone = "ink",
  note,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  tone?: "ink" | "ok" | "warn" | "brand";
  note?: string;
}) {
  const toneClass = {
    ink: "text-ink",
    ok: "text-ok",
    warn: "text-warn",
    brand: "text-brand",
  }[tone];

  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>
        {value}
        {suffix && <span className="text-base font-semibold text-ink-faint">{suffix}</span>}
      </p>
      {note && <p className="mt-1 text-[0.6875rem] text-ink-soft">{note}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, recent, topTags, traffic] = await Promise.all([
    getStats(),
    getRecentPosts(5),
    getTopTags(5),
    getTrafficSummary(7),
  ]);

  const maxTagCount = topTags[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Traffic leads the dashboard: "is anyone reading this?" is the first
          question, and the pipeline counts below are the second. */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Traffic · last 7 days</h2>
          <Link href="/analytics" className="text-[0.75rem] font-semibold text-brand hover:underline">
            Full report →
          </Link>
        </div>
        {traffic.everRecorded ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Pageviews" value={traffic.views} previous={traffic.previousViews} />
            <StatTile
              label="Unique visitors"
              value={traffic.visitors}
              previous={traffic.previousVisitors}
            />
            <StatTile
              label="Views per visitor"
              value={Math.round(traffic.viewsPerVisitor * 10) / 10}
              note="Above 1 means multi-page reads"
            />
            <StatCard label="Published" value={stats.published} tone="ok" />
          </div>
        ) : (
          <div className="card px-4 py-6 text-center">
            <p className="text-[0.8125rem] font-semibold text-ink">No pageviews recorded yet</p>
            <p className="mt-1 text-ink-soft">
              Open a page on the blog and it will appear here.{" "}
              <Link href="/analytics" className="font-semibold text-brand hover:underline">
                Details
              </Link>
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total dispatches" value={stats.total} />
        <StatCard label="Published" value={stats.published} tone="ok" />
        <StatCard label="Awaiting review" value={stats.pending} tone="warn" />
        <StatCard
          label="Avg confidence"
          value={stats.avgConfidence}
          suffix="/100"
          tone="brand"
          note={`Auto-publishes at ${AUTO_PUBLISH_THRESHOLD * 100}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent dispatches */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">Recent dispatches</h2>
            <Link href="/posts" className="text-[0.75rem] font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-ink-soft">
              Nothing generated yet. Run the scraper, then trigger generation.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Generated</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((post) => (
                    <tr key={post._id}>
                      <td className="max-w-[22rem]">
                        <Link
                          href={`/posts/${post._id}`}
                          className="line-clamp-1 font-semibold text-ink hover:text-brand"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td>
                        <span className={statusClass(post.status)}>{post.status}</span>
                      </td>
                      <td className="text-ink-soft">
                        {Math.round(post.confidenceScore * 100)}
                      </td>
                      <td className="whitespace-nowrap text-ink-soft">
                        {timeAgo(post.generatedAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/posts/${post._id}`}
                          className="text-[0.75rem] font-semibold text-brand hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top tags */}
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">Top tags</h2>
          </div>

          {topTags.length === 0 ? (
            <p className="px-4 py-10 text-center text-ink-soft">No tags yet.</p>
          ) : (
            <ol className="divide-y divide-line-soft">
              {topTags.map((entry, index) => (
                <li key={entry.tag} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-[0.75rem] font-semibold text-ink-faint">
                      {index + 1}
                    </span>
                    <Link
                      href={`/posts?q=${encodeURIComponent(entry.tag)}`}
                      className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-ink hover:text-brand"
                    >
                      {entry.tag}
                    </Link>
                    <span className="whitespace-nowrap text-[0.75rem] text-ink-soft">
                      {entry.count} {entry.count === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  {/* Bar encodes share relative to the most-used tag. */}
                  <div className="mt-2 ml-7 h-1 rounded-full bg-line-soft">
                    <div
                      className="h-1 rounded-full bg-brand"
                      style={{ width: `${(entry.count / maxTagCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
