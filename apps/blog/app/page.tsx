import Link from "next/link";
import Image from "next/image";
import {
  getPublishedPosts,
  getSeasonFixtures,
  getTagIndex,
  isLabelled,
  withFixtures,
} from "@/lib/posts";
import { BYLINE, categoryOf, formatDateline, readTime } from "@/lib/format";
import { SPORT_META, SPORT_ORDER, sportHref } from "@/lib/site";
import { AnalyticsBeacon } from "./components/analytics-beacon";
import { PostCard } from "./components/post-card";
import { InsiderPanel } from "./components/insider-panel";
import { FixtureList } from "./components/fixture-list";
import { CoverPlate } from "./components/cover-plate";

export const revalidate = 3600;

export default async function HomePage() {
  const [posts, tags, fixtures] = await Promise.all([
    getPublishedPosts(),
    getTagIndex(),
    // The lead sport's schedule: the sidebar has room for one, and the other
    // sports' calendars live on their own landing pages.
    getSeasonFixtures(SPORT_ORDER[0], 6),
  ]);

  if (posts.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="label text-vermillion">Nothing on the wire</p>
        <h1 className="headline mt-4 text-4xl">The desk is empty</h1>
        <p className="mt-4 text-muted">
          No dispatches have been published yet. Approve a post in the admin to
          see it land here.
        </p>
      </main>
    );
  }

  const [leadEntry, ...rest] = await withFixtures(posts);
  const lead = leadEntry.post;

  // With a thin archive, feeding the sidebar list would leave the card grid
  // empty. Below four remaining posts the sidebar keeps only the Insider panel
  // and every other post goes into the grid instead.
  const useSidebarStories = rest.length >= 4;
  const topStories = useSidebarStories ? rest.slice(0, 3) : [];
  const dispatches = useSidebarStories ? rest.slice(3, 9) : rest.slice(0, 6);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <AnalyticsBeacon />

      {/* Lead + sidebar */}
      <section className="grid gap-10 lg:grid-cols-[1.85fr_1fr]">
        <article className="group">
          <Link href={`/posts/${lead.slug}`} className="relative block">
            {isLabelled(leadEntry.fixture) ? (
              <CoverPlate post={lead} fixture={leadEntry.fixture} size="lead" priority />
            ) : (
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={lead.imageUrl}
                  alt={lead.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover"
                />
              </div>
            )}
            <span className="tag absolute left-0 top-0">{categoryOf(lead.tags)}</span>
          </Link>

          <p className="label mt-5 text-vermillion">Lead dispatch</p>
          <h1 className="headline mt-2 text-3xl sm:text-4xl md:text-[2.75rem]">
            <Link href={`/posts/${lead.slug}`} className="hover:text-vermillion">
              {lead.title}
            </Link>
          </h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-muted">
            {lead.metaDescription}
          </p>
          <p className="label-sm mt-4 text-muted">
            {formatDateline(lead.publishedAt)} · {readTime(lead.bodyMarkdown)} · By {BYLINE}
          </p>
        </article>

        <aside className="space-y-8">
          {topStories.length > 0 && (
            <div>
              <h2 className="section-head">
                <span className="label">Top stories</span>
              </h2>
              <ul className="divide-y divide-rule">
                {topStories.map(({ post }) => (
                  <li key={post._id} className="py-4 first:pt-0">
                    <p className="label-sm text-vermillion">{categoryOf(post.tags)}</p>
                    <h3 className="headline mt-1.5 text-lg">
                      <Link href={`/posts/${post.slug}`} className="hover:text-vermillion">
                        {post.title}
                      </Link>
                    </h3>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fixtures.length > 0 && (
            <FixtureList fixtures={fixtures} sport={SPORT_ORDER[0]} />
          )}

          <InsiderPanel />
        </aside>
      </section>

      {/* Recent dispatches */}
      {dispatches.length > 0 && (
        <section className="mt-16">
          <div className="section-head">
            <h2 className="headline text-2xl">Recent dispatches</h2>
            <Link href="/posts" className="label text-vermillion hover:underline">
              View all posts →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dispatches.map(({ post, fixture }) => (
              <PostCard key={post._id} post={post} fixture={fixture} caps={false} />
            ))}
          </div>
        </section>
      )}

      {/* Sport sections: the site's top-level structure, so it gets a block of
          its own rather than living only in the masthead. */}
      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        {SPORT_ORDER.filter((sport) => posts.some((p) => p.sport === sport)).map((sport) => {
          const meta = SPORT_META[sport];
          const count = posts.filter((p) => p.sport === sport).length;
          return (
            <Link
              key={sport}
              href={sportHref(sport)}
              className="group border border-rule bg-card p-6 transition-colors hover:border-vermillion"
            >
              <p className="label text-vermillion">{meta.competition}</p>
              <h2 className="headline mt-2 text-2xl group-hover:text-vermillion">
                {meta.label}
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                {meta.blurb}
              </p>
              <p className="label-sm mt-4 text-muted">
                {count} {count === 1 ? "dispatch" : "dispatches"} →
              </p>
            </Link>
          );
        })}
      </section>

      {/* Explore */}
      {tags.length > 0 && (
        <section className="mt-16 border-y border-rule py-10 text-center">
          <h2 className="label text-muted">Explore by topic</h2>
          <ul className="mt-5 flex flex-wrap justify-center gap-2.5">
            {tags.slice(0, 10).map((tag) => (
              <li key={tag}>
                <Link href={`/posts?tag=${encodeURIComponent(tag)}`} className="pill inline-block">
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
