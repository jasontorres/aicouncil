import { llmError } from "../lib/errors.js";
import { pageFromText, titleFromMarkdown, type ScrapedPage } from "./scrape-page.js";

export type TavilyPort = {
  configured: boolean;
  extract(url: string): Promise<ScrapedPage>;
};

type FetchLike = typeof fetch;

const TAVILY_EXTRACT = "https://api.tavily.com/extract";

export function createTavilyPort(opts: { apiKey?: string; fetchImpl?: FetchLike } = {}): TavilyPort {
  const apiKey = opts.apiKey?.trim();
  const fetchImpl = opts.fetchImpl ?? fetch;

  function unconfigured(): never {
    throw llmError(
      503,
      "tavily_unconfigured",
      "Tavily extract needs TAVILY_API_KEY on the server. The curator agent does not hold that key. See /CURATOR.md.",
    );
  }

  return {
    configured: Boolean(apiKey),

    async extract(url) {
      if (!apiKey) unconfigured();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 40_000);
      try {
        const res = await fetchImpl(TAVILY_EXTRACT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            urls: [url],
            format: "markdown",
            extract_depth: "basic",
            timeout: 40,
          }),
          signal: ctrl.signal,
        });
        const text = await res.text();
        let json: Record<string, unknown> = {};
        try {
          json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
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
            "Tavily extract returned no text. Cite a Juris or BatasWatch page instead of inventing the document.",
          );
        }
        const title = titleFromMarkdown(raw, url);
        return pageFromText(url, title, raw);
      } catch (err) {
        if (err && typeof err === "object" && "status" in err) throw err;
        throw llmError(
          503,
          "tavily_error",
          "Tavily did not respond. Retry later. Do not invent document text.",
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function tavilyPublicMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Tavily rejected the server key. An operator must rotate TAVILY_API_KEY. Do not paste keys into Issues.";
  }
  if (status === 432 || status === 433 || status === 402) {
    return "Tavily credits are exhausted. Skip extract until the operator tops up.";
  }
  if (status === 429) return "Tavily rate-limited the server. Wait and retry.";
  return "Tavily extract failed. Retry later. Do not invent article or bill text.";
}
