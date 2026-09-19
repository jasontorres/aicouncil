import { llmError } from "../lib/errors.js";
import {
  DEFAULT_NEWS_DOMAINS,
  pageFromMarkdown,
  titleFromMarkdown,
  type NewsHit,
  type ScrapedPage,
} from "./firecrawl.js";

export type TavilySearchInput = {
  queries: string[];
  limit: number;
  tbs: string;
  includeDomains?: string[];
};

export type TavilyPort = {
  configured: boolean;
  search(input: TavilySearchInput): Promise<NewsHit[]>;
  extract(url: string): Promise<ScrapedPage>;
};

type FetchLike = typeof fetch;

const TAVILY_SEARCH = "https://api.tavily.com/search";
const TAVILY_EXTRACT = "https://api.tavily.com/extract";

export function timeRangeFromTbs(tbs: string): "day" | "week" | "month" | "year" {
  const raw = tbs.trim().toLowerCase();
  if (raw === "qdr:w" || raw === "w" || raw === "week") return "week";
  if (raw === "qdr:m" || raw === "m" || raw === "month") return "month";
  if (raw === "qdr:y" || raw === "y" || raw === "year") return "year";
  return "day";
}

export function createTavilyPort(opts: { apiKey?: string; fetchImpl?: FetchLike } = {}): TavilyPort {
  const apiKey = opts.apiKey?.trim();
  const fetchImpl = opts.fetchImpl ?? fetch;

  function unconfigured(): never {
    throw llmError(
      503,
      "tavily_unconfigured",
      "News scan needs TAVILY_API_KEY on the server. The curator agent does not hold that key. See /CURATOR.md.",
    );
  }

  async function tavily<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
    if (!apiKey) unconfigured();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
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
          "tavily_error",
          tavilyPublicMessage(res.status),
          { retry_after_seconds: res.status === 429 ? 60 : undefined },
        );
      }
      return json as T;
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) throw err;
      throw llmError(503, "tavily_error", "Tavily did not respond. Retry later. Do not invent news to fill the gap.");
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
      const maxResults = Math.min(Math.max(input.limit, 1), 20);
      const domains = input.includeDomains?.length ? input.includeDomains : DEFAULT_NEWS_DOMAINS;
      for (const query of input.queries) {
        const payload: Record<string, unknown> = {
          query,
          topic: "news",
          search_depth: "basic",
          max_results: maxResults,
          time_range: timeRangeFromTbs(input.tbs),
          include_answer: false,
          include_raw_content: false,
        };
        if (domains.length) {
          payload.include_domains = domains;
          payload.include_domains_mode = "prefer";
        }
        const json = await tavily<Record<string, unknown>>(TAVILY_SEARCH, payload, 35_000);
        for (const hit of normalizeSearchHits(json, query)) {
          const key = hit.url.replace(/\/+$/, "").toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push(hit);
        }
      }
      return hits;
    },

    async extract(url) {
      if (!apiKey) unconfigured();
      const json = await tavily<Record<string, unknown>>(
        TAVILY_EXTRACT,
        {
          urls: [url],
          format: "markdown",
          extract_depth: "basic",
          timeout: 40,
        },
        50_000,
      );
      const results = Array.isArray(json.results) ? json.results : [];
      const row = results[0] && typeof results[0] === "object" ? (results[0] as Record<string, unknown>) : null;
      const raw =
        typeof row?.raw_content === "string"
          ? row.raw_content
          : typeof row?.rawContent === "string"
            ? row.rawContent
            : "";
      if (!raw.trim()) {
        throw llmError(
          502,
          "tavily_error",
          "Tavily extract returned no text. Retry later. Do not invent article text.",
        );
      }
      const title = titleFromMarkdown(raw, url);
      return pageFromMarkdown(url, title, raw, "tavily");
    },
  };
}

function tavilyPublicMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Tavily rejected the server key. An operator must rotate TAVILY_API_KEY. Do not paste keys into Issues.";
  }
  if (status === 432 || status === 433 || status === 402) {
    return "Tavily credits are exhausted. Skip new scans until the operator tops up.";
  }
  if (status === 429) return "Tavily rate-limited the server. Wait and retry the scan.";
  return "Tavily search/extract failed. Retry later. Do not invent article text.";
}

function normalizeSearchHits(json: Record<string, unknown>, query: string): NewsHit[] {
  const rows = Array.isArray(json.results) ? json.results : [];
  const out: NewsHit[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const snippet =
      (typeof r.content === "string" && r.content.trim()) ||
      (typeof r.snippet === "string" && r.snippet.trim()) ||
      title;
    if (!url || !title) continue;
    const date =
      (typeof r.published_date === "string" && r.published_date.trim()) ||
      (typeof r.publishedDate === "string" && r.publishedDate.trim()) ||
      undefined;
    out.push({
      url,
      title,
      snippet: snippet || title,
      source: "news",
      query,
      date,
    });
  }
  return out;
}
