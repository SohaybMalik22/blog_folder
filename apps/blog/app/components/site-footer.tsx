import Link from "next/link";

export function SiteFooter({ tags }: { tags: string[] }) {
  return (
    <footer className="mt-20 bg-forest text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="font-display text-xl font-bold uppercase tracking-[0.14em]">
            Cricket Beat
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/65">
            Match previews and analysis for the Asian Legends League, written from
            the fixture record — scorecards, venues and dates, never rewritten
            from anyone else&apos;s copy.
          </p>
        </div>

        <div>
          <h2 className="label border-b border-forest-line pb-2 text-paper/50">
            Sections
          </h2>
          <ul className="mt-4 space-y-2.5">
            {[
              { href: "/posts", label: "All dispatches" },
              { href: "/posts?tag=Match+Preview", label: "Previews" },
              { href: "/posts?tag=T20+Cricket", label: "T20" },
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
            Teams &amp; topics
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
            © {new Date().getFullYear()} Cricket Beat
          </span>
          <span className="label-sm text-paper/45">
            Generated from fixture data, reviewed before publication · Photos via{" "}
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
