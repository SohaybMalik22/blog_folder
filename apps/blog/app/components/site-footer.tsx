import Link from "next/link";
import type { Sport } from "@cricket-blog/types";
import { SITE_NAME, SITE_TAGLINE, SPORT_META, SPORT_ORDER, sportHref } from "@/lib/site";

export function SiteFooter({
  tags,
  counts,
}: {
  tags: string[];
  counts: Record<Sport, number>;
}) {
  const sports = SPORT_ORDER.filter((sport) => counts[sport] > 0);
  // Every sport whose data licence asks for attribution, credited once here in
  // addition to the per-article credit on its own dispatches.
  const credits = sports
    .map((sport) => SPORT_META[sport].dataCredit)
    .filter((credit): credit is NonNullable<typeof credit> => !!credit);

  return (
    <footer className="mt-20 bg-forest text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="font-display text-xl font-bold uppercase tracking-[0.14em]">
            {SITE_NAME}
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/65">
            {SITE_TAGLINE} Classifications, scorecards, venues and dates — never
            rewritten from anyone else&apos;s copy.
          </p>
          {credits.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {credits.map((credit) => (
                <li key={credit.href}>
                  <a
                    href={credit.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-sm text-paper/50 underline transition-colors hover:text-paper/80"
                  >
                    {credit.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="label border-b border-forest-line pb-2 text-paper/50">
            Sections
          </h2>
          <ul className="mt-4 space-y-2.5">
            {[
              ...sports.map((sport) => ({
                href: sportHref(sport),
                label: SPORT_META[sport].label,
              })),
              { href: "/posts", label: "All dispatches" },
              { href: "/contact", label: "Contact" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-paper/75 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="label border-b border-forest-line pb-2 text-paper/50">
            Topics
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {tags.slice(0, 8).map((tag) => (
              <li key={tag}>
                <Link
                  href={`/posts?tag=${encodeURIComponent(tag)}`}
                  className="text-sm text-paper/75 transition-colors hover:text-white"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-forest-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <span className="label-sm text-paper/45">
            © {new Date().getFullYear()} {SITE_NAME}
          </span>
          <span className="label-sm text-paper/45">
            Generated from official data, reviewed before publication · Photos via{" "}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-paper/70"
            >
              Pexels
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
