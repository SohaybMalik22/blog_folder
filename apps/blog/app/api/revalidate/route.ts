import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await request.json();
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  revalidatePath(`/posts/${slug}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ revalidated: true, slug });
}
