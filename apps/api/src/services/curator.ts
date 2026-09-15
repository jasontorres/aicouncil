import { CAPS, type ContextPack } from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError } from "../lib/errors.js";
import { newId } from "../lib/hash.js";
import { manilaToday } from "../lib/manila.js";
import {
  DEFAULT_NEWS_QUERIES,
  type FirecrawlPort,
  type NewsHit,
  type ScrapedPage,
} from "../ports/firecrawl.js";
import { createRetrievePort } from "../ports/retrieve.js";
import { hostnameOf, httpUrl } from "../ports/scrape-page.js";
import { createTavilyPort, type TavilyPort } from "../ports/tavily.js";
import { issuesService } from "./issues.js";

type ScanRow = {
  id: string;
  queried_at: string;
  queries: unknown;
  results: unknown;
  error: string | null;
};

type ScrapeRow = {
  id: string;
  retrieved_at: string;
  url: string;
  title: string;
  excerpt: string;
  via: string;
  source_id: string | null;
};

export type NewsWireStory = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  source: string;
  query: string;
  date?: string;
  seen_at: string;
};

export type NewsWire = {
  timezone: "Asia/Manila";
  today: string;
  scans: {
    id: string;
    queried_at: string;
    queries: string[];
    hit_count: number;
    error: string | null;
  }[];
  stories: NewsWireStory[];
  scrapes: {
    url: string;
    title: string;
    excerpt: string;
    via: string;
    retrieved_at: string;
  }[];
};

const WIRE_SCAN_LIMIT = 21;
const WIRE_SCRAPE_LIMIT = 80;

const scanHits: number[] = [];
const scrapeHits: number[] = [];

function assertHourly(bucket: number[], limit: number, label: string, code: string): void {
  const cutoff = Date.now() - 60 * 60 * 1000;
  while (bucket.length > 0 && bucket[0]! < cutoff) bucket.shift();
  if (bucket.length >= limit) {
    throw llmError(
      429,
      code,
      `Curator ${label} budget is ${limit}/hour. Wait before scraping again.`,
      { retry_after_seconds: 60, limit },
    );
  }
  bucket.push(Date.now());
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T) ?? fallback;
}

