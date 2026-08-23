import { llmError } from "../lib/errors.js";
import { contentHash, sha256Hex } from "../lib/hash.js";

export const DEFAULT_NEWS_QUERIES = [
  "Philippines news",
  "Philippines Senate OR Congress OR Comelec OR Malacañang",
  "Philippines controversy OR protest OR investigation OR bill",
];

export const DEFAULT_NEWS_DOMAINS = [
  "inquirer.net",
  "newsinfo.inquirer.net",
  "rappler.com",
  "philstar.com",
  "abs-cbn.com",
  "gmanetwork.com",
  "pcij.org",
  "pna.gov.ph",
  "senate.gov.ph",
  "congress.gov.ph",
  "officialgazette.gov.ph",
  "manilatimes.net",
  "mb.com.ph",
  "verafiles.org",
  "businessmirror.com.ph",
];

export type NewsHit = {
  url: string;
  title: string;
  snippet: string;
  source: "news" | "web";
  query: string;
  date?: string;
};

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

export type FirecrawlPort = {
  configured: boolean;
  search(input: {
    queries: string[];
    limit: number;
    tbs: string;
    includeDomains?: string[];
  }): Promise<NewsHit[]>;
  scrape(url: string): Promise<ScrapedPage>;
};

type FetchLike = typeof fetch;

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export function sourceIdFromUrl(url: string): string {
  const hash = sha256Hex(url).slice(0, 8);
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-");
    return `news-${host}-${hash}`.replace(/-+/g, "-").slice(0, 128);
  } catch {
    return `news-${hash}`;
  }
}

export function createFirecrawlPort(opts: {
  apiKey?: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}): FirecrawlPort {
  const apiKey = opts.apiKey?.trim();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = (opts.baseUrl ?? FIRECRAWL_BASE).replace(/\/$/, "");

  function unconfigured(): never {
    throw llmError(
      503,
      "firecrawl_unconfigured",
      "News scan needs FIRECRAWL_API_KEY on the server. The curator agent does not hold that key. See /CURATOR.md.",
    );
  }

  async function firecrawl<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
    if (!apiKey) unconfigured();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${base}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json: unknown = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { error: text.slice(0, 400) };
      }
      if (!res.ok) {
        throw llmError(
          res.status === 429 ? 429 : res.status >= 500 ? 503 : 502,
          "firecrawl_error",
          firecrawlPublicMessage(res.status),
          { retry_after_seconds: res.status === 429 ? 60 : undefined },
        );
      }
      return json as T;
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) throw err;
      throw llmError(
        503,
        "firecrawl_error",
        "Firecrawl did not respond. Retry later. Do not invent news to fill the gap.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    configured: Boolean(apiKey),

    async search(input) {
      if (!apiKey) unconfigured();
      const hits: NewsHit[] = [];
      const seen = new Set<string>();
      for (const query of input.queries) {
        const payload: Record<string, unknown> = {
          query,
          limit: input.limit,
          country: "PH",
          location: "Philippines",
          tbs: input.tbs,
          sources: ["news", "web"],
        };
        if (input.includeDomains?.length) payload.includeDomains = input.includeDomains;
        const json = await firecrawl<Record<string, unknown>>("/search", payload, 35_000);
        for (const hit of normalizeSearchHits(json, query)) {
          const key = hit.url.replace(/\/+$/, "").toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push(hit);
        }
      }
      return hits;
    },

    async scrape(url) {
      if (!apiKey) unconfigured();
      const json = await firecrawl<Record<string, unknown>>(
        "/scrape",
        { url, formats: ["markdown"] },
        50_000,
      );
      return pageFromScrape(url, json);
    },
  };
}

function firecrawlPublicMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Firecrawl rejected the server key. An operator must rotate FIRECRAWL_API_KEY. Do not paste keys into Issues.";
  }
  if (status === 402) return "Firecrawl credits are exhausted. Skip new scans until the operator tops up.";
  if (status === 429) return "Firecrawl rate-limited the server. Wait and retry the scan.";
  return "Firecrawl search/scrape failed. Retry later. Do not invent article text.";
}

function normalizeSearchHits(json: Record<string, unknown>, query: string): NewsHit[] {
  const data = json.data;
  const out: NewsHit[] = [];
  if (Array.isArray(data)) {
    for (const row of data) out.push(...rowToHits(row, query, "web"));
    return out.filter((h) => h.url && h.title);
  }
  if (data && typeof data === "object") {
    const bag = data as Record<string, unknown>;
    for (const row of asArray(bag.news)) out.push(...rowToHits(row, query, "news"));
    for (const row of asArray(bag.web)) out.push(...rowToHits(row, query, "web"));
  }
  return out.filter((h) => h.url && h.title);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function rowToHits(row: unknown, query: string, source: NewsHit["source"]): NewsHit[] {
  if (!row || typeof row !== "object") return [];
  const r = row as Record<string, unknown>;
  const url = stringish(r.url ?? r.imageUrl);
  const title = stringish(r.title) || stringish(r.metadata && (r.metadata as { title?: string }).title);
  const snippet =
    stringish(r.snippet) ||
    stringish(r.description) ||
    stringish(r.markdown)?.slice(0, 500) ||
    title;
  if (!url) return [];
  return [
    {
      url,
      title: title || url,
      snippet: snippet || title || url,
      source,
      query,
      date: stringish(r.date) || undefined,
    },
  ];
}

function pageFromScrape(requested: string, json: Record<string, unknown>): ScrapedPage {
  const data = (json.data && typeof json.data === "object" ? json.data : json) as Record<string, unknown>;
  const meta = data.metadata && typeof data.metadata === "object" ? (data.metadata as Record<string, unknown>) : {};
  const url = stringish(meta.sourceURL) || stringish(meta.url) || stringish(data.url) || requested;
  const title = stringish(meta.title) || stringish(data.title) || url;
  const markdown = stringish(data.markdown);
  const excerpt = clipExcerpt(markdown || stringish(data.summary) || stringish(meta.description) || title);
  const retrieved_at = new Date().toISOString();
  return {
    url,
    title,
    excerpt,
    markdown: markdown ? markdown.slice(0, 20_000) : undefined,
    publisher: hostnameOf(url),
    source_id: sourceIdFromUrl(url),
    kind: "data",
    retrieved_at,
    content_hash: contentHash(excerpt),
    citation: title,
  };
}

function clipExcerpt(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 8000) return trimmed || "No excerpt.";
  return `${trimmed.slice(0, 7997)}...`;
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function stringish(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
