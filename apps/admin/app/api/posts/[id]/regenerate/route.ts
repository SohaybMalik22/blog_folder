import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase, PostModel, RawMatchModel } from "@cricket-blog/db";
import { generateArticle, createCoverImage } from "@cricket-blog/ai";
import { normalizeTags, sportOf, type RawMatch } from "@cricket-blog/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectToDatabase();

  const post = await PostModel.findById(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const match = (await RawMatchModel.findById(post.matchRef).lean()) as unknown as RawMatch | null;
  if (!match) return NextResponse.json({ error: "source match not found" }, { status: 404 });

  const sport = sportOf(match.sport);
  const article = await generateArticle(match);
  const cover = await createCoverImage(article.imagePrompt, `${article.slug}-${Date.now()}`, {
    sport,
    format: match.format,
    tags: article.tags,
  });

  // Re-stamped rather than assumed: a post predating the multi-sport schema has
  // no sport of its own, and its source match is the authority either way.
  post.sport = sport;
  post.title = article.title;
  post.slug = article.slug;
  post.metaDescription = article.metaDescription;
  post.tags = normalizeTags(article.tags);
  post.bodyMarkdown = article.bodyMarkdown;
  post.imageUrl = cover.imageUrl;
  post.imageAlt = cover.imageAlt ?? article.imageAlt;
  post.imageCredit = cover.imageCredit ?? null;
  post.imageCreditUrl = cover.imageCreditUrl ?? null;
  post.confidenceScore = article.confidenceScore;
  post.status = "pending";
  post.editedByAdmin = false;
  await post.save();

  return NextResponse.json({ post });
}
