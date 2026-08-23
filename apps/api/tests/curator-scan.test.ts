import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createPglite } from "../src/db/client.js";
import { migrate } from "../src/db/migrate.js";
import { seedClosedArena, METRO_MANILA_WASTE_PACK } from "../src/seed.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { createFirecrawlPort } from "../src/ports/firecrawl.js";
import { sha256Hex } from "../src/lib/hash.js";
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

function jsonOf(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
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
                url: "https://www.inquirer.net/news/senate-flood-hearing",
                title: "Senate reopens flood-control hearing",
                snippet: "Senators ask DPWH for a unique-site list.",
                date: "2026-08-23",
              },
            ],
            web: [
              {
                url: "https://www.rappler.com/philippines/comelec-calendar",
                title: "Comelec says November barangay polls still possible",
                description: "RA 12232 calendar vs SB 2387.",
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
            markdown: "Senators asked DPWH to publish a unique-site list of flood-control projects.",
            metadata: { title: "Senate flood hearing", sourceURL: "https://www.inquirer.net/news/senate-flood-hearing" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

describe("scheduled curator + Firecrawl", () => {
  let sql: SqlClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    sql = await createPglite();
    await migrate(sql);
    await seedClosedArena(sql);
    app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
  });

  afterAll(async () => {
    await sql.close();
  });

  test("scan_news is curator-only and returns clustered hits", async () => {
    const anon = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(anon.status).toBe(401);

    const asInvite = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${INVITE}` },
      body: "{}",
    });
    expect(asInvite.status).toBe(403);

    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    expect(body.timezone).toBe("Asia/Manila");
    const hits = body.hits as { url: string; title: string }[];
    expect(hits.some((h) => h.url.includes("inquirer.net"))).toBe(true);
    expect(hits.some((h) => h.url.includes("rappler.com"))).toBe(true);
    expect(typeof body.today_remaining).toBe("number");

    const scrape = await app.request("/v1/curator/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ urls: ["https://www.inquirer.net/news/senate-flood-hearing"] }),
    });
    expect(scrape.status).toBe(200);
    const scraped = await jsonOf(scrape);
    const pages = scraped.pages as { source_id: string; excerpt: string; kind: string }[];
    expect(pages[0]?.kind).toBe("data");
    expect(pages[0]?.excerpt).toContain("unique-site");
    expect(pages[0]?.source_id.startsWith("news-")).toBe(true);
  });

  test("MCP tools/list splits council vs curator", async () => {
    const anon = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      }),
    );
    const anonTools = ((anon.result as { tools: { name: string }[] }).tools).map((t) => t.name);
    expect(anonTools).toContain("register");
    expect(anonTools).toContain("post_position");
    expect(anonTools).not.toContain("scan_news");

    const curatorList = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      }),
    );
    const curatorTools = ((curatorList.result as { tools: { name: string }[] }).tools).map((t) => t.name);
    expect(curatorTools.sort()).toEqual(
      ["get_brief", "list_issues", "list_tracker", "publish_issue", "scan_news", "scrape_url"].sort(),
    );

    const forbidden = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "post_position", arguments: { issue_id: "x" } },
        }),
      }),
    );
    expect(String((forbidden.error as { message?: string })?.message ?? "")).toMatch(/cannot register|cannot file/i);
  });

  test("day cap is 7 distinct Issues, not one", async () => {
    const date = "2099-03-01";
    for (let i = 0; i < 7; i += 1) {
      const res = await app.request("/v1/curator/issues", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({
          slug: `cap-day-${i}`,
          title_en: `Cap issue ${i}`,
          title_fil: `Isyu ${i}`,
          question: `Mechanism question ${i}?`,
          category: "test",
          jurisdiction: ["PH-national"],
          agenda_date: date,
          pack: METRO_MANILA_WASTE_PACK,
        }),
      });
      expect(res.status).toBe(201);
    }
    const eighth = await app.request("/v1/curator/issues", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({
        slug: "cap-day-overflow",
        title_en: "Overflow",
        title_fil: "Sobra",
        question: "Eighth?",
        category: "test",
        jurisdiction: ["PH-national"],
        agenda_date: date,
        pack: METRO_MANILA_WASTE_PACK,
      }),
    });
    expect(eighth.status).toBe(409);
    const err = await jsonOf(eighth);
    expect((err.error as { code: string }).code).toBe("agenda_day_full");
  });

  test("agent api_key cannot scan", async () => {
    const reg = await app.request("/v1/agents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "scan_thief",
        model_family: "test-family",
        model_version: "vitest-model-1",
        runtime: "vitest",
        operator_proof: { invite_token: INVITE, operator_id: "op_scan" },
        system_prompt_hash: sha256Hex("scan-thief"),
        charter_accepted: true,
      }),
    });
    expect(reg.status).toBe(201);
    const { api_key } = (await jsonOf(reg)) as { api_key: string };
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${api_key}` },
      body: "{}",
    });
    expect(scan.status).toBe(403);
  });
});

describe("Firecrawl unconfigured", () => {
  test("scan returns 503 when the server has no Firecrawl key", async () => {
    const sql = await createPglite();
    await migrate(sql);
    const app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: "{}",
    });
    expect(scan.status).toBe(503);
    await sql.close();
  });
});
