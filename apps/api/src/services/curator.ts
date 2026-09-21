import { CAPS, type ContextPack } from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError } from "../lib/errors.js";
import { newId } from "../lib/hash.js";
import { manilaDate, manilaToday } from "../lib/manila.js";
import {
  DEFAULT_NEWS_QUERIES,
  hostnameOf,
  httpUrl,
  type FirecrawlPort,
  type NewsHit,
  type ScrapedPage,
} from "../ports/firecrawl.js";
import {
  isClipSource,
  isNewsDisposition,
  isNewsTopic,
  judgeNewsHitBatches,
  judgeNewsHits,
  NEWS_TAGS,
  selectSocialStories,
  socialPostCopy,
  type JudgedNewsHit,
  type NewsDesk,
  type NewsJudgment,
  type NewsTag,
} from "../ports/news-judge.js";
import { presentNewsText } from "../lib/news-text.js";
import { summarizeScrapedPages } from "../ports/news-summarize.js";
import { createTypeSafePort, type TypeSafePort } from "../ports/typesafe.js";
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
  summary?: string | null;
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
  judgment?: NewsJudgment;
  desk?: NewsDesk;
};

export type NewsWire = {
  timezone: "Asia/Manila";
  today: string;
  day_counts: { date: string; stories: number; scrapes: number }[];
  stories: NewsWireStory[];
  scrapes: {
    url: string;
    title: string;
    excerpt: string;
    summary: string;
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
      `Curator ${label} budget is ${limit}/hour. Wait before scanning news again.`,
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

export function curatorService(sql: SqlClient, firecrawl: FirecrawlPort, typesafe?: TypeSafePort) {
  const judge = typesafe ?? createTypeSafePort({});
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
      try {
        hits = await firecrawl.search({ queries, limit, tbs, includeDomains });
      } catch (err) {
        const error = err instanceof Error ? err.message : "scan failed";
        await persistScan(sql, queries, [], error);
        throw err;
      }

      const ranked = await judgeNewsHits(judge, hits);
      let enriched: ScrapedPage[] = [];
      if (input.enrich) {
        const preferred = ranked.hits.filter((h) => h.judgment?.recommend || h.desk?.notable);
        const pool = preferred.length ? preferred : ranked.hits;
        const urls = pool.slice(0, 4).map((h) => h.url);
        enriched = await scrapeMany(firecrawl, urls, judge);
        await persistScrapes(sql, enriched);
      }

      const id = await persistScan(sql, queries, ranked.hits, null);
      const tracker = await issuesService(sql).tracker();
      const candidates = ranked.hits.filter((h) => h.judgment?.recommend);
      const clips = ranked.hits.filter((h) => h.desk?.notable);
      const socials = selectSocialStories(ranked.hits);
      return {
        scan_id: id,
        timezone: "Asia/Manila",
        today,
        queries,
        hits: ranked.hits,
        enriched,
        candidates: candidates.map((h) => ({
          url: h.url,
          title: h.title,
          disposition: h.judgment?.disposition,
        })),
        clips: clips.map((h) => ({
          url: h.url,
          title: h.title,
          topic: h.desk?.topic,
          tags: h.desk?.tags,
          clip: h.desk?.clip,
          notability: h.desk?.notability,
        })),
        socials: socials.map((h) => ({
          url: h.url,
          title: h.title,
          topic: h.desk?.topic,
          tags: h.desk?.tags,
          clip: h.desk?.clip,
          body: socialPostCopy(h),
          social: h.desk?.social ?? true,
          social_score: h.desk?.social_score ?? null,
        })),
        typesafe: {
          configured: ranked.configured,
          model: ranked.model,
          judged: ranked.judged,
          error: ranked.error ?? null,
        },
        today_issue_count: tracker.today_issues.length,
        today_remaining: Math.max(0, CAPS.issuesPerManilaDay - tracker.today_issues.length),
        cap: CAPS.issuesPerManilaDay,
        notice:
          ranked.configured && !ranked.error
            ? "You are the curator, not a council member. Hits carry TypeSafe (Jev) council ranking (judgment.recommend), a public desk (desk.topic, desk.clip), and social-post picks (desk.social). GET /socials for copy-ready posts. Ranking is not permission to publish an Issue. Cluster duplicate coverage. Skip Issues if you cannot name a controlling instrument. Do not invent peso figures or crimes by named people. Do not file Positions."
            : "You are the curator, not a council member. Cluster duplicate coverage into distinct controversies. Publish at most the remaining slots. Each Issue needs a decision-question and a real Context Pack (statutes min 1). News goes in pack.data. Do not invent peso figures or crimes by named people. Do not file Positions.",
      };
    },

    async scrape(urls: string[]) {
      assertHourly(scrapeHits, CAPS.curatorScrapesPerHour, "scrape", "curator_scrape_rate_limited");
      const pages = await scrapeMany(firecrawl, urls, judge);
      await persistScrapes(sql, pages);
      return {
        pages,
        notice:
          "Copy these into pack.data (kind data). You still need statutes, jurisdiction, constraints, and open_questions. If you cannot name the controlling instrument, do not publish this topic.",
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
          `SELECT id, retrieved_at, url, title, excerpt, via, source_id, summary
           FROM curator_scrapes
           ORDER BY retrieved_at DESC
           LIMIT $1`,
          [WIRE_SCRAPE_LIMIT],
        );
      } catch {
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
      }

      const seen = new Set<string>();
      const stories: NewsWireStory[] = [];
      for (const row of scanRows) {
        const hits = asJudgedHits(row.results);
        for (const hit of hits) {
          const key = hit.url.replace(/\/+$/, "").toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          stories.push({
            url: hit.url,
            title: hit.title,
            snippet: presentNewsText(hit.title, hit.snippet).excerpt || hit.snippet,
            domain: hostnameOf(hit.url) ?? "",
            source: hit.source,
            query: hit.query,
            date: hit.date,
            seen_at: String(row.queried_at),
            judgment: hit.judgment,
            desk: hit.desk,
          });
        }
      }

      const scrapes = scrapeRows.map((row) => {
        const shown = presentNewsText(row.title, row.excerpt, row.summary);
        return {
          url: row.url,
          title: shown.title || hostnameOf(row.url) || row.url,
          excerpt: shown.excerpt,
          summary: shown.summary,
          via: row.via,
          retrieved_at: String(row.retrieved_at),
        };
      });

      const buckets = new Map<string, { date: string; stories: number; scrapes: number }>();
      const bump = (date: string, field: "stories" | "scrapes") => {
        const existing = buckets.get(date) ?? { date, stories: 0, scrapes: 0 };
        existing[field] += 1;
        buckets.set(date, existing);
      };
      for (const story of stories) bump(manilaDate(story.seen_at), "stories");
      for (const page of scrapes) bump(manilaDate(page.retrieved_at), "scrapes");
      const day_counts = [...buckets.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      return {
        timezone: "Asia/Manila",
        today: manilaToday(),
        day_counts,
        stories,
        scrapes,
      };
    },

    async classifyStored(input: { force?: boolean } = {}) {
      if (!judge.configured) {
        throw llmError(
          503,
          "typesafe_unconfigured",
          "Classifying saved news needs TYPESAFE_API_KEY on the server. Scan hits stay as they are.",
        );
      }
      const scanRows = await sql.query<ScanRow>(
        `SELECT id, queried_at, queries, results, error
         FROM curator_scans
         ORDER BY queried_at DESC
         LIMIT $1`,
        [WIRE_SCAN_LIMIT],
      );
      const parsed = scanRows.map((row) => ({
        id: row.id,
        hits: asJudgedHits(row.results),
      }));
      const unique: JudgedNewsHit[] = [];
      const seen = new Set<string>();
      for (const row of parsed) {
        for (const hit of row.hits) {
          const key = hit.url.replace(/\/+$/, "").toLowerCase();
          if (seen.has(key)) continue;
          if (!input.force && hit.desk?.topic && typeof hit.desk.social === "boolean") continue;
          seen.add(key);
          unique.push(hit);
        }
      }
      const washed = await washStoredScrapes(sql, judge, input.force === true);
      if (unique.length === 0) {
        return {
          classified: 0,
          scans: 0,
          summarized: washed.summarized,
          model: washed.model,
          notice:
            washed.summarized > 0
              ? "Saved scrapes now carry a cleaned excerpt and a verbatim lede. Headlines already had desk labels."
              : "Every saved headline already has a desk label.",
        };
      }
      const ranked = await judgeNewsHitBatches(judge, unique);
      if (ranked.error && ranked.judged === 0) {
        throw llmError(503, "typesafe_error", ranked.error);
      }
      const byUrl = new Map(ranked.hits.map((hit) => [hit.url.replace(/\/+$/, "").toLowerCase(), hit]));
      let scans = 0;
      for (const row of parsed) {
        let changed = false;
        const next = row.hits.map((hit) => {
          const update = byUrl.get(hit.url.replace(/\/+$/, "").toLowerCase());
          if (!update?.desk && !update?.judgment) return hit;
          changed = true;
          return {
            ...hit,
            judgment: update.judgment ?? hit.judgment,
            desk: update.desk ?? hit.desk,
          };
        });
        if (!changed) continue;
        await sql.exec(`UPDATE curator_scans SET results = $1::jsonb WHERE id = $2`, [
          JSON.stringify(next),
          row.id,
        ]);
        scans += 1;
      }
      return {
        classified: ranked.judged,
        scans,
        summarized: washed.summarized,
        model: ranked.model ?? washed.model,
        error: ranked.error ?? null,
        notice:
          "Saved scan hits now carry desk.topic, desk.tags, desk.clip, desk.social, and council judgment. Scrapes carry a cleaned excerpt and a verbatim lede. GET /socials or GET /v1/socials for copy-ready posts. GET /news. This is not a publish decision.",
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
          results: asJudgedHits(r.results),
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

async function scrapeMany(
  firecrawl: FirecrawlPort,
  urls: string[],
  judge?: TypeSafePort,
): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];
  for (const url of urls) {
    pages.push(await firecrawl.scrape(url));
  }
  if (!judge?.configured || pages.length === 0) return pages;
  return summarizeScrapedPages(judge, pages);
}

async function washStoredScrapes(
  sql: SqlClient,
  judge: TypeSafePort,
  force: boolean,
): Promise<{ summarized: number; model: string | null }> {
  let rows: ScrapeRow[] = [];
  try {
    rows = await sql.query<ScrapeRow>(
      `SELECT id, retrieved_at, url, title, excerpt, via, source_id, summary
       FROM curator_scrapes
       ORDER BY retrieved_at DESC
       LIMIT $1`,
      [WIRE_SCRAPE_LIMIT],
    );
  } catch {
    try {
      rows = await sql.query<ScrapeRow>(
        `SELECT id, retrieved_at, url, title, excerpt, via, source_id
         FROM curator_scrapes
         ORDER BY retrieved_at DESC
         LIMIT $1`,
        [WIRE_SCRAPE_LIMIT],
      );
    } catch {
      return { summarized: 0, model: null };
    }
  }
  if (rows.length === 0) return { summarized: 0, model: null };

  const pages: ScrapedPage[] = rows.map((row) => {
    const shown = presentNewsText(row.title, row.excerpt, row.summary);
    return {
      url: row.url,
      title: shown.title,
      excerpt: shown.excerpt,
      markdown: shown.excerpt,
      source_id: row.source_id ?? "",
      kind: "data",
      retrieved_at: String(row.retrieved_at),
      content_hash: "",
      via: row.via === "tavily" || row.via === "juris" || row.via === "firecrawl" ? row.via : "tavily",
      summary: force ? undefined : shown.summary || undefined,
    };
  });
  const summarized = await summarizeScrapedPages(judge, pages);
  let n = 0;
  for (const [i, page] of summarized.entries()) {
    const row = rows[i];
    if (!row) continue;
    const shown = presentNewsText(page.title, page.excerpt, page.summary);
    try {
      await sql.exec(
        `UPDATE curator_scrapes SET title = $1, excerpt = $2, summary = $3 WHERE id = $4`,
        [shown.title.slice(0, 300), shown.excerpt.slice(0, 8000), shown.summary.slice(0, 500) || null, row.id],
      );
      n += 1;
    } catch {
      try {
        await sql.exec(`UPDATE curator_scrapes SET title = $1, excerpt = $2 WHERE id = $3`, [
          shown.title.slice(0, 300),
          shown.excerpt.slice(0, 8000),
          row.id,
        ]);
        n += 1;
      } catch {
        // Column or table missing on an old local DB.
      }
    }
  }
  return { summarized: n, model: judge.configured ? "jev-latest" : null };
}

async function persistScan(
  sql: SqlClient,
  queries: string[],
  results: JudgedNewsHit[] | NewsHit[],
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
    const shown = presentNewsText(page.title, page.excerpt, page.summary);
    const args = [
      newId(),
      url,
      shown.title.slice(0, 300),
      shown.excerpt.slice(0, 8000),
      page.via ?? "firecrawl",
      page.source_id ?? null,
      shown.summary.slice(0, 500) || null,
    ];
    try {
      await sql.exec(
        `INSERT INTO curator_scrapes (id, url, title, excerpt, via, source_id, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        args,
      );
    } catch {
      try {
        await sql.exec(
          `INSERT INTO curator_scrapes (id, url, title, excerpt, via, source_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          args.slice(0, 6),
        );
      } catch {
        // Table may not exist on an old local DB; scans still persist.
      }
    }
  }
}

export function asJudgedHits(value: unknown): JudgedNewsHit[] {
  const parsed = parseJson<unknown>(value, []);
  if (!Array.isArray(parsed)) return [];
  const out: JudgedNewsHit[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = httpUrl(typeof r.url === "string" ? r.url : "") ?? (typeof r.url === "string" ? r.url : "");
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
      judgment: asJudgment(r.judgment),
      desk: asDesk(r.desk),
    });
  }
  return out;
}

