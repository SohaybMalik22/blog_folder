"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports one pageview per navigation to our own /api/track.
 *
 * A client beacon rather than server-side counting because the blog's pages are
 * prerendered — a served page is usually a cache hit that never runs server
 * code, so there is nothing to count there.
 *
 * `postSlug`/`sport` are passed down by the page rather than parsed from the
 * path, so the admin's top-posts and per-sport breakdowns don't depend on URL
 * shape staying stable.
 */
export function AnalyticsBeacon({
  postSlug,
  sport,
}: {
  postSlug?: string | null;
  sport?: string | null;
}) {
  const pathname = usePathname();
  // React runs effects twice in dev StrictMode, and a remount on the same path
  // shouldn't double-count either.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      postSlug: postSlug ?? null,
      sport: sport ?? null,
    });

    // keepalive so the request survives the reader navigating away immediately.
    // Failures are ignored on purpose: a missed count must never surface to a
    // reader as a console error on an article page.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname, postSlug, sport]);

  return null;
}
