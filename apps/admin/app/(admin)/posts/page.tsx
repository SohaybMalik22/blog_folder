import Link from "next/link";
import { normalizeTags } from "@cricket-blog/types";
import { getPostsPage, POSTS_PER_PAGE } from "@/lib/queries";
import { shortDate, statusClass } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending", "published", "rejected"] as const;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status = "all", q = "", page } = await searchParams;
  const { rows, total, page: current, totalPages } = await getPostsPage({
    status,
    q,
    page: Number(page) || 1,
  });

  function href(next: { status?: string; page?: number }) {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    if (s && s !== "all") params.set("status", s);
    if (q) params.set("q", q);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    return qs ? `/posts?${qs}` : "/posts";
  }

  const from = total === 0 ? 0 : (current - 1) * POSTS_PER_PAGE + 1;
  const to = Math.min(current * POSTS_PER_PAGE, total);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <form action="/posts" className="relative min-w-0 flex-1 sm:max-w-sm">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search dispatches
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by title or tag"
            className="input"
          />
        </form>

        <div className="flex items-center gap-1.5">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={href({ status: s, page: 1 })}
              className={`rounded-md px-2.5 py-1.5 text-[0.75rem] font-semibold capitalize transition-colors ${
                status === s
                  ? "bg-brand text-white"
                  : "border border-line bg-surface text-ink-soft hover:bg-line-soft"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm font-semibold text-ink">Nothing matches this view</p>
            <p className="mt-1 text-ink-soft">
              {q ? (
                <>
                  No dispatches for “{q}”.{" "}
                  <Link href={href({ status, page: 1 })} className="text-brand hover:underline">
                    Clear search
                  </Link>
                </>
              ) : (
                "Run the scraper, then trigger generation to create dispatches."
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Fixture</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Generated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tags = normalizeTags(row.tags);
                  return (
                    <tr key={row._id}>
                      <td className="max-w-[20rem]">
                        <Link
                          href={`/posts/${row._id}`}
                          className="line-clamp-2 font-semibold text-ink hover:text-brand"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] text-ink-soft">
                        <span className="line-clamp-1">{row.fixture?.label ?? "—"}</span>
                        {row.fixture?.date && (
                          <span className="block text-[0.6875rem] text-ink-faint">
                            {row.fixture.date}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          {tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="pill pill--neutral">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 2 && (
                            <span className="pill pill--neutral">+{tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="text-ink-soft">{Math.round(row.confidenceScore * 100)}</td>
                      <td className="whitespace-nowrap text-ink-soft">
                        {shortDate(row.generatedAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/posts/${row._id}`}
                          className="text-[0.75rem] font-semibold text-brand hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <p className="text-[0.75rem] text-ink-soft">
              Showing {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
              {current > 1 ? (
                <Link href={href({ page: current - 1 })} rel="prev" className="btn btn--ghost">
                  Previous
                </Link>
              ) : (
                <span className="btn btn--ghost opacity-50">Previous</span>
              )}
              {current < totalPages ? (
                <Link href={href({ page: current + 1 })} rel="next" className="btn btn--ghost">
                  Next
                </Link>
              ) : (
                <span className="btn btn--ghost opacity-50">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
