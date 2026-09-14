import { contentHash, sha256Hex } from "../lib/hash.js";

export type ScrapedPage = {
  url: string;
  title: string;
  excerpt: string;
  markdown?: string;
  publisher?: string;
  source_id: string;
  kind: "data";
  retrieved_at: string;
  content_hash: string;
  citation?: string;
};

export function sourceIdFromUrl(url: string): string {
  const hash = sha256Hex(url).slice(0, 8);
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-");
    return `news-${host}-${hash}`.replace(/-+/g, "-").slice(0, 128);
  } catch {
    return `news-${hash}`;
  }
}

export function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function clipExcerpt(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 8000) return trimmed || "No excerpt.";
  return `${trimmed.slice(0, 7997)}...`;
}

export function titleFromMarkdown(markdown: string, fallback: string): string {
  for (const line of markdown.split("\n")) {
    const title = line.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
    if (title.length > 8) return title.slice(0, 200);
  }
  return fallback;
}

export function pageFromText(requested: string, title: string, markdown: string): ScrapedPage {
  const excerpt = clipExcerpt(markdown || title);
  const retrieved_at = new Date().toISOString();
  return {
    url: requested,
    title,
    excerpt,
    markdown: markdown ? markdown.slice(0, 20_000) : undefined,
    publisher: hostnameOf(requested),
    source_id: sourceIdFromUrl(requested),
    kind: "data",
    retrieved_at,
    content_hash: contentHash(excerpt),
    citation: title,
  };
}

/** True for PDF URLs. Those must not go to Firecrawl. */
export function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return true;
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "juris-assets.bettergov.ph" && path.startsWith("/pdfs/")) return true;
  } catch {
    return /\.pdf(?:$|[?#])/i.test(url);
  }
  return /\.pdf(?:$|[?#])/i.test(url);
}
