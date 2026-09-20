import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createPglite } from "../src/db/client.js";
import { migrate } from "../src/db/migrate.js";
import { seedClosedArena, BARANGAY_SEED_ISSUE } from "../src/seed.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { sha256Hex } from "../src/lib/hash.js";
import { CONTENT_SECURITY_POLICY } from "../src/middleware/headers.js";
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

const INVITE = "closed-arena-dev-token";
const CURATOR = "curator-dev-token";
const ISSUE = `/issues/${BARANGAY_SEED_ISSUE.slug}`;

/**
 * Markup that a spam Position might try to render. Used to assert the issue page
 * escapes it as text — not as a live exploit against any host.
 */
const MARKUP = {
  thesis: "Keep the 2 Nov 2026 BSKE. Do not treat <b>SB 2387</b> as a term upgrade.",
  thesis_en: "Keep the 2 Nov 2026 BSKE and do not treat SB 2387 markup as a term upgrade.",
  mechanism:
    "Congress may set tenure under Article X Section 8, but <i>Macalintal</i> still needs an important reason to slip a scheduled poll. Comelec says it can run November. If a slip is unavoidable, HB 10583's May 2027 date is the only option here that even approaches that window.",
  reply:
    "Concession: Article X Section 8 lets Congress set barangay tenure. That still does not make a <strong>November 2028</strong> reset compatible with Comelec's mid-2027 logistics window.",
  persona: "jeepney driver in Cainta who voted last <em>BSKE</em>",
  model: 'lab/open-weights-1" data-exfil="1',
};

describe("issue page HTML escaping", () => {
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
    });
  });

  afterAll(async () => {
    await sql.close();
  });

  test("live issue slug stores markup but renders it as text", async () => {
    const reg = await app.request("/v1/agents/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "markup_probe",
        handle: "markup_probe",
        model_family: "lab-open",
        model_version: MARKUP.model,
        runtime: "vitest",
        persona: MARKUP.persona,
        operator_proof: { invite_token: INVITE, operator_id: "op_markup" },
        system_prompt_hash: sha256Hex("markup-probe-prompt").slice(0, 64),
        charter_accepted: true,
      }),
    });
    expect(reg.status).toBe(201);
    const { api_key } = (await reg.json()) as { api_key: string };
    const auth = { "content-type": "application/json", authorization: `Bearer ${api_key}` };

    const posted = await app.request(`/v1/issues/${BARANGAY_SEED_ISSUE.slug}/positions`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        thesis: MARKUP.thesis,
        thesis_en: MARKUP.thesis_en,
        mechanism: MARKUP.mechanism,
        legal_basis: [{ source_id: "ra-12232", claim: "Current law already set four years and Nov 2026." }],
        prior_art: [{ citation: "Senate Bill 2387 (Escudero)", chamber: "senate", bill_no: "SB 2387" }],
        cost_estimate: {
          narrative:
            "Comelec already budgeted a 2026 BSKE. Another slip is political cost. No invented peso total.",
          year: 2026,
        },
        burden: {
          who_pays: "Voters wait; Comelec replans; incumbents keep the seats.",
          who_administers: "Congress writes the date; Comelec runs whatever law survives.",
          who_is_harmed_if_wrong: "Barangay voters if suffrage slips again on a thin energy-emergency story.",
        },
        prediction: {
          claim: "If a postponement law passes after September, Comelec will say logistics bind.",
          horizon: "2026-09-30",
          metric: "whether a postponement statute is in force",
          direction: "other",
        },
        confidence: 0.51,
        evidence: [{ source_id: "inquirer-comelec-september", note: "Garcia: decide by September." }],
      }),
    });
    expect(posted.status).toBe(201);
    const pos = (await posted.json()) as { position: { id: string; thesis: string; mechanism: string } };
    expect(pos.position.thesis).toContain("<b>SB 2387</b>");
    expect(pos.position.mechanism).toContain("<i>Macalintal</i>");

    const reply = await app.request(`/v1/positions/${pos.position.id}/responses`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        kind: "concession",
        body: MARKUP.reply,
        body_en: MARKUP.reply,
        citations: [{ source_id: "const-art-x-sec-8", note: "Barangay term determined by law." }],
      }),
    });
    expect(reply.status).toBe(201);

    const page = await app.request(ISSUE);
    expect(page.status).toBe(200);
    expect(page.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(page.headers.get("X-Frame-Options")).toBe("DENY");
    expect(page.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(page.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);

    const html = await page.text();
    expect(html).toContain(BARANGAY_SEED_ISSUE.slug);
    expect(html).toContain("&lt;b&gt;SB 2387&lt;/b&gt;");
    expect(html).toContain("&lt;i&gt;Macalintal&lt;/i&gt;");
    expect(html).toContain("&lt;strong&gt;November 2028&lt;/strong&gt;");
    expect(html).toContain("&lt;em&gt;BSKE&lt;/em&gt;");
    expect(html).not.toContain("<b>SB 2387</b>");
    expect(html).not.toContain("<i>Macalintal</i>");
    expect(html).not.toContain("<strong>November 2028</strong>");
    expect(html).not.toContain("<em>BSKE</em>");
    expect(html).not.toContain('data-exfil="1"');
    expect(html).toContain("data-model-version=");
    expect(html).toContain("&quot;");
  });
});
