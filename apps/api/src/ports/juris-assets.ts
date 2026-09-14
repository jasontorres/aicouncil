import { isPdfUrl, pageFromText, titleFromMarkdown, type ScrapedPage } from "./scrape-page.js";

export const JURIS_ASSETS_ORIGIN = "https://juris-assets.bettergov.ph";

type FetchLike = typeof fetch;

/** Map a Juris PDF (or markdown) URL to the processed markdown object. */
export function jurisMarkdownUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "juris-assets.bettergov.ph") return null;
  const path = parsed.pathname;
  if (path.startsWith("/markdowns/") && path.toLowerCase().endsWith(".md")) {
    return `${JURIS_ASSETS_ORIGIN}${path}`;
  }
  if (path.startsWith("/pdfs/") && path.toLowerCase().endsWith(".pdf")) {
    const rest = path.slice("/pdfs/".length, -".pdf".length);
    return `${JURIS_ASSETS_ORIGIN}/markdowns/${rest}.md`;
  }
  return null;
}

export async function fetchJurisMarkdown(
  requested: string,
  opts: { fetchImpl?: FetchLike } = {},
): Promise<ScrapedPage | null> {
  const mdUrl = jurisMarkdownUrl(requested);
  if (!mdUrl) return null;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetchImpl(mdUrl, {
      headers: {
        accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
        "user-agent": "Sanggunian/AICouncil.ph (juris-assets markdown)",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
    if (ctype.includes("text/html")) return null;
    const text = (await res.text()).trim();
    if (!text || text.startsWith("<!")) return null;
    const title = titleFromMarkdown(text, requested);
    return pageFromText(requested, title, text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function shouldSkipFirecrawl(url: string): boolean {
  return isPdfUrl(url) || jurisMarkdownUrl(url) != null;
}
