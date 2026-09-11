import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createPglite } from "../src/db/client.js";
import { migrate } from "../src/db/migrate.js";
import { seedClosedArena, METRO_MANILA_WASTE_PACK } from "../src/seed.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { createHearingsPort } from "../src/ports/hearings.js";
import { createSqliteMemory } from "../src/db/sqlite-memory.js";
import { sha256Hex } from "../src/lib/hash.js";
import type { SqlClient } from "../src/db/types.js";
import type { ContextPack } from "@aicouncil/schema";

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

function hearingPack(): ContextPack {
  const base = METRO_MANILA_WASTE_PACK.budget[0]!;
  return {
    ...METRO_MANILA_WASTE_PACK,
    budget: [
      ...METRO_MANILA_WASTE_PACK.budget,
      {
        ...base,
        source_id: "hearing-doh-fy2027",
        title: "House FY 2027 DOH budget hearing",
        citation: "House Committee on Appropriations, FY 2027 DOH (as spoken)",
        url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
        excerpt:
          "House Committee on Appropriations heard the FY 2027 DOH proposal. Topic summaries are as spoken in the hearing. Do not invent a peso total.",
      },
    ],
  };
}

function mockHearingsFetch(): typeof fetch {
  return (async (input) => {
    const url = String(input);
    if (url.includes("/hearings/missing")) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }
    if (url.includes("/topics")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              index: 0,
              topic: "CADENA Act",
              status: "discussed",
              summary: "Members asked for a public ledger of disbursements as spoken.",
              url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/hearings/4wK1OLsr2lw")) {
      return new Response(
        JSON.stringify({
          data: {
            video_id: "4wK1OLsr2lw",
            title: "FY 2027 DOH budget hearing",
            agency: "DOH",
            fiscal_year: "2027",
            hearing_date: "2026-09-07",
            page_url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
            youtube_url: "https://www.youtube.com/watch?v=4wK1OLsr2lw",
            topic_count: 1,
            has_transcript: true,
            links: { self: "/api/v1/hearings/4wK1OLsr2lw" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/hearings/search")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              hearing: {
                video_id: "4wK1OLsr2lw",
                title: "FY 2027 DOH budget hearing",
                agency: "DOH",
                fiscal_year: "2027",
                page_url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
                topic_count: 16,
                has_transcript: true,
              },
              topic: { topic: "CADENA Act" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/hearings")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              video_id: "4wK1OLsr2lw",
              title: "FY 2027 DOH budget hearing",
              agency: "DOH",
              fiscal_year: "2027",
              hearing_date: "2026-09-07",
              page_url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
              youtube_url: "https://www.youtube.com/watch?v=4wK1OLsr2lw",
              topic_count: 16,
              has_transcript: true,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const specialBody = {
  slug: "test-special-nea",
  title_en: "Test Special Topic",
  title_fil: "Espesyal na paksa",
  question: "What should Congress pin before it passes a test Special Topic?",
  category: "budget",
  jurisdiction: ["PH-national"],
  pack: hearingPack(),
};

describe("Special Topics + hearings", () => {
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
      hearings: createHearingsPort({ fetchImpl: mockHearingsFetch() }),
    });
  });

  afterAll(async () => {
    await sql.close();
  });

  test("publish_special_topic skips the daily cap and lands on tracker.special_topics", async () => {
    const date = "2099-04-01";
    for (let i = 0; i < 7; i += 1) {
      const res = await app.request("/v1/curator/issues", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({
          slug: `full-day-${i}`,
          title_en: `Full day ${i}`,
          title_fil: `Araw ${i}`,
          question: `Daily slot ${i}?`,
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
        slug: "full-day-overflow",
        title_en: "Overflow",
        title_fil: "Sobra",
        question: "Eighth daily?",
        category: "test",
        jurisdiction: ["PH-national"],
        agenda_date: date,
        pack: METRO_MANILA_WASTE_PACK,
      }),
    });
    expect(eighth.status).toBe(409);

    const created = await app.request("/v1/curator/special-topics", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify(specialBody),
    });
    expect(created.status).toBe(201);
    const body = await jsonOf(created);
    const issue = body.issue as {
      slug: string;
      special_topic: boolean;
      agenda_date: string | null;
      status: string;
      listed: boolean;
    };
    expect(issue.slug).toBe("test-special-nea");
    expect(issue.special_topic).toBe(true);
    expect(issue.agenda_date).toBeNull();
    expect(issue.status).toBe("open");
    expect(issue.listed).toBe(true);

    const tracker = await jsonOf(await app.request("/v1/tracker"));
    const specials = tracker.special_topics as { slug: string }[];
    const recent = tracker.recent as { slug: string }[];
    const today = tracker.today_issues as { slug: string }[];
    expect(specials.some((i) => i.slug === "fy-2027-budget")).toBe(true);
    expect(specials.some((i) => i.slug === "cadena-act")).toBe(true);
    expect(specials.some((i) => i.slug === "test-special-nea")).toBe(true);
    expect(recent.some((i) => i.slug === "test-special-nea")).toBe(false);
    expect(today.some((i) => i.slug === "test-special-nea")).toBe(false);

    const listed = await jsonOf(await app.request("/v1/issues"));
    expect((listed.issues as { slug: string }[]).some((i) => i.slug === "fy-2027-budget")).toBe(true);
    expect((listed.issues as { slug: string }[]).some((i) => i.slug === "test-special-nea")).toBe(true);
  });

  test("homepage and tracker HTML show the Special Topic", async () => {
    const home = await app.request("/");
    const homeHtml = await home.text();
    expect(homeHtml).toContain('class="issue-day is-special"');
    expect(homeHtml).toContain("2027 Budget");
    expect(homeHtml).toContain("Test Special Topic");
    expect(homeHtml).toContain('href="/issues/fy-2027-budget"');
    expect(homeHtml).toContain('href="/issues/cadena-act"');
    expect(homeHtml).toContain('href="/issues/test-special-nea"');
    expect(homeHtml).toContain("https://budget.bettergov.ph/hearings");
    expect(homeHtml.indexOf('class="issue-day is-today"')).toBeLessThan(homeHtml.indexOf('class="issue-day is-special"'));

    const trackerPage = await app.request("/tracker");
    const trackerHtml = await trackerPage.text();
    expect(trackerHtml).toContain("<h2>Special Topics</h2>");
    expect(trackerHtml).toContain("2027 Budget");
    expect(trackerHtml).toContain("Test Special Topic");

    const issuePage = await app.request("/issues/fy-2027-budget");
    const issueHtml = await issuePage.text();
    expect(issueHtml).toContain("Special topic");
    expect(issueHtml).toContain("House FY 2027 DOH budget hearing");
  });

  test("an agent can file a Position on a Special Topic", async () => {
    const reg = await app.request("/v1/agents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "budget_clerk",
        handle: "budget_clerk",
        model_family: "test-family",
        model_version: "vitest-model-1",
        runtime: "vitest",
        operator_proof: { invite_token: INVITE, operator_id: "op_special" },
        system_prompt_hash: sha256Hex("special-topic-agent"),
        charter_accepted: true,
      }),
    });
    expect(reg.status).toBe(201);
    const { api_key } = (await jsonOf(reg)) as { api_key: string };
    const res = await app.request("/v1/issues/fy-2027-budget/positions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${api_key}` },
      body: JSON.stringify({
        thesis: "Do not pass FY 2027 on invented peso totals. Cite House Appropriations hearings.",
        thesis_en: "Do not pass FY 2027 on invented peso totals. Cite House Appropriations hearings.",
        mechanism:
          "Congress should treat House Committee on Appropriations hearing pages as the public check on agency asks. Figures stay as spoken in those hearings. DBM still administers the GAA.",
        legal_basis: [{ source_id: "hearing-doh-fy2027", claim: "House FY 2027 DOH hearing as spoken." }],
        prior_art: [],
        no_filed_bill_covers_this: true,
        cost_estimate: {
          narrative: "Hearing staff time plus existing appropriations process. Do not invent a peso total.",
          year: 2027,
        },
        burden: {
          who_pays: "National government via the GAA process already in motion.",
          who_administers: "Congress and DBM, with House Appropriations hearings on the record.",
          who_is_harmed_if_wrong: "Frontline agencies if the GAA is passed on unsourced figures.",
        },
        prediction: {
          claim: "The unsigned hearing record stays the cheapest public check on agency asks.",
          horizon: "2027-12-31",
          metric: "number of FY 2027 hearings cited in Positions",
          direction: "increase",
        },
        confidence: 0.4,
      }),
    });
    expect(res.status).toBe(201);
  });

  test("REST and MCP hearings lookup use the BetterGov catalog", async () => {
    const listed = await jsonOf(await app.request("/v1/budget/hearings?fy=2027&agency=DOH"));
    const hearings = listed.hearings as { video_id: string; page_url: string }[];
    expect(hearings[0]?.video_id).toBe("4wK1OLsr2lw");
    expect(hearings[0]?.page_url).toBe("https://budget.bettergov.ph/hearings/4wK1OLsr2lw");
    expect(String(listed.notice)).toMatch(/as spoken/i);

    const search = await jsonOf(await app.request("/v1/budget/hearings?q=CADENA"));
    expect((search.hearings as { video_id: string }[])[0]?.video_id).toBe("4wK1OLsr2lw");

    const one = await jsonOf(await app.request("/v1/budget/hearings/4wK1OLsr2lw"));
    const hearing = one.hearing as { topics: { topic: string }[]; page_url: string };
    expect(hearing.page_url).toContain("4wK1OLsr2lw");
    expect(hearing.topics[0]?.topic).toBe("CADENA Act");

    const mcp = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "list_hearings", arguments: { fy: "2027" } },
        }),
      }),
    );
    const text = (mcp.result as { content: { text: string }[] }).content[0]?.text ?? "";
    expect(text).toContain("4wK1OLsr2lw");
  });

  test("MCP publish_special_topic is curator-only", async () => {
    const forbidden = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name: "publish_special_topic",
            arguments: specialBody,
          },
        }),
      }),
    );
    expect(String((forbidden.error as { message?: string })?.message ?? "")).toMatch(/curator/i);

    const ok = await jsonOf(
      await app.request("/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "publish_special_topic",
            arguments: { ...specialBody, slug: "cadena-act-demo" },
          },
        }),
      }),
    );
    const text = (ok.result as { content: { text: string }[] }).content[0]?.text ?? "";
    expect(text).toContain("cadena-act-demo");
    expect(text).toContain('"special_topic": true');
  });
});

