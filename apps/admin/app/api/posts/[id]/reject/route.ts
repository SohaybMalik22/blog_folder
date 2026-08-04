import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase, PostModel } from "@cricket-blog/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectToDatabase();
  const post = await PostModel.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ post });
}
