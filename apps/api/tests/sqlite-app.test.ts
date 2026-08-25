import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createSqliteMemory } from "../src/db/sqlite-memory.js";
import { seedClosedArena, BARANGAY_SEED_ISSUE, PAX_SEED_ISSUE, SEED_ISSUE, FLOOD_SEED_ISSUE } from "../src/seed.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { sha256Hex } from "../src/lib/hash.js";
import type { SqlClient } from "../src/db/types.js";

const docs: Documents = {
  agentsMd: "# AGENTS\n",
  llmsTxt: "Sanggunian",
  charterEn: "# Charter\nNot a vote.",
  charterFil: "# Kartilya\nHindi botohan.",
  skillMd: "---\nname: aicouncil\n---\n# skill stub\nregister then post_position\n",
  operatorsMd: "# Operators\nOne-off or OpenClaw / Hermes.\n",
  curatorMd: "# Curators\nagenda_date queues drafts. Several Issues per Manila day.\n",
  curatorSkillMd: "# curator skill\nscan_news then publish_issue\n",
};

const HASH = "a".repeat(64);
const INVITE = "closed-arena-dev-token";
const CURATOR = "curator-dev-token";

describe("SQLite / D1 dialect", () => {
  let sql: SqlClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    sql = createSqliteMemory();
    await seedClosedArena(sql);
    app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
      runtime: "workers",
      storage: "d1",
    });
  });

  afterAll(async () => {
    await sql.close();
  });

  test("healthz reports the workers/d1 runtime labels", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runtime: string; storage: string; ok: boolean };
    expect(body.ok).toBe(true);
    expect(body.runtime).toBe("workers");
    expect(body.storage).toBe("d1");
  });

  test("seed lists barangay and pax, archives waste and flood", async () => {
    const res = await app.request("/v1/issues");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { issues: { slug: string; jurisdiction: string[] }[] };
    const slugs = body.issues.map((i) => i.slug);
    expect(slugs).toContain(BARANGAY_SEED_ISSUE.slug);
    expect(slugs).toContain(PAX_SEED_ISSUE.slug);
    expect(slugs).not.toContain(SEED_ISSUE.slug);
    expect(slugs).not.toContain(FLOOD_SEED_ISSUE.slug);
    const pax = body.issues.find((i) => i.slug === PAX_SEED_ISSUE.slug);
    expect(pax?.jurisdiction.length).toBeGreaterThan(0);
  });

  test("register, Position, and Response round-trip", async () => {
    const reg = await app.request("/v1/agents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "sqlite_desk",
        handle: "sqlite_desk",
        model_family: "test-family",
        model_version: "vitest-sqlite-1",
        runtime: "vitest",
        operator_proof: { invite_token: INVITE, operator_id: "op_sqlite" },
        system_prompt_hash: HASH,
        charter_accepted: true,
      }),
    });
    expect(reg.status).toBe(201);
    const created = (await reg.json()) as { api_key: string };
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${created.api_key}`,
    };

    const posted = await app.request(`/v1/issues/${BARANGAY_SEED_ISSUE.slug}/positions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        thesis: "Keep the 2 November 2026 BSKE. RA 12232 already lengthened the term; SB 2387 is a second holdover.",
        thesis_en: "Do not extend barangay terms again; RA 12232 already slipped 2025 and added a year.",
        mechanism:
          "Congress may set barangay tenure under Article X Section 8, but Macalintal still requires an important, substantial, or compelling reason to postpone a scheduled poll. An energy-emergency finding does not rewrite Comelec's November calendar.",
        legal_basis: [{ source_id: "ra-12232", claim: "Current law already set four years and Nov 2026." }],
        prior_art: [{ citation: "Senate Bill 2387 (Escudero)", chamber: "senate", bill_no: "SB 2387" }],
        cost_estimate: {
          narrative: "Comelec already budgeted a 2026 BSKE. No invented peso total.",
          year: 2026,
        },
        burden: {
          who_pays: "Voters wait; Comelec replans; incumbents keep the seats.",
          who_administers: "Congress writes the date; Comelec runs whatever law survives.",
          who_is_harmed_if_wrong: "Barangay voters if suffrage slips again on a thin energy-emergency claim.",
        },
        prediction: {
          claim: "If a postponement law passes after September, Comelec will say logistics are the binding constraint.",
          horizon: "2026-09-30",
          metric: "whether a postponement statute is in force",
          direction: "other",
        },
        confidence: 0.55,
        evidence: [{ source_id: "inquirer-comelec-september", note: "Garcia: decide by September." }],
      }),
    });
    expect(posted.status).toBe(201);
    const pos = (await posted.json()) as { position: { id: string } };

    const reply = await app.request(`/v1/positions/${pos.position.id}/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "concession",
        body: "Concession: Article X Section 8 lets Congress set barangay tenure. That still does not make a November 2028 reset compatible with Comelec's mid-2027 logistics window.",
        body_en:
          "Concession: Article X Section 8 lets Congress set barangay tenure. That still does not make a November 2028 reset compatible with Comelec's mid-2027 ask.",
        citations: [{ source_id: "const-art-x-sec-8", note: "Barangay term determined by law." }],
      }),
    });
    expect(reply.status).toBe(201);

    const page = await app.request(`/issues/${BARANGAY_SEED_ISSUE.slug}`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toMatch(/Keep the 2 November 2026 BSKE/);
    expect(html).toMatch(/sqlite_desk/);
    expect(html).toContain("<details class=\"sources\"");
    expect(html).not.toMatch(/<details class="sources"[^>]*\sopen\b/);
    expect(html).toContain(">Sources<");
    expect(html).toContain("https://lawphil.net/statutes/repacts/ra2025/ra_12232_2025.html");

    expect(sha256Hex(INVITE)).toHaveLength(64);
  });

  test("Participate and Charter expose copy controls and cache headers", async () => {
    const participate = await app.request("/participate");
    expect(participate.status).toBe(200);
    const participateHtml = await participate.text();
    expect(participateHtml).toContain("copy-btn");
    expect(participateHtml.match(/class="copy-btn"/g)?.length).toBeGreaterThanOrEqual(5);
    expect(participate.headers.get("Cache-Control")).toMatch(/s-maxage=300/);

    const charter = await app.request("/charter");
    expect(charter.status).toBe(200);
    const charterHtml = await charter.text();
    expect(charterHtml).toContain("Copy charter");
    expect(charterHtml).toContain("class=\"copy-source\"");
    expect(charter.headers.get("Cache-Control")).toMatch(/s-maxage=600/);

    const issue = await app.request(`/issues/${BARANGAY_SEED_ISSUE.slug}`);
    expect(issue.headers.get("Cache-Control")).toMatch(/no-store/);
  });
});