describe("Special Topics on SQLite / D1", () => {
  test("seedClosedArena inserts operator-asked Special Topics even when academic Issues already exist", async () => {
    const sql = createSqliteMemory();
    const first = await seedClosedArena(sql);
    const second = await seedClosedArena(sql);
    expect(second.issueId).toBe(first.issueId);
    const rows = await sql.query<{ slug: string; special_topic: number; listed: number; agenda_date: string | null }>(
      "SELECT slug, special_topic, listed, agenda_date FROM issues WHERE slug IN ($1, $2) ORDER BY slug",
      ["cadena-act", "fy-2027-budget"],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => Number(row.special_topic) === 1)).toBe(true);
    expect(rows.every((row) => Number(row.listed) === 1)).toBe(true);
    expect(rows.every((row) => row.agenda_date == null)).toBe(true);
    const count = await sql.query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM issues WHERE slug IN ($1, $2)",
      ["cadena-act", "fy-2027-budget"],
    );
    expect(Number(count[0]?.n)).toBe(2);
    await sql.close();
  });

  test("inserts special_topic without consuming a Manila day", async () => {
    const sql = createSqliteMemory();
    await seedClosedArena(sql);
    const app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
      hearings: createHearingsPort({ fetchImpl: mockHearingsFetch() }),
      runtime: "workers",
      storage: "d1",
    });
    const created = await app.request("/v1/curator/special-topics", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ ...specialBody, slug: "sqlite-2027-budget" }),
    });
    expect(created.status).toBe(201);
    const body = await jsonOf(created);
    const issue = body.issue as { special_topic: boolean; agenda_date: string | null };
    expect(issue.special_topic).toBe(true);
    expect(issue.agenda_date).toBeNull();
    const row = await sql.query<{ special_topic: number }>("SELECT special_topic FROM issues WHERE slug = $1", [
      "sqlite-2027-budget",
    ]);
    expect(Number(row[0]?.special_topic)).toBe(1);
    await sql.close();
  });
});
