"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Post } from "@cricket-blog/types";

type Action = "save" | "approve" | "reject" | "regenerate";

export function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [metaDescription, setMetaDescription] = useState(post.metaDescription);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [bodyMarkdown, setBodyMarkdown] = useState(post.bodyMarkdown);
  const [imageAlt, setImageAlt] = useState(post.imageAlt);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function runAction(action: Action) {
    setBusy(action);
    setNotice(null);
    try {
      if (action === "save") {
        const res = await fetch(`/api/posts/${post._id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            metaDescription,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            bodyMarkdown,
            imageAlt,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setNotice({ tone: "ok", text: "Changes saved." });
        router.refresh();
      } else {
        const res = await fetch(`/api/posts/${post._id}/${action}`, { method: "POST" });
        if (!res.ok) throw new Error(await res.text());

        if (action === "regenerate") {
          setNotice({ tone: "ok", text: "Regenerated from the fixture." });
          router.refresh();
        } else {
          router.push("/posts");
        }
      }
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const confidence = Math.round(post.confidenceScore * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/posts" className="text-[0.75rem] font-semibold text-brand hover:underline">
          ← Back to dispatches
        </Link>
        {notice && (
          <p
            role="status"
            className={`text-[0.75rem] font-semibold ${
              notice.tone === "ok" ? "text-ok" : "text-bad"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* Editable fields */}
        <div className="card p-5">
          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="eyebrow">
                Title
              </label>
              <input
                id="title"
                className="input mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="meta" className="eyebrow">
                Meta description
              </label>
              <input
                id="meta"
                className="input mt-1.5"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
              <p className="mt-1 text-[0.6875rem] text-ink-soft">
                {metaDescription.length} characters · under 160 reads best in search results
              </p>
            </div>

            <div>
              <label htmlFor="tags" className="eyebrow">
                Tags
              </label>
              <input
                id="tags"
                className="input mt-1.5"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="mt-1 text-[0.6875rem] text-ink-soft">Separate with commas</p>
            </div>

            <div>
              <label htmlFor="body" className="eyebrow">
                Body (Markdown)
              </label>
              <textarea
                id="body"
                className="input mt-1.5 h-96 resize-y font-mono text-[0.8125rem] leading-relaxed"
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="alt" className="eyebrow">
                Image alt text
              </label>
              <input
                id="alt"
                className="input mt-1.5"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Meta + actions */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt={imageAlt} className="aspect-video w-full object-cover" />
            <div className="space-y-2 p-4">
              {post.imageCredit && (
                <p className="text-[0.6875rem] text-ink-soft">{post.imageCredit}</p>
              )}
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="eyebrow">Status</dt>
                  <dd className="text-[0.8125rem] font-semibold capitalize text-ink">
                    {post.status}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="eyebrow">Confidence</dt>
                  <dd className="text-[0.8125rem] font-semibold text-ink">{confidence}/100</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="eyebrow">Edited by admin</dt>
                  <dd className="text-[0.8125rem] font-semibold text-ink">
                    {post.editedByAdmin ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="card space-y-2 p-4">
            <button
              onClick={() => runAction("save")}
              disabled={busy !== null}
              className="btn btn--ghost w-full"
            >
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => runAction("approve")}
              disabled={busy !== null}
              className="btn btn--brand w-full"
            >
              {busy === "approve" ? "Publishing…" : "Approve & publish"}
            </button>
            <button
              onClick={() => runAction("regenerate")}
              disabled={busy !== null}
              className="btn btn--ghost w-full"
            >
              {busy === "regenerate" ? "Regenerating…" : "Regenerate from fixture"}
            </button>
            <button
              onClick={() => runAction("reject")}
              disabled={busy !== null}
              className="btn btn--danger w-full"
            >
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </button>
            <p className="pt-1 text-[0.6875rem] leading-snug text-ink-soft">
              Publishing revalidates the blog immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
