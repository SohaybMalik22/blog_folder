"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    href: "/posts",
    label: "Dispatches",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9h10M7 13h6" />
      </>
    ),
  },
  {
    href: "/analytics",
    label: "Traffic",
    icon: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
  },
];

export function Sidebar({ fixturesWaiting }: { fixturesWaiting: number }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-baseline gap-2 px-4 py-4">
        <span className="text-sm font-bold text-ink">Sporting Beat</span>
        <span className="text-[0.625rem] text-ink-faint">Admin</span>
      </div>

      <p className="eyebrow px-4 pb-2 pt-2">Admin console</p>

      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.8125rem] font-medium transition-colors ${
                    active
                      ? "bg-brand-soft text-brand"
                      : "text-ink-soft hover:bg-line-soft hover:text-ink"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        {/* Generation is triggered by the scraper/cron, not composed here, so this
            reports the queue rather than offering a "create" action that would
            bypass the pipeline. */}
        <div className="rounded-md bg-canvas px-3 py-2.5">
          <p className="eyebrow">Fixtures waiting</p>
          <p className="mt-0.5 text-lg font-bold text-ink">{fixturesWaiting}</p>
          <p className="mt-0.5 text-[0.6875rem] leading-snug text-ink-soft">
            Scraped, not yet written up
          </p>
        </div>
      </div>
    </aside>
  );
}