function asJudgment(value: unknown): NewsJudgment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  if (typeof r.worthy !== "number" || typeof r.actionability !== "number") return undefined;
  if (typeof r.disposition !== "string" || !isNewsDisposition(r.disposition)) return undefined;
  return {
    worthy: r.worthy,
    disposition: r.disposition,
    disposition_confidence: typeof r.disposition_confidence === "number" ? r.disposition_confidence : 0,
    actionability: r.actionability,
    actionability_confidence: typeof r.actionability_confidence === "number" ? r.actionability_confidence : 0,
    recommend: r.recommend === true,
    uncertain: r.uncertain === true,
    rank: typeof r.rank === "number" ? r.rank : 0,
  };
}

function asDesk(value: unknown): NewsDesk | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  if (typeof r.topic !== "string" || !isNewsTopic(r.topic)) return undefined;
  if (typeof r.notability !== "number") return undefined;
  const tags = Array.isArray(r.tags)
    ? r.tags.filter((tag): tag is NewsTag => typeof tag === "string" && (NEWS_TAGS as readonly string[]).includes(tag))
    : [];
  const notable = r.notable === true || r.notability >= 0.8;
  const clipSource = typeof r.clip_source === "string" && isClipSource(r.clip_source) ? r.clip_source : "title";
  return {
    topic: r.topic,
    topic_confidence: typeof r.topic_confidence === "number" ? r.topic_confidence : 0,
    tags,
    notability: r.notability,
    notable,
    ...(typeof r.social === "boolean"
      ? {
          social: r.social,
          social_score: typeof r.social_score === "number" ? r.social_score : 0,
        }
      : {}),
    clip_source: clipSource,
    clip: typeof r.clip === "string" && r.clip.trim() ? r.clip.trim() : "",
  };
}
