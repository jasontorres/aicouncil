import { describe, expect, test } from "vitest";
import { createPglite } from "../src/db/client.js";
import { migrate } from "../src/db/migrate.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { createFirecrawlPort } from "../src/ports/firecrawl.js";
import { createTavilyPort, timeRangeFromTbs } from "../src/ports/tavily.js";
import type { SqlClient } from "../src/db/types.js";

const docs: Documents = {
  agentsMd: "# AGENTS\n",
  llmsTxt: "Sanggunian",
  charterEn: "# Charter\n",
  charterFil: "# Kartilya\n",
  skillMd: "# skill\n",
  operatorsMd: "# ops\n",
  curatorMd: "# Curators agenda_date\n",
  curatorSkillMd: "# scan_news\n",
};

const INVITE = "closed-arena-dev-token";
const CURATOR = "curator-dev-token";
const TAVILY_URL = "https://www.inquirer.net/news/senate-flood-hearing";
const FIRECRAWL_URL = "https://www.rappler.com/philippines/comelec-calendar";

function jsonOf(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function mockTavily(opts: { failSearch?: boolean; failExtract?: boolean; chrome?: boolean; capture?: Record<string, unknown>[] } = {}): typeof fetch {
  return (async (_input, init) => {
    const url = String(_input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    opts.capture?.push({ url, body });
    if (url.includes("/search")) {
      if (opts.failSearch) return new Response("nope", { status: 500 });
      return new Response(
        JSON.stringify({
          results: [
            {
              url: TAVILY_URL,
              title: "Senate reopens flood-control hearing",
              content: "Senators ask DPWH for a unique-site list.",
              published_date: "2026-08-23",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/extract")) {
      if (opts.failExtract) return new Response("nope", { status: 500 });
      const raw = opts.chrome
        ? `[![Image 2: tiktok](blob:http://localhost/a7738210d3944ec6b273043b6b31e8b6)](${TAVILY_URL})\nFOLLOW US:\nSubscribe to our daily newsletter\n# Under 24-hour hospital stay covered – PhilHealth\n\nPhilHealth will now pay for inpatient admissions that last less than 24 hours.`
        : "# Senate flood hearing\n\nSenators asked DPWH to publish a unique-site list of flood-control projects.";
      return new Response(
        JSON.stringify({
          results: [
            {
              url: TAVILY_URL,
              raw_content: raw,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

function mockFirecrawl(): typeof fetch {
  return (async (input) => {
    const url = String(input);
    if (url.includes("/search")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            news: [
              {
                url: FIRECRAWL_URL,
                title: "Comelec says November barangay polls still possible",
                snippet: "RA 12232 calendar vs SB 2387.",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/scrape")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown: "Comelec says it can still run November.",
            metadata: { title: "Comelec calendar", sourceURL: FIRECRAWL_URL },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

async function makeApp(opts: {
  tavily?: ReturnType<typeof createTavilyPort>;
  firecrawl?: ReturnType<typeof createFirecrawlPort>;
}): Promise<{ sql: SqlClient; app: ReturnType<typeof createApp> }> {
  const sql = await createPglite();
  await migrate(sql);
  const app = createApp({
    sql,
    inviteToken: INVITE,
    curatorApiKey: CURATOR,
    publicBaseUrl: "http://localhost:8787",
    dedupe: new MemoryDedupe(),
    documents: docs,
    tavily: opts.tavily,
    firecrawl: opts.firecrawl,
  });
  return { sql, app };
}

describe("timeRangeFromTbs", () => {
  test("maps Firecrawl tbs tokens to Tavily time_range", () => {
    expect(timeRangeFromTbs("qdr:d")).toBe("day");
    expect(timeRangeFromTbs("qdr:w")).toBe("week");
    expect(timeRangeFromTbs("qdr:m")).toBe("month");
    expect(timeRangeFromTbs("qdr:y")).toBe("year");
  });
});

describe("Tavily-default news", () => {
  test("scan and scrape use Tavily when both providers are configured", async () => {
    const capture: Record<string, unknown>[] = [];
    const { sql, app } = await makeApp({
      tavily: createTavilyPort({ apiKey: "tvly-test-not-real", fetchImpl: mockTavily({ capture }) }),
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5, tbs: "qdr:d" }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    const hits = body.hits as { url: string }[];
    expect(hits.some((h) => h.url === TAVILY_URL)).toBe(true);
    expect(hits.some((h) => h.url === FIRECRAWL_URL)).toBe(false);

    const searchCall = capture.find((row) => String(row.url).includes("/search"));
    const payload = searchCall?.body as Record<string, unknown>;
    expect(payload.topic).toBe("news");
    expect(payload.search_depth).toBe("basic");
    expect(payload.time_range).toBe("day");
    expect(payload.country).toBeUndefined();
    expect(payload.include_answer).toBe(false);
    expect(Array.isArray(payload.include_domains)).toBe(true);
    expect(payload.include_domains_mode).toBe("prefer");

    const scrape = await app.request("/v1/curator/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ urls: [TAVILY_URL] }),
    });
    expect(scrape.status).toBe(200);
    const scraped = await jsonOf(scrape);
    const pages = scraped.pages as { via?: string; excerpt: string }[];
    expect(pages[0]?.via).toBe("tavily");
    expect(pages[0]?.excerpt).toContain("unique-site");

    const health = await jsonOf(await app.request("/healthz"));
    expect(health.tavily).toBe(true);
    expect(health.firecrawl).toBe(true);
    await sql.close();
  });

  test("Tavily-only scan works without Firecrawl", async () => {
    const { sql, app } = await makeApp({
      tavily: createTavilyPort({ apiKey: "tvly-test-not-real", fetchImpl: mockTavily() }),
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    expect((body.hits as { url: string }[])[0]?.url).toBe(TAVILY_URL);
    const health = await jsonOf(await app.request("/healthz"));
    expect(health.tavily).toBe(true);
    expect(health.firecrawl).toBe(false);
    await sql.close();
  });

  test("Firecrawl-only scan still works when Tavily is unset", async () => {
    const { sql, app } = await makeApp({
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    expect((body.hits as { url: string }[]).some((h) => h.url === FIRECRAWL_URL)).toBe(true);
    const health = await jsonOf(await app.request("/healthz"));
    expect(health.tavily).toBe(false);
    expect(health.firecrawl).toBe(true);
    await sql.close();
  });

  test("search falls back to Firecrawl when Tavily fails", async () => {
    const { sql, app } = await makeApp({
      tavily: createTavilyPort({ apiKey: "tvly-test-not-real", fetchImpl: mockTavily({ failSearch: true }) }),
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    expect((body.hits as { url: string }[]).some((h) => h.url === FIRECRAWL_URL)).toBe(true);
    await sql.close();
  });

  test("scrape falls back to Firecrawl when Tavily extract fails", async () => {
    const { sql, app } = await makeApp({
      tavily: createTavilyPort({ apiKey: "tvly-test-not-real", fetchImpl: mockTavily({ failExtract: true }) }),
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
    const scrape = await app.request("/v1/curator/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ urls: [FIRECRAWL_URL] }),
    });
    expect(scrape.status).toBe(200);
    const scraped = await jsonOf(scrape);
    const pages = scraped.pages as { via?: string; excerpt: string }[];
    expect(pages[0]?.via).toBe("firecrawl");
    expect(pages[0]?.excerpt).toContain("November");
    await sql.close();
  });

  test("scrape strips page-chrome markdown and shows a headline on /news", async () => {
    const { sql, app } = await makeApp({
      tavily: createTavilyPort({ apiKey: "tvly-test-not-real", fetchImpl: mockTavily({ chrome: true }) }),
    });
    const scrape = await app.request("/v1/curator/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ urls: [TAVILY_URL] }),
    });
    expect(scrape.status).toBe(200);
    const scraped = await jsonOf(scrape);
    const pages = scraped.pages as { title: string; excerpt: string; summary?: string }[];
    expect(pages[0]?.title).toBe("Under 24-hour hospital stay covered – PhilHealth");
    expect(pages[0]?.excerpt).not.toMatch(/blob:http/);
    expect(pages[0]?.excerpt).toMatch(/less than 24 hours/);
    expect(pages[0]?.summary).toMatch(/less than 24 hours/);

    const newsPage = await app.request("/news?kind=scrapes");
    const html = await newsPage.text();
    expect(html).toContain("Under 24-hour hospital stay covered");
    expect(html).not.toContain("blob:http");
    expect(html).not.toContain("Image 2: tiktok");

    const feed = await jsonOf(await app.request("/v1/news"));
    const scrapes = feed.scrapes as { title: string; summary: string | null }[];
    expect(scrapes.some((row) => row.title.includes("PhilHealth"))).toBe(true);
    await sql.close();
  });

  test("HTTP port maps 401 without echoing the key", async () => {
    const port = createTavilyPort({
      apiKey: "secret-should-not-leak",
      fetchImpl: (async () => new Response("denied", { status: 401 })) as typeof fetch,
    });
    await expect(
      port.search({ queries: ["Philippines news"], limit: 5, tbs: "qdr:d" }),
    ).rejects.toMatchObject({ code: "tavily_error" });
    try {
      await port.search({ queries: ["Philippines news"], limit: 5, tbs: "qdr:d" });
    } catch (err) {
      expect(String(err)).not.toContain("secret-should-not-leak");
    }
  });
});
