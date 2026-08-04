import Image from "next/image";
import type { Post } from "@cricket-blog/types";
import type { Fixture } from "@/lib/posts";

type Size = "lead" | "card" | "article";

const TYPE: Record<Size, { team: string; vs: string; meta: string; pad: string }> = {
  lead: { team: "text-2xl sm:text-3xl", vs: "text-base", meta: "text-[0.6875rem]", pad: "p-6 sm:p-8" },
  article: { team: "text-xl sm:text-2xl", vs: "text-sm", meta: "text-[0.625rem]", pad: "p-5 sm:p-7" },
  card: { team: "text-sm", vs: "text-[0.625rem]", meta: "text-[0.5625rem]", pad: "p-4" },
};

/**
 * Cover artwork for a fixture dispatch: licensed cricket photography behind a
 * fixture caption of our own. The reader can tell which match the piece is
 * about — which a bare stock photo can't do — without using the tournament's
 * own promotional graphics or team logos.
 */
export function VersusPlate({
  post,
  fixture,
  size = "card",
  priority = false,
}: {
  post: Post;
  fixture: Fixture;
  size?: Size;
  priority?: boolean;
}) {
  const [home, away] = fixture.teams;
  const type = TYPE[size];

  const meta = [
    fixture.number ? `Match ${String(fixture.number).padStart(2, "0")}` : null,
    fixture.date,
    // Kick-off time is detail the card grid has no room for.
    size === "card" ? null : fixture.localTime,
  ].filter(Boolean);

  return (
    <div className="relative aspect-video overflow-hidden bg-forest">
      <Image
        src={post.imageUrl}
        alt={post.imageAlt}
        fill
        priority={priority}
        sizes={size === "card" ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 1024px) 100vw, 65vw"}
        className="object-cover"
      />
      {/* Deep forest wash so the caption stays legible over any photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-forest-deep via-forest-deep/80 to-forest-deep/25"
      />

      <div className={`absolute inset-0 flex flex-col justify-between ${type.pad}`}>
        {/* Right-aligned so it never sits under the category chip pinned top-left.
            Omitted on cards, where the space is too tight to be worth it. */}
        {size === "card" ? (
          <span />
        ) : (
          <p className={`label-sm ${type.meta} text-right text-paper/70`}>
            Asian Legends League
          </p>
        )}

        <div className="text-paper">
          <p className={`headline ${type.team} leading-tight`}>{home}</p>
          <p className={`label ${type.vs} my-1 text-vermillion`}>vs</p>
          <p className={`headline ${type.team} leading-tight`}>{away}</p>
        </div>

        {meta.length > 0 && (
          <p className={`label-sm ${type.meta} text-paper/75`}>{meta.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
