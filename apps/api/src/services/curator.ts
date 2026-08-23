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
import { issuesService } from "./issues.js";

type ScanRow = {
  id: string;
  queried_at: string;
  queries: unknown;
  results: unknown;
  error: string | null;
};

const scanHits: number[] = [];
const scrapeHits: number[] = [];

function assertHourly(bucket: number[], limit: number, label: string, code: string): void {
  const cutoff = Date.now() - 60 * 60 * 1000;
  while (bucket.length > 0 && bucket[0]! < cutoff) bucket.shift();
  if (bucket.length >= limit) {
    throw llmError(
      429,
      code,
      `Curator ${label} budget is ${limit}/hour. Wait before calling Firecrawl again.`,
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

export function curatorService(sql: SqlClient, firecrawl: FirecrawlPort) {
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
        enriched = await scrapeMany(firecrawl, urls);
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
      const pages = await scrapeMany(firecrawl, urls);
      return {
        pages,
        notice:
          "Copy these into pack.data (kind data). You still need statutes, jurisdiction, constraints, and open_questions. If you cannot name the controlling instrument, do not publish this topic.",
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
    }) {
      const agendaDate = input.agendaDate ?? manilaToday();
      const countRows = await sql.query<{ n: string }>(
        "SELECT COUNT(*)::text AS n FROM issues WHERE agenda_date = $1::date",
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
      return issuesService(sql).createFromCurator({ ...input, agendaDate });
    },
  };
}

async function scrapeMany(firecrawl: FirecrawlPort, urls: string[]): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];
  for (const url of urls) {
    pages.push(await firecrawl.scrape(url));
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