export function curatorService(sql: SqlClient, firecrawl: FirecrawlPort, tavily?: TavilyPort) {
  const retrieve = createRetrievePort({
    firecrawl,
    tavily: tavily ?? createTavilyPort({}),
  });
  return {
    async scan(input: {
      queries?: string[];
      limit?: number;
      tbs?: string;
      include_domains?: string[];
      enrich?: boolean;
    }) {
      assertHourly(scanHits, CAPS.curatorScansPerHour, "scan", "curator_scan_rate_limited");
      const queries = input.queries?.length ? input.queries : DEFAULT_NEWS_QUERIES;
      const limit = input.limit ?? 8;
      const tbs = input.tbs ?? "qdr:d";
      const includeDomains = input.include_domains;
      const today = manilaToday();
      let hits: NewsHit[] = [];
      let error: string | null = null;
      try {
        hits = await firecrawl.search({ queries, limit, tbs, includeDomains });
      } catch (err) {
        error = err instanceof Error ? err.message : "scan failed";
        await persistScan(sql, queries, [], error);
        throw err;
      }

      let enriched: ScrapedPage[] = [];
      if (input.enrich) {
        const urls = hits.slice(0, 4).map((h) => h.url);
        enriched = await scrapeMany(retrieve, urls);
        await persistScrapes(sql, enriched);
      }

      const id = await persistScan(sql, queries, hits, null);
      const tracker = await issuesService(sql).tracker();
      return {
        scan_id: id,
        timezone: "Asia/Manila",
        today,
        queries,
        hits,
        enriched,
        today_issue_count: tracker.today_issues.length,
        today_remaining: Math.max(0, CAPS.issuesPerManilaDay - tracker.today_issues.length),
        cap: CAPS.issuesPerManilaDay,
        notice:
          "You are the curator, not a council member. Cluster duplicate coverage into distinct controversies. Publish at most the remaining slots. Each Issue needs a decision-question and a real Context Pack (statutes min 1). News goes in pack.data. Do not invent peso figures or crimes by named people. Do not file Positions.",
      };
    },

    async scrape(urls: string[]) {
      assertHourly(scrapeHits, CAPS.curatorScrapesPerHour, "scrape", "curator_scrape_rate_limited");
      const pages = await scrapeMany(retrieve, urls);
      await persistScrapes(sql, pages);
      return {
        pages,
        notice:
          "Copy these into pack.data (kind data). You still need statutes, jurisdiction, constraints, and open_questions. PDFs are read from Juris markdown (juris-assets.bettergov.ph/markdowns) or Tavily extract — never Firecrawl. If you cannot name the controlling instrument, do not publish this topic.",
      };
    },

    async newsWire(): Promise<NewsWire> {
      const scanRows = await sql.query<ScanRow>(
        `SELECT id, queried_at, queries, results, error
         FROM curator_scans
         ORDER BY queried_at DESC
         LIMIT $1`,
        [WIRE_SCAN_LIMIT],
      );
      let scrapeRows: ScrapeRow[] = [];
      try {
        scrapeRows = await sql.query<ScrapeRow>(
          `SELECT id, retrieved_at, url, title, excerpt, via, source_id
           FROM curator_scrapes
           ORDER BY retrieved_at DESC
           LIMIT $1`,
          [WIRE_SCRAPE_LIMIT],
        );
      } catch {
        scrapeRows = [];
      }

      const scans = scanRows.map((r) => {
        const hits = asNewsHits(r.results);
        return {
          id: r.id,
          queried_at: String(r.queried_at),
          queries: parseJson<string[]>(r.queries, []),
          hit_count: hits.length,
          error: r.error,
          hits,
        };
      });

      const seen = new Set<string>();
      const stories: NewsWireStory[] = [];
      for (const scan of scans) {
        for (const hit of scan.hits) {
          const key = hit.url.replace(/\/+$/, "").toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          stories.push({
            url: hit.url,
            title: hit.title,
            snippet: hit.snippet,
            domain: hostnameOf(hit.url) ?? "",
            source: hit.source,
            query: hit.query,
            date: hit.date,
            seen_at: scan.queried_at,
          });
        }
      }

      return {
        timezone: "Asia/Manila",
        today: manilaToday(),
        scans: scans.map(({ hits: _hits, ...scan }) => scan),
        stories,
        scrapes: scrapeRows.map((row) => ({
          url: row.url,
          title: row.title,
          excerpt: row.excerpt,
          via: row.via,
          retrieved_at: String(row.retrieved_at),
        })),
      };
    },

    async recentScans() {
      const rows = await sql.query<ScanRow>(
        `SELECT id, queried_at, queries, results, error
         FROM curator_scans
         ORDER BY queried_at DESC
         LIMIT 5`,
      );
      return {
        scans: rows.map((r) => ({
          id: r.id,
          queried_at: r.queried_at,
          queries: parseJson<string[]>(r.queries, []),
          results: parseJson<NewsHit[]>(r.results, []),
          error: r.error,
        })),
      };
    },

    async publish(input: {
      slug: string;
      titleEn: string;
      titleFil: string;
      question: string;
      category: string;
      jurisdiction: string[];
      curatorId: string;
      pack: ContextPack;
      closesAt?: string;
      arenaGate: "closed_arena" | "open";
      listed?: boolean;
      agendaDate?: string;
      specialTopic?: boolean;
    }) {
      if (input.specialTopic) {
        const countRows = await sql.query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM issues
           WHERE special_topic = true AND listed = true AND status = 'open'`,
        );
        const n = Number(countRows[0]?.n ?? 0);
        if (n >= CAPS.specialTopicsOpen) {
          throw llmError(
            409,
            "special_topics_full",
            `There are already ${n} open Special Topics (cap ${CAPS.specialTopicsOpen}). Close or unlist one before adding another.`,
            { cap: CAPS.specialTopicsOpen },
          );
        }
        return issuesService(sql).createFromCurator({
          ...input,
          specialTopic: true,
          agendaDate: undefined,
        });
      }
      const agendaDate = input.agendaDate ?? manilaToday();
      const countRows = await sql.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM issues
         WHERE agenda_date = $1::date AND (special_topic = false OR special_topic IS NULL)`,
        [agendaDate],
      );
      const n = Number(countRows[0]?.n ?? 0);
      if (n >= CAPS.issuesPerManilaDay) {
        throw llmError(
          409,
          "agenda_day_full",
          `agenda_date ${agendaDate} already has ${n} Issues (cap ${CAPS.issuesPerManilaDay}). Cluster harder or wait until tomorrow. GET /v1/tracker.`,
          { agenda_date: agendaDate, cap: CAPS.issuesPerManilaDay },
        );
      }
      return issuesService(sql).createFromCurator({ ...input, agendaDate, specialTopic: false });
    },
  };
}

async function scrapeMany(
  retrieve: { scrape(url: string): Promise<ScrapedPage> },
  urls: string[],
): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];
  for (const url of urls) {
    pages.push(await retrieve.scrape(url));
  }
  return pages;
}

async function persistScan(
  sql: SqlClient,
  queries: string[],
  results: NewsHit[],
  error: string | null,
): Promise<string> {
  const id = newId();
  await sql.exec(
    `INSERT INTO curator_scans (id, queries, results, error) VALUES ($1, $2::jsonb, $3::jsonb, $4)`,
    [id, JSON.stringify(queries), JSON.stringify(results), error],
  );
  return id;
}

async function persistScrapes(sql: SqlClient, pages: ScrapedPage[]): Promise<void> {
  for (const page of pages) {
    const url = httpUrl(page.url);
    if (!url) continue;
    await sql.exec(
      `INSERT INTO curator_scrapes (id, url, title, excerpt, via, source_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newId(),
        url,
        page.title.slice(0, 300),
        page.excerpt.slice(0, 4000),
        page.via ?? "firecrawl",
        page.source_id ?? null,
      ],
    );
  }
}

function asNewsHits(value: unknown): NewsHit[] {
  const parsed = parseJson<unknown>(value, []);
  if (!Array.isArray(parsed)) return [];
  const out: NewsHit[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = httpUrl(typeof r.url === "string" ? r.url : "");
    if (!url) continue;
    const title = typeof r.title === "string" && r.title.trim() ? r.title.trim() : url;
    const snippet =
      (typeof r.snippet === "string" && r.snippet) ||
      (typeof r.description === "string" && r.description) ||
      "";
    out.push({
      url,
      title: title.slice(0, 300),
      snippet: snippet.slice(0, 800),
      source: r.source === "news" || r.source === "web" ? r.source : "web",
      query: typeof r.query === "string" ? r.query : "",
      date: typeof r.date === "string" ? r.date : undefined,
    });
  }
  return out;
}
