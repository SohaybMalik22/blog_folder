import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/posts";
import { SPORT_META, SPORT_ORDER } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BLOG_BASE_URL ?? "http://localhost:3000";
  const posts = await getPublishedPosts();

  // A sport section with nothing published is a thin page; leaving it out of the
  // sitemap keeps it from being crawled before it has content.
  const sports = SPORT_ORDER.filter((sport) => posts.some((post) => post.sport === sport));

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/posts`, lastModified: new Date() },
    ...sports.map((sport) => ({
      url: `${base}/sports/${SPORT_META[sport].slug}`,
      lastModified: new Date(),
    })),
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    })),
  ];
}
