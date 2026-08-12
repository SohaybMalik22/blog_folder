import { normalizeTags } from "@cricket-blog/types";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function formatDateline(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const WORDS_PER_MINUTE = 200;

export function readTime(markdown: string): string {
  const words = markdown.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

// Tags mix content types ("Match Preview"), formats ("T20 Cricket") and proper
// nouns (team names, drivers, constructors, venues). For the category chip we
// want the type or format, never a competitor name — so those are matched first
// and everything else falls back to the first tag.
const CATEGORY_PATTERNS = [
  /preview/i,
  /analysis/i,
  /report/i,
  /\bt20\b/i,
  /\bodi\b/i,
  /\btest\b/i,
  /grand prix/i,
  /\bf1\b|formula 1/i,
  /championship/i,
];

export function categoryOf(tags: string[]): string {
  const normalized = normalizeTags(tags);
  for (const pattern of CATEGORY_PATTERNS) {
    const hit = normalized.find((tag) => pattern.test(tag));
    if (hit) return hit;
  }
  return normalized[0] ?? "Dispatch";
}

// The posts schema has no author field; everything is generated and then
// signed off in the admin, so the standing byline is the desk itself.
export const BYLINE = "Editorial Desk";
