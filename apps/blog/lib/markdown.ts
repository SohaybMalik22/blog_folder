import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt"],
    },
  });
}
