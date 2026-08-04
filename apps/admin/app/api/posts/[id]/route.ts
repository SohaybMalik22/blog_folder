import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase, PostModel } from "@cricket-blog/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, metaDescription, tags, bodyMarkdown, imageAlt } = body;

  await connectToDatabase();
  const post = await PostModel.findByIdAndUpdate(
    id,
    { title, metaDescription, tags, bodyMarkdown, imageAlt, editedByAdmin: true },
    { new: true }
  );
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ post });
}
