import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BLOG_BASE_URL ?? "http://localhost:3000";
  const posts = await getPublishedPosts();

  return [
    { url: base, lastModified: new Date() },
    ...posts.map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    })),
  ];
}
