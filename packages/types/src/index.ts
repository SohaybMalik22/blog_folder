/**
 * Sports the pipeline covers. Each one needs a scraper adapter, a Gemini prompt
 * branch (`buildPrompt`) and a Pexels scene list — adding a value here without
 * those three is what produces generic, sport-blind articles.
 */
export type Sport = "cricket" | "motorsport";

export const SPORTS: Sport[] = ["cricket", "motorsport"];

export const SPORT_LABELS: Record<Sport, string> = {
  cricket: "Cricket",
  motorsport: "Formula 1",
};

/** Documents written before the pipeline was multi-sport carry no `sport`. */
export const DEFAULT_SPORT: Sport = "cricket";

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && SPORTS.includes(value as Sport);
}

export function sportOf(value: unknown): Sport {
  return isSport(value) ? value : DEFAULT_SPORT;
}

/**
 * Head-to-head sports (cricket) name two teams; field sports like motorsport
 * have a whole grid instead, so `teams` is empty and `standings` carries the
 * finishing order. Formats are free-form strings rather than an enum because
 * "T20" and "Grand Prix" don't share a vocabulary.
 */
export type MatchFormat = string;

export type RawMatchStatus = "new" | "processed";

export interface PlayerPerformance {
  name: string;
  runs?: number;
  balls?: number;
  wickets?: number;
  overs?: number;
  strikeRate?: number;
  economy?: number;
}

/**
 * One competitor's finishing record in a field event — a driver in a race, and
 * the shape any future non-head-to-head sport should reuse.
 */
export interface EventStanding {
  position: number;
  name: string;
  /** Constructor, stable, or club the competitor represents. */
  team?: string;
  /** Free-form result detail: finishing time, gap, or retirement reason. */
  detail?: string;
  points?: number;
}

export interface RawMatch {
  _id: string;
  sport: Sport;
  sourceUrl: string;
  scrapedAt: string;
  matchTitle: string;
  /** The competition this event belongs to, e.g. "Formula 1 2026". */
  competition: string;
  /** Exactly two for head-to-head sports; empty for field events. */
  teams: string[];
  venue: string;
  date: string;
  format: MatchFormat;
  scorecard: Record<string, unknown>;
  playerPerformances: PlayerPerformance[];
  /** Finishing order for field events; empty for head-to-head sports. */
  standings: EventStanding[];
  /** Image URLs found on the source page, recorded as provenance only. */
  sourceImages: string[];
  status: RawMatchStatus;
}

/** True once the event has been contested and real results exist. */
export function hasResults(match: Pick<RawMatch, "playerPerformances" | "standings">): boolean {
  return (match.playerPerformances?.length ?? 0) > 0 || (match.standings?.length ?? 0) > 0;
}

export type PostStatus = "pending" | "published" | "rejected";

export interface Post {
  _id: string;
  matchRef: string;
  /** Denormalised from the source event so the blog can filter by sport
   *  without joining `raw_matches` on every listing query. */
  sport: Sport;
  title: string;
  slug: string;
  metaDescription: string;
  tags: string[];
  bodyMarkdown: string;
  imageUrl: string;
  imageAlt: string;
  /** Photographer credit, when the cover came from a stock library. */
  imageCredit: string | null;
  imageCreditUrl: string | null;
  status: PostStatus;
  confidenceScore: number;
  generatedAt: string;
  publishedAt: string | null;
  editedByAdmin: boolean;
}

export interface AdminUser {
  _id: string;
  email: string;
  passwordHash: string;
  role: "admin";
}

/**
 * Gemini is inconsistent about tag separators and casing ("Match Preview" vs
 * "Match-Preview" vs "match preview"), which otherwise produces duplicate
 * filter entries. Normalising on write and on read keeps one canonical form.
 */
export function normalizeTag(tag: string): string {
  return tag
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) seen.set(key, normalized);
  }
  return [...seen.values()];
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  metaDescription: string;
  tags: string[];
  bodyMarkdown: string;
  imageAlt: string;
  imagePrompt: string;
  confidenceScore: number;
}
