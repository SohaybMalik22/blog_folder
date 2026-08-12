import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPosts, getSeasonFixtures, getTagIndex, withFixtures } from "@/lib/posts";
import { SPORT_META, SPORT_ORDER, sportFromSlug } from "@/lib/site";
import { AnalyticsBeacon } from "../../components/analytics-beacon";
import { PostCard } from "../../components/post-card";
import { FixtureList } from "../../components/fixture-list";

export const revalidate = 3600;

export async function generateStaticParams() {
  return SPORT_ORDER.map((sport) => ({ sport: SPORT_META[sport].slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport: slug } = await params;
  const sport = sportFromSlug(slug);
  if (!sport) return {};

  const meta = SPORT_META[sport];
  return {
    title: meta.label,
    description: meta.blurb,
    alternates: { canonical: `/sports/${meta.slug}` },
  };
}

export default async function SportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport: slug } = await params;
  const sport = sportFromSlug(slug);
  if (!sport) notFound();

  const meta = SPORT_META[sport];
  const [posts, tags, fixtures] = await Promise.all([
    getPublishedPosts(sport),
    getTagIndex(sport),
    getSeasonFixtures(sport, 8),
  ]);

  const entries = await withFixtures(posts);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <AnalyticsBeacon sport={sport} />

      <header className="border-b border-rule pb-8">
        <p className="label text-vermillion">{meta.competition}</p>
        <h1 className="headline mt-3 text-3xl sm:text-4xl md:text-[2.75rem]">{meta.label}</h1>
        <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-muted">
          {meta.blurb}
        </p>
        <p className="label-sm mt-5 text-muted">
          {posts.length} {posts.length === 1 ? "dispatch" : "dispatches"} published
          {meta.dataCredit && (
            <>
              {" · "}
              <a
                href={meta.dataCredit.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-rule underline-offset-2 hover:text-ink"
              >
                {meta.dataCredit.label}
              </a>
            </>
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.85fr_1fr]">
        <section>
          {entries.length === 0 ? (
            <div className="border border-rule bg-card px-6 py-20 text-center">
              <p className="label text-vermillion">Nothing on the wire</p>
              <h2 className="headline mt-3 text-2xl">
                No {meta.label} dispatches yet
              </h2>
              <p className="mt-3 text-muted">
                The schedule is scraped, but no {meta.eventNoun} has been written up
                yet. Approve a post in the admin to see it land here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {entries.map(({ post, fixture }, index) => (
                <PostCard
                  key={post._id}
                  post={post}
                  fixture={fixture}
                  caps={false}
                  priority={index < 2}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-10">
          {fixtures.length > 0 && <FixtureList fixtures={fixtures} sport={sport} />}

          {tags.length > 0 && (
            <div>
              <h2 className="section-head">
                <span className="label">Topics</span>
              </h2>
              <ul className="flex flex-wrap gap-2.5">
                {tags.slice(0, 12).map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/posts?tag=${encodeURIComponent(tag)}`}
                      className="pill inline-block"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
