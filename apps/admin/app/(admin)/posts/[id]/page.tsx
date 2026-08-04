import { notFound } from "next/navigation";
import { connectToDatabase, PostModel } from "@cricket-blog/db";
import type { Post } from "@cricket-blog/types";
import { PostEditor } from "./post-editor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await connectToDatabase();
  const post = (await PostModel.findById(id).lean()) as unknown as Post | null;
  if (!post) notFound();

  return (
    <PostEditor
      post={{
        ...post,
        _id: String(post._id),
        matchRef: String(post.matchRef),
        generatedAt: String(post.generatedAt),
        publishedAt: post.publishedAt ? String(post.publishedAt) : null,
      }}
    />
  );
}
