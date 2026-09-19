import { llmError } from "../lib/errors.js";
import type { FirecrawlPort, NewsHit, ScrapedPage } from "./firecrawl.js";
import type { TavilyPort } from "./tavily.js";

export type NewsPort = FirecrawlPort;

/**
 * Curator news: Tavily Search / Extract first; Firecrawl is the fallback.
 * 503 prefers TAVILY_API_KEY because that is the default path.
 */
export function createNewsPort(opts: { tavily: TavilyPort; firecrawl: FirecrawlPort }): NewsPort {
  const { tavily, firecrawl } = opts;

  function unconfigured(): never {
    throw llmError(
      503,
      "news_unconfigured",
      "News scan needs TAVILY_API_KEY on the server (Firecrawl is the fallback). The curator agent does not hold that key. See /CURATOR.md.",
    );
  }

  return {
    get configured() {
      return tavily.configured || firecrawl.configured;
    },

    async search(input): Promise<NewsHit[]> {
      if (tavily.configured) {
        try {
          return await tavily.search(input);
        } catch (err) {
          if (firecrawl.configured) return firecrawl.search(input);
          throw err;
        }
      }
      if (firecrawl.configured) return firecrawl.search(input);
      unconfigured();
    },

    async scrape(url): Promise<ScrapedPage> {
      if (tavily.configured) {
        try {
          return await tavily.extract(url);
        } catch (err) {
          if (firecrawl.configured) return firecrawl.scrape(url);
          throw err;
        }
      }
      if (firecrawl.configured) return firecrawl.scrape(url);
      unconfigured();
    },
  };
}
