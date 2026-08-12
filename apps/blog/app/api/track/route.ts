import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, PageViewModel } from "@cricket-blog/db";
import { isSport } from "@cricket-blog/types";

/**
 * First-party pageview ingestion.
 *
 * The blog is prerendered (SSG + ISR), so a served page is a cache hit that
 * never reaches the server — counting has to come from a client beacon, which is
 * what posts here.
 *
 * No cookies and no stored identifier: uniqueness comes from a daily-rotating
 * salted hash of IP + user agent, so counts work but the hashes can't be linked
 * across days or back to a person. That is the whole reason this needs no
 * consent banner, so don't "improve" it by storing the raw IP.
 */

// Matches the common crawler/monitor agents. Bots are the majority of hits on a
// new site, and counting them would answer "is traffic coming?" with a yes that
// means nothing.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|slack|semrush|ahrefs|mj12|dotbot|petal|headless|lighthouse|gtmetrix|pingdom|uptime|curl|wget|python-requests|axios|node-fetch|go-http-client|java\/|okhttp/i;

const MOBILE_PATTERN = /android|iphone|ipod|windows phone|mobile/i;
const TABLET_PATTERN = /ipad|tablet|kindle|silk|playbook/i;

/**
 * Rotates daily so a hash is only comparable within one day. Falls back to a
 * per-process random value when unset — that still prevents cross-day linkage
 * and never blocks ingestion, but unique counts split across a restart, so set
 * ANALYTICS_SALT in production.
 */
const FALLBACK_SALT = randomBytes(32).toString("hex");

function visitorHashFor(request: NextRequest, userAgent: string): string {
  const salt = process.env.ANALYTICS_SALT ?? FALLBACK_SALT;
  // x-forwarded-for is a client-controlled header, so this is not a trustworthy
  // identity — it only needs to be stable enough to dedupe honest visitors.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const day = new Date().toISOString().slice(0, 10);

  return createHash("sha256").update(`${salt}:${day}:${ip}:${userAgent}`).digest("hex");
}

function deviceFrom(userAgent: string): "mobile" | "tablet" | "desktop" {
  // Tablet first: iPad user agents also contain "Mobile".
  if (TABLET_PATTERN.test(userAgent)) return "tablet";
  if (MOBILE_PATTERN.test(userAgent)) return "mobile";
  return "desktop";
}

/** Host only, and never our own domain — a same-site navigation isn't a referral. */
function referrerHostFrom(referrer: unknown, request: NextRequest): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const selfHost = request.headers.get("host")?.split(":")[0]?.replace(/^www\./, "");
    return host && host !== selfHost ? host : null;
  } catch {
    return null;
  }
}

/** Path without query or hash, length-capped so a crafted URL can't bloat a document. */
function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  const path = raw.split(/[?#]/)[0];
  return path.length > 200 ? null : path;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  // Silent 204 rather than an error: the beacon is fire-and-forget and a
  // rejected event is not a client problem to report.
  if (!userAgent || BOT_PATTERN.test(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const { path: rawPath, referrer, postSlug, sport } = (body ?? {}) as Record<string, unknown>;
  const path = normalizePath(rawPath);
  if (!path) return new NextResponse(null, { status: 204 });

  try {
    await connectToDatabase();
    await PageViewModel.create({
      path,
      postSlug: typeof postSlug === "string" && postSlug ? postSlug : null,
      sport: isSport(sport) ? sport : null,
      referrerHost: referrerHostFrom(referrer, request),
      visitorHash: visitorHashFor(request, userAgent),
      device: deviceFrom(userAgent),
      // Set by Vercel's edge; absent locally.
      country: request.headers.get("x-vercel-ip-country") ?? null,
      ts: new Date(),
    });
  } catch (err) {
    // Analytics must never break a page view. Log and move on.
    console.warn(`pageview not recorded: ${(err as Error).message}`);
  }

  return new NextResponse(null, { status: 204 });
}
