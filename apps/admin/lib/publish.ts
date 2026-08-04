export const AUTO_PUBLISH_THRESHOLD = 0.85;

export async function notifyBlogToRevalidate(slug: string) {
  const base = process.env.BLOG_BASE_URL;
  if (!base) return;
  await fetch(`${base}/api/revalidate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate-secret": process.env.REVALIDATE_SECRET ?? "",
    },
    body: JSON.stringify({ slug }),
  });
}
