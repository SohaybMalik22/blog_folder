import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { RawMatch, GeneratedArticle } from "@cricket-blog/types";

const TEXT_MODEL = "gemini-3.5-flash";
// Image model must be a generateContent-style image model, not an Imagen
// `predict` model — Imagen is not available on newer API keys.
const IMAGE_MODEL = "gemini-3.1-flash-image";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

const ARTICLE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    metaDescription: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    bodyMarkdown: { type: Type.STRING },
    imageAlt: { type: Type.STRING },
    imagePrompt: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
  },
  required: [
    "title",
    "slug",
    "metaDescription",
    "tags",
    "bodyMarkdown",
    "imageAlt",
    "imagePrompt",
    "confidenceScore",
  ],
};

function buildPrompt(match: RawMatch): string {
  // No player performances means the match hasn't been played yet (a fixture,
  // not a result) — write a preview instead of inventing a result.
  const isPreview = match.playerPerformances.length === 0;

  const factsBlock = JSON.stringify(
    {
      matchTitle: match.matchTitle,
      teams: match.teams,
      venue: match.venue,
      date: match.date,
      format: match.format,
      scorecard: match.scorecard,
      playerPerformances: match.playerPerformances,
    },
    null,
    2
  );

  if (isPreview) {
    return `You are a cricket journalist writing an ORIGINAL preview article for an UPCOMING
match. You are given structured fixture facts (not prose from any source, and no result
exists yet). Write a genuinely new ~400-word preview — never invent a score, winner, or
any event that hasn't happened. Focus on the teams, context, and what to watch for.

Fixture facts (JSON):
${factsBlock}

Requirements:
- title: SEO-friendly, under 70 characters, must read as a preview (not report a result)
- slug: lowercase, hyphenated, derived from the title
- metaDescription: under 160 characters
- tags: 3-6 relevant tags (team names, format, tournament name)
- bodyMarkdown: ~400 words, Markdown formatted, preview-style (no invented outcome)
- imageAlt: descriptive alt text for a cover image (accessibility + SEO)
- imagePrompt: a prompt to hand to an image generator for a cover image depicting this
  fixture's theme (no text/logos/scoreboards in the image, editorial/photographic style)
- confidenceScore: 0.0-1.0, your own estimate of how factually grounded this preview is
  given the input data (low if fixture data was sparse)`;
  }

  return `You are a cricket journalist writing an ORIGINAL analysis article. You are given
structured match facts (not prose from any source). Write a genuinely new ~600-word
article — never copy or lightly reword any external text, because you were not given any.

Match facts (JSON):
${factsBlock}

Requirements:
- title: SEO-friendly, under 70 characters
- slug: lowercase, hyphenated, derived from the title
- metaDescription: under 160 characters
- tags: 3-6 relevant tags (team names, format, player names)
- bodyMarkdown: ~600 words, Markdown formatted, headings where useful, analysis-driven
  (not just a play-by-play restating of the scorecard)
- imageAlt: descriptive alt text for a cover image (accessibility + SEO)
- imagePrompt: a prompt to hand to an image generator for a cover image depicting this
  match's theme (no text/logos/scoreboards in the image, editorial/photographic style)
- confidenceScore: 0.0-1.0, your own estimate of how factually grounded and complete this
  article is given the input data (low if scorecard data was sparse or ambiguous)`;
}

const MAX_ATTEMPTS = 4;

// 429 (rate limited) and 503 (model overloaded) are routinely transient on the
// free tier, so retry those with backoff instead of dropping the match.
function isTransient(err: unknown): boolean {
  const message = (err as Error)?.message ?? "";
  return message.includes("429") || message.includes("503");
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === MAX_ATTEMPTS) break;
      const delayMs = 5000 * 2 ** (attempt - 1);
      console.warn(`${label} attempt ${attempt} failed, retrying in ${delayMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function generateArticle(match: RawMatch): Promise<GeneratedArticle> {
  const client = getClient();
  return withRetry("generateArticle", async () => {
    const response = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: buildPrompt(match),
      config: {
        responseMimeType: "application/json",
        responseSchema: ARTICLE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned no text for article generation");
    const article = JSON.parse(text) as GeneratedArticle;

    // Gemini emits literal "\n" sequences inside the JSON string rather than
    // real newlines, which leaves the Markdown unparseable (headings and
    // paragraph breaks render as raw text).
    article.bodyMarkdown = article.bodyMarkdown.replace(/\\n/g, "\n");

    return article;
  });
}

export async function generateCoverImage(imagePrompt: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: IMAGE_MODEL,
    contents: imagePrompt,
    config: { responseModalities: [Modality.IMAGE] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imageData = parts.find((part) => part.inlineData?.data)?.inlineData?.data;
  if (!imageData) throw new Error("Gemini returned no image bytes");
  return Buffer.from(imageData, "base64");
}
