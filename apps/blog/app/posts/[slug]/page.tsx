import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  getMatchForPost,
  getPublishedPostBySlug,
  getPublishedPosts,
  withFixtures,
} from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { BYLINE, categoryOf, formatDateline, readTime } from "@/lib/format";
import { SITE_NAME, SPORT_META, sportHref } from "@/lib/site";
import { AnalyticsBeacon } from "../../components/analytics-beacon";
import { EventFile } from "../../components/event-file";
import { PostCard } from "../../components/post-card";

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      images: [post.imageUrl],
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [post.imageUrl],
    },
  };
}

/**
 * Splits the rendered body at its second section heading so the Match File
 * block sits between sections rather than interrupting a paragraph. Headings are
 * top-level block boundaries, so slicing there is safe.
 */
function splitAtSecondHeading(html: string): [string, string] {
  const headingPattern = /<h[23][\s>]/gi;
  const positions: number[] = [];
  let hit: RegExpExecArray | null;
  while ((hit = headingPattern.exec(html)) !== null) {
    positions.push(hit.index);
    if (positions.length >= 2) break;
  }
  if (positions.length < 2) return [html, ""];
  return [html.slice(0, positions[1]), html.slice(positions[1])];
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const [match, allPosts] = await Promise.all([
    getMatchForPost(post.matchRef),
    getPublishedPosts(),
  ]);

  const html = renderMarkdown(post.bodyMarkdown);
  const [bodyStart, bodyRest] = match ? splitAtSecondHeading(html) : [html, ""];

  // Same sport first: a cricket preview under an F1 race report reads as an
  // unrelated site. Other sports only backfill when this one is thin.
  const others = allPosts.filter((p) => p.slug !== post.slug);
  const related = await withFixtures(
    [
      ...others.filter((p) => p.sport === post.sport),
      ...others.filter((p) => p.sport !== post.sport),
    ].slice(0, 3)
  );
  const shareUrl = `${process.env.BLOG_BASE_URL ?? "http://localhost:3000"}/posts/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: [post.imageUrl],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  const sportMeta = SPORT_META[post.sport];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Slug and sport are passed explicitly so the admin's top-posts and
          per-sport traffic don't depend on parsing the URL. */}
      <AnalyticsBeacon postSlug={post.slug} sport={post.sport} />

      <article className="mx-auto max-w-2xl">
        <header className="text-center">
          <p className="label text-vermillion">
            <Link href={sportHref(post.sport)} className="hover:underline">
              {sportMeta.label}
            </Link>
            {` · ${categoryOf(post.tags)}`}
          </p>
          <h1 className="headline mt-4 text-3xl sm:text-4xl md:text-[2.6rem]">{post.title}</h1>
          <p className="label-sm mt-5 text-muted">
            {formatDateline(post.publishedAt)} · {readTime(post.bodyMarkdown)} · By {BYLINE}
          </p>
        </header>

        <figure className="mt-8">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={post.imageUrl}
              alt={post.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-sm italic text-muted">
            {post.imageAlt}
            {post.imageCredit && (
              <>
                {" — "}
                {post.imageCreditUrl ? (
                  <a
                    href={post.imageCreditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="not-italic underline decoration-vermillion underline-offset-2"
                  >
                    {post.imageCredit}
                  </a>
                ) : (
                  <span className="not-italic">{post.imageCredit}</span>
                )}
              </>
            )}
          </figcaption>
        </figure>

        <div
          className="dispatch dispatch--lede mt-10"
          dangerouslySetInnerHTML={{ __html: bodyStart }}
        />

        {match && <EventFile match={match} />}

        {bodyRest && <div className="dispatch" dangerouslySetInnerHTML={{ __html: bodyRest }} />}

        {/* Tags */}
        <ul className="mt-10 flex flex-wrap gap-2 border-t border-rule pt-6">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link href={`/posts?tag=${encodeURIComponent(tag)}`} className="pill inline-block">
                {tag}
              </Link>
            </li>
          ))}
        </ul>

        {/* Share — plain links so they work without JavaScript. */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-6">
          <span className="label text-muted">Share this dispatch</span>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="label text-vermillion hover:underline"
          >
            X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="label text-vermillion hover:underline"
          >
            LinkedIn
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(shareUrl)}`}
            className="label text-vermillion hover:underline"
          >
            Email
          </a>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-20">
          <div className="section-head">
            <h2 className="headline text-2xl">More from the desk</h2>
            <Link href="/posts" className="label text-vermillion hover:underline">
              View all posts →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(({ post: p, fixture }) => (
              <PostCard key={p._id} post={p} fixture={fixture} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
