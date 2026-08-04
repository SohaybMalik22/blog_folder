export type MatchFormat = "T20" | "ODI" | "Test";

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

export interface RawMatch {
  _id: string;
  sourceUrl: string;
  scrapedAt: string;
  matchTitle: string;
  teams: [string, string];
  venue: string;
  date: string;
  format: MatchFormat;
  scorecard: Record<string, unknown>;
  playerPerformances: PlayerPerformance[];
  /** Image URLs found on the source page, recorded as provenance only. */
  sourceImages: string[];
  status: RawMatchStatus;
}

export type PostStatus = "pending" | "published" | "rejected";

export interface Post {
  _id: string;
  matchRef: string;
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
