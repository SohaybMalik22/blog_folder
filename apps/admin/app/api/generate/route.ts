import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, RawMatchModel, PostModel } from "@cricket-blog/db";
import { generateArticle, createCoverImage } from "@cricket-blog/ai";
import { normalizeTags, type RawMatch } from "@cricket-blog/types";
import { AUTO_PUBLISH_THRESHOLD, notifyBlogToRevalidate } from "@/lib/publish";

const BATCH_SIZE = 5;
// Gemini free tier has a per-minute request cap — space out generations
// within a batch instead of firing them concurrently.
const DELAY_BETWEEN_MATCHES_MS = 4000;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const rawMatches = (await RawMatchModel.find({ status: "new" })
    .limit(BATCH_SIZE)
    .lean()) as unknown as RawMatch[];

  const results: Array<{ matchId: string; postId?: string; status?: string; error?: string }> = [];

  for (const match of rawMatches) {
    try {
      const article = await generateArticle(match);
      const cover = await createCoverImage(article.imagePrompt, article.slug, {
        format: match.format,
        tags: article.tags,
      });

      const status = article.confidenceScore >= AUTO_PUBLISH_THRESHOLD ? "published" : "pending";

      const post = await PostModel.create({
        matchRef: match._id,
        title: article.title,
        slug: article.slug,
        metaDescription: article.metaDescription,
        tags: normalizeTags(article.tags),
        bodyMarkdown: article.bodyMarkdown,
        imageUrl: cover.imageUrl,
        imageAlt: cover.imageAlt ?? article.imageAlt,
        imageCredit: cover.imageCredit ?? null,
        imageCreditUrl: cover.imageCreditUrl ?? null,
        confidenceScore: article.confidenceScore,
        status,
        publishedAt: status === "published" ? new Date() : null,
      });

      await RawMatchModel.findByIdAndUpdate(match._id, { status: "processed" });

      if (status === "published") {
        await notifyBlogToRevalidate(post.slug);
      }

      results.push({ matchId: String(match._id), postId: String(post._id), status });
    } catch (err) {
      results.push({ matchId: String(match._id), error: (err as Error).message });
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_MATCHES_MS));
  }

  return NextResponse.json({ processed: results.length, results });
}
