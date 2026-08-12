import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts, getTagIndex, postHasTag, withFixtures } from "@/lib/posts";
import { SITE_NAME, SPORT_META, SPORT_ORDER, sportFromSlug } from "@/lib/site";
import { PostCard } from "../components/post-card";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All dispatches",
  description: `Every published ${SITE_NAME} dispatch, across all sports covered.`,
};

const PER_PAGE = 9;

export default async function AllPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; page?: string; sport?: string }>;
}) {
  const { tag, q, page, sport: sportSlug } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  // An unrecognised slug filters nothing rather than 404ing — this is a listing
  // with optional facets, not an addressable sport page.
  const sport = sportSlug ? sportFromSlug(sportSlug) : null;

  const allPosts = await getPublishedPosts();
  const tags = await getTagIndex(sport ?? undefined);

  const query = q?.trim().toLowerCase();
  const filtered = allPosts.filter((post) => {
    const matchesSport = !sport || post.sport === sport;
    const matchesTag = !tag || postHasTag(post, tag);
    const matchesQuery =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.metaDescription.toLowerCase().includes(query) ||
      post.tags.some((t) => t.toLowerCase().includes(query));
    return matchesSport && matchesTag && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visible = await withFixtures(
    filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  );

  /** Builds a listing URL, preserving the facets not being changed. */
  function href(
    overrides: {
      tag?: string | null;
      sport?: string | null;
      q?: string | null;
      page?: number;
    } = {}
  ) {
    const params = new URLSearchParams();
    const nextTag = overrides.tag === undefined ? tag : overrides.tag;
    const nextSport = overrides.sport === undefined ? sportSlug : overrides.sport;
    const nextQuery = overrides.q === undefined ? q : overrides.q;

    if (nextSport) params.set("sport", nextSport);
    if (nextTag) params.set("tag", nextTag);
    if (nextQuery) params.set("q", nextQuery);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));

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

      {/* Sport facet, above the tag facet: changing sport resets the tag, since
          tags don't carry across sports. */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Link href={href({ sport: null, tag: null })} className={`pill ${!sport ? "pill--active" : ""}`}>
          All sports
        </Link>
        {SPORT_ORDER.map((s) => (
          <Link
            key={s}
            href={href({ sport: SPORT_META[s].slug, tag: null })}
            className={`pill ${sport === s ? "pill--active" : ""}`}
          >
            {SPORT_META[s].label}
          </Link>
        ))}
      </div>

      {/* Tag facet */}
      <div className="mb-9 flex flex-wrap items-center gap-2.5">
        <Link href={href({ tag: null })} className={`pill ${!tag ? "pill--active" : ""}`}>
          All topics
        </Link>
        {tags.slice(0, 8).map((t) => (
          <Link key={t} href={href({ tag: t })} className={`pill ${tag === t ? "pill--active" : ""}`}>
            {t}
          </Link>
        ))}
      </div>

      {query && (
        <p className="mb-6 text-sm text-muted">
          Results for <span className="text-ink">“{q}”</span>
          {" · "}
          <Link href={href({ q: null })} className="text-vermillion hover:underline">
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
            <Link href={href({ page: safePage - 1 })} className="pill" rel="prev">
              ← Prev
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: n })}
              aria-current={n === safePage ? "page" : undefined}
              className={`pill ${n === safePage ? "pill--active" : ""}`}
            >
              {n}
            </Link>
          ))}
          {safePage < totalPages && (
            <Link href={href({ page: safePage + 1 })} className="pill" rel="next">
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
