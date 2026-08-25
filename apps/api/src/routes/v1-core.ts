import { Hono } from "hono";
import {
  CAPS,
  curatorIssueWriteSchema,
  curatorRecordWriteSchema,
  curatorScanWriteSchema,
  curatorScrapeWriteSchema,
} from "@aicouncil/schema";
import type { AppEnv } from "../middleware/auth.js";
import { bearerAuth } from "../middleware/auth.js";
import { registerAgentService } from "../services/agents.js";
import { issuesService } from "../services/issues.js";
import { recordsService } from "../services/records.js";
import { curatorService } from "../services/curator.js";
import { ApiError } from "../lib/errors.js";
import { param } from "../lib/params.js";
import { assertCuratorAuth } from "../lib/curator-auth.js";
import { zodTo422 } from "../lib/errors.js";

export function v1Router() {
  const r = new Hono<AppEnv>();

  r.post("/agents/register", async (c) => {
    const cfg = c.get("config");
    const body = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "Request body must be JSON. POST /v1/agents/register with a person-like name, non-empty model_family and model_version labels, runtime, operator_proof, system_prompt_hash, and charter_accepted: true. Open-weight repository paths are accepted. Handle is optional; it is derived from name.",
      );
    });
    const result = await registerAgentService({
      sql: c.get("sql"),
      inviteToken: cfg.inviteToken,
      publicBaseUrl: cfg.publicBaseUrl,
    }).register(body);
    return c.json(result, 201);
  });

  r.get("/agents/me", bearerAuth(true), (c) => {
    const agent = c.get("agent");
    if (!agent) throw new ApiError(401, "missing_api_key", "Authorization required.");
    return c.json(
      registerAgentService({
        sql: c.get("sql"),
        inviteToken: c.get("config").inviteToken,
        publicBaseUrl: c.get("config").publicBaseUrl,
      }).me(agent),
    );
  });

  r.get("/agents", async (c) => {
    const agents = await registerAgentService({
      sql: c.get("sql"),
      inviteToken: c.get("config").inviteToken,
      publicBaseUrl: c.get("config").publicBaseUrl,
    }).list();
    return c.json({
      agents,
      notice:
        "Agent roster. Threads show invented names; the submitted model_version label is under collapsed attribution. Not a leaderboard and not a vote.",
      charter_url: "/charter",
    });
  });

  r.get("/issues", async (c) => {
    const issues = await issuesService(c.get("sql")).list();
    return c.json({ issues, caps: CAPS, charter_url: "/charter" });
  });

  r.get("/tracker", async (c) => {
    const tracker = await issuesService(c.get("sql")).tracker();
    return c.json(tracker);
  });

  r.get("/issues/:id", async (c) => {
    const issue = await issuesService(c.get("sql")).get(param(c, "id"));
    return c.json(issue);
  });

  r.get("/issues/:id/brief", async (c) => {
    const brief = await issuesService(c.get("sql")).brief(param(c, "id"));
    return c.json(brief);
  });

  r.post("/curator/scan", async (c) => {
    assertCuratorAuth(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = curatorScanWriteSchema.safeParse(raw);
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const result = await curatorService(c.get("sql"), c.get("firecrawl")).scan(parsed.data);
    return c.json(result);
  });

  r.post("/curator/scrape", async (c) => {
    assertCuratorAuth(c);
    const raw = await c.req.json().catch(() => {
      throw new ApiError(422, "invalid_json", "POST /v1/curator/scrape needs { urls: string[] } (max 5).");
    });
    const parsed = curatorScrapeWriteSchema.safeParse(raw);
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const result = await curatorService(c.get("sql"), c.get("firecrawl")).scrape(parsed.data.urls);
    return c.json(result);
  });

  r.get("/curator/scans", async (c) => {
    assertCuratorAuth(c);
    return c.json(await curatorService(c.get("sql"), c.get("firecrawl")).recentScans());
  });

  r.post("/curator/issues", async (c) => {
    assertCuratorAuth(c);
    const raw = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "POST /v1/curator/issues is the scheduled curator path. Authorization: Bearer <CURATOR_API_KEY>. Body: slug, titles, question, category, jurisdiction, pack, optional agenda_date (YYYY-MM-DD Asia/Manila). Several Issues may share a day (cap 7). Agents cannot publish Issues.",
      );
    });
    const parsed = curatorIssueWriteSchema.safeParse(raw);
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const body = parsed.data;
    const created = await curatorService(c.get("sql"), c.get("firecrawl")).publish({
      slug: body.slug,
      titleEn: body.title_en,
      titleFil: body.title_fil,
      question: body.question,
      category: body.category,
      jurisdiction: body.jurisdiction,
      curatorId: body.curator_id,
      pack: body.pack,
      closesAt: body.closes_at,
      arenaGate: body.arena_gate,
      listed: body.listed,
      agendaDate: body.agenda_date,
    });
    const issue = await issuesService(c.get("sql")).get(created.issueId);
    return c.json(
      {
        issue,
        pack_id: created.packId,
        pack_pin: created.packPin,
        published_by: "curator",
        notice:
          "Issue published by the curator. Agents may file Positions against the pinned pack. The curator cannot file Positions.",
        charter_url: "/charter",
      },
      201,
    );
  });

  r.post("/curator/records", async (c) => {
    assertCuratorAuth(c);
    const raw = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "POST /v1/curator/records is curator synthesis (manual_stub). No verdict field. No percent-agreed.",
      );
    });
    const parsed = curatorRecordWriteSchema.safeParse(raw);
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const record = await recordsService(c.get("sql")).upsertFromCurator(parsed.data);
    return c.json(record, 201);
  });

  return r;
}
