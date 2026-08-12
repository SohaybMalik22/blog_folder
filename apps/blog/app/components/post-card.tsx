import Link from "next/link";
import Image from "next/image";
import type { Post } from "@cricket-blog/types";
import { isLabelled, type Fixture } from "@/lib/posts";
import { BYLINE, categoryOf, formatDateline, readTime } from "@/lib/format";
import { CoverPlate } from "./cover-plate";

export function PostCard({
  post,
  fixture,
  caps = true,
  priority = false,
}: {
  post: Post;
  fixture?: Fixture | null;
  caps?: boolean;
  /** Set on the cards above the fold — on a sport page the grid *is* the LCP. */
  priority?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col border border-rule bg-card">
      <Link href={`/posts/${post.slug}`} className="relative block">
        {isLabelled(fixture) ? (
          <CoverPlate post={post} fixture={fixture} size="card" priority={priority} />
        ) : (
          <div className="relative aspect-4/3 overflow-hidden">
            <Image
              src={post.imageUrl}
              alt={post.imageAlt}
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="plate object-cover"
            />
          </div>
        )}
        <span className="tag absolute left-0 top-0">{categoryOf(post.tags)}</span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="label-sm text-muted">
          {formatDateline(post.publishedAt)} · {readTime(post.bodyMarkdown)}
        </p>

        <h3 className={`mt-3 text-[1.0625rem] ${caps ? "headline-caps" : "headline text-xl"}`}>
          <Link href={`/posts/${post.slug}`} className="hover:text-vermillion">
            {post.title}
          </Link>
        </h3>

        <p className="mt-3 mb-6 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted">
          {post.metaDescription}
        </p>

        {/* mt-auto keeps bylines aligned across cards with different title lengths */}
        <div className="mt-auto flex items-center justify-between border-t border-rule pt-3">
          <span className="label-sm text-muted">{BYLINE}</span>
          <Link
            href={`/posts/${post.slug}`}
            aria-label={`Read ${post.title}`}
            className="text-vermillion transition-transform group-hover:translate-x-1"
          >
            →
          </Link>
        </div>
      </div>
    </article>
  );
}
