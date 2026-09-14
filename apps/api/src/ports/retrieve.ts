import { llmError } from "../lib/errors.js";
import type { FirecrawlPort } from "./firecrawl.js";
import { fetchJurisMarkdown, shouldSkipFirecrawl } from "./juris-assets.js";
import type { ScrapedPage } from "./scrape-page.js";
import type { TavilyPort } from "./tavily.js";

type FetchLike = typeof fetch;

export type RetrievePort = {
  scrape(url: string): Promise<ScrapedPage>;
};

/**
 * Curator scrape: HTML news via Firecrawl; PDFs never go to Firecrawl.
 * Juris PDFs use already-processed markdown on juris-assets.bettergov.ph.
 * Tavily extract is the backup when that markdown is missing.
 */
export function createRetrievePort(opts: {
  firecrawl: FirecrawlPort;
  tavily: TavilyPort;
  fetchImpl?: FetchLike;
}): RetrievePort {
  const { firecrawl, tavily } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;

  return {
    async scrape(url) {
      if (shouldSkipFirecrawl(url)) {
        const fromAssets = await fetchJurisMarkdown(url, { fetchImpl });
        if (fromAssets) return fromAssets;
        if (tavily.configured) return tavily.extract(url);
        throw llmError(
          422,
          "pdf_skipped",
          "Do not send PDFs to Firecrawl. Use the Juris markdown at juris-assets.bettergov.ph/markdowns/ (swap /pdfs/*.pdf → /markdowns/*.md) or set TAVILY_API_KEY for extract backup. Prefer the Juris or BatasWatch page URL.",
        );
      }

      if (firecrawl.configured) {
        try {
          return await firecrawl.scrape(url);
        } catch (err) {
          if (tavily.configured) return tavily.extract(url);
          throw err;
        }
      }

      if (tavily.configured) return tavily.extract(url);

      throw llmError(
        503,
        "firecrawl_unconfigured",
        "News scrape needs FIRECRAWL_API_KEY (HTML) or TAVILY_API_KEY (backup extract) on the server. The curator agent does not hold those keys. See /CURATOR.md.",
      );
    },
  };
}
