import Image from "next/image";
import type { Post } from "@cricket-blog/types";
import type { Fixture } from "@/lib/posts";
import { SPORT_META } from "@/lib/site";

export type PlateSize = "lead" | "card" | "article";

const TYPE: Record<
  PlateSize,
  { title: string; vs: string; meta: string; pad: string }
> = {
  lead: {
    title: "text-2xl sm:text-3xl",
    vs: "text-base",
    meta: "text-[0.6875rem]",
    pad: "p-6 sm:p-8",
  },
  article: {
    title: "text-xl sm:text-2xl",
    vs: "text-sm",
    meta: "text-[0.625rem]",
    pad: "p-5 sm:p-7",
  },
  card: {
    title: "text-sm",
    vs: "text-[0.625rem]",
    meta: "text-[0.5625rem]",
    pad: "p-4",
  },
};

/**
 * Cover artwork for a dispatch: licensed photography behind a caption of our
 * own naming the actual event. A bare stock photo can't tell the reader which
 * race or fixture the piece covers, and the alternative — reusing the
 * organiser's promotional graphics or team logos — is not ours to publish.
 *
 * Head-to-head sports get a "A vs B" plate; field events get the event's own
 * name with its round number, since there is no pair of sides to stack.
 */
export function CoverPlate({
  post,
  fixture,
  size = "card",
  priority = false,
}: {
  post: Post;
  fixture: Fixture;
  size?: PlateSize;
  priority?: boolean;
}) {
  const type = TYPE[size];
  const meta = SPORT_META[fixture.sport];
  const isHeadToHead = fixture.teams.length === 2;

  const footnote = [
    fixture.number
      ? `${isHeadToHead ? "Match" : "Round"} ${String(fixture.number).padStart(2, "0")}`
      : null,
    fixture.date,
    // Too tight to be worth it on cards.
    size === "card" ? null : fixture.localTime || fixture.location,
  ].filter(Boolean);

  return (
    <div className="relative aspect-video overflow-hidden bg-forest">
      <Image
        src={post.imageUrl}
        alt={post.imageAlt}
        fill
        priority={priority}
        sizes={
          size === "card"
            ? "(max-width: 768px) 100vw, 33vw"
            : "(max-width: 1024px) 100vw, 65vw"
        }
        className="object-cover"
      />
      {/* Deep forest wash so the caption stays legible over any photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-forest-deep via-forest-deep/80 to-forest-deep/25"
      />

      <div className={`absolute inset-0 flex flex-col justify-between ${type.pad}`}>
        {/* Right-aligned so it never sits under the category chip pinned
            top-left. Omitted on cards, where the space is too tight. */}
        {size === "card" ? (
          <span />
        ) : (
          <p className={`label-sm ${type.meta} text-right text-paper/70`}>
            {meta.competition}
          </p>
        )}

        <div className="text-paper">
          {isHeadToHead ? (
            <>
              <p className={`headline ${type.title} leading-tight`}>{fixture.teams[0]}</p>
              <p className={`label ${type.vs} my-1 text-vermillion`}>vs</p>
              <p className={`headline ${type.title} leading-tight`}>{fixture.teams[1]}</p>
            </>
          ) : (
            <>
              <p className={`headline ${type.title} leading-tight`}>{fixture.headline}</p>
              {fixture.location && (
                <p className={`label ${type.vs} mt-1.5 text-vermillion`}>{fixture.location}</p>
              )}
            </>
          )}
        </div>

        {footnote.length > 0 && (
          <p className={`label-sm ${type.meta} text-paper/75`}>{footnote.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
