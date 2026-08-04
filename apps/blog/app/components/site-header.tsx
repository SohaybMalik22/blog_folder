import Link from "next/link";

const NAV = [
  { href: "/posts", label: "All dispatches" },
  { href: "/posts?tag=T20+Cricket", label: "T20" },
  { href: "/posts?tag=Match+Preview", label: "Previews" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="bg-forest text-paper">
      {/* Dateline strip: names the competition every dispatch belongs to. */}
      <div className="border-b border-forest-line/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6">
          <span className="label-sm text-paper/55">
            Asian Legends League · Season 2
          </span>
          <span className="label-sm hidden text-paper/55 sm:block">
            Lusaka &amp; Sharjah · T20
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <span className="font-display text-xl font-bold uppercase tracking-[0.14em] sm:text-2xl">
            Cricket Beat
          </span>
        </Link>

        <span aria-hidden className="hidden h-px flex-1 bg-forest-line lg:block" />

        <nav aria-label="Sections">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="label text-paper/80 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
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
