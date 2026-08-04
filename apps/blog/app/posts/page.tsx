import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts, getTagIndex, postHasTag, withFixtures } from "@/lib/posts";
import { PostCard } from "../components/post-card";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All dispatches",
  description: "Every published Cricket Beat dispatch on the Asian Legends League.",
};

const PER_PAGE = 9;

export default async function AllPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string }>;
}) {
  const { tag, q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const allPosts = await getPublishedPosts();
  const tags = await getTagIndex();

  const query = q?.trim().toLowerCase();
  const filtered = allPosts.filter((post) => {
    const matchesTag = !tag || postHasTag(post, tag);
    const matchesQuery =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.metaDescription.toLowerCase().includes(query) ||
      post.tags.some((t) => t.toLowerCase().includes(query));
    return matchesTag && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visible = await withFixtures(
    filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  );

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/posts?${qs}` : "/posts";
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="section-head">
        <h1 className="headline text-3xl sm:text-4xl">All dispatches</h1>
        <span className="label-sm text-muted">
          {filtered.length} {filtered.length === 1 ? "dispatch" : "dispatches"}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-9 flex flex-wrap items-center gap-2.5">
        <Link href={q ? `/posts?q=${encodeURIComponent(q)}` : "/posts"} className={`pill ${!tag ? "pill--active" : ""}`}>
          All
        </Link>
        {tags.slice(0, 8).map((t) => (
          <Link
            key={t}
            href={`/posts?tag=${encodeURIComponent(t)}`}
            className={`pill ${tag === t ? "pill--active" : ""}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {query && (
        <p className="mb-6 text-sm text-muted">
          Results for <span className="text-ink">“{q}”</span>
          {" · "}
          <Link href={tag ? `/posts?tag=${encodeURIComponent(tag)}` : "/posts"} className="text-vermillion hover:underline">
            Clear search
          </Link>
        </p>
      )}

      {visible.length === 0 ? (
        <div className="border border-rule bg-card px-6 py-20 text-center">
          <p className="label text-vermillion">No matches</p>
          <h2 className="headline mt-3 text-2xl">Nothing filed under that</h2>
          <p className="mt-3 text-muted">
            Try another team or topic, or{" "}
            <Link href="/posts" className="text-vermillion hover:underline">
              browse every dispatch
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ post, fixture }) => (
            <PostCard key={post._id} post={post} fixture={fixture} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
          {safePage > 1 && (
            <Link href={pageHref(safePage - 1)} className="pill" rel="prev">
              ← Prev
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              aria-current={n === safePage ? "page" : undefined}
              className={`pill ${n === safePage ? "pill--active" : ""}`}
            >
              {n}
            </Link>
          ))}
          {safePage < totalPages && (
            <Link href={pageHref(safePage + 1)} className="pill" rel="next">
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
