import Link from "next/link";
import type { Sport } from "@cricket-blog/types";
import { SITE_NAME, SPORT_META, SPORT_ORDER, sportHref } from "@/lib/site";

/**
 * Sport sections lead the nav — they're the site's top-level structure now that
 * more than one sport is covered. `counts` hides a sport that has nothing
 * published yet, so the nav never links to an empty section.
 */
export function SiteHeader({ counts }: { counts: Record<Sport, number> }) {
  const sports = SPORT_ORDER.filter((sport) => counts[sport] > 0);

  return (
    <header className="bg-forest text-paper">
      {/* Dateline strip: names the competitions currently in coverage. */}
      <div className="border-b border-forest-line/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6">
          <span className="label-sm text-paper/55">
            {sports.map((sport) => SPORT_META[sport].competition).join("  ·  ") ||
              "Awaiting first dispatch"}
          </span>
          <span className="label-sm hidden text-paper/55 sm:block">
            Written from the official record
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <span className="font-display text-xl font-bold uppercase tracking-[0.14em] sm:text-2xl">
            {SITE_NAME}
          </span>
        </Link>

        <span aria-hidden className="hidden h-px flex-1 bg-forest-line lg:block" />

        <nav aria-label="Sections">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {sports.map((sport) => (
              <li key={sport}>
                <Link
                  href={sportHref(sport)}
                  className="label text-paper/80 transition-colors hover:text-white"
                >
                  {SPORT_META[sport].label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/posts"
                className="label text-paper/80 transition-colors hover:text-white"
              >
                All dispatches
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="label text-paper/80 transition-colors hover:text-white"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <form action="/posts" role="search" className="ml-auto flex items-center gap-2">
          <label htmlFor="site-search" className="sr-only">
            Search dispatches
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search"
            className="label w-36 border border-forest-line bg-forest-deep px-3 py-2 text-paper placeholder:text-paper/45 focus:border-vermillion focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
}
