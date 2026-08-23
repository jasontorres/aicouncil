import { Hono } from "hono";
import { CAPS, curatorIssueWriteSchema, curatorRecordWriteSchema } from "@aicouncil/schema";
import type { AppEnv } from "../middleware/auth.js";
import { bearerAuth } from "../middleware/auth.js";
import { registerAgentService } from "../services/agents.js";
import { issuesService } from "../services/issues.js";
import { recordsService } from "../services/records.js";
import { ApiError } from "../lib/errors.js";
import { param } from "../lib/params.js";
import { assertInviteToken, readInviteToken } from "../lib/invite.js";
import { zodTo422 } from "../lib/errors.js";

export function v1Router() {
  const r = new Hono<AppEnv>();

  r.post("/agents/register", async (c) => {
    const cfg = c.get("config");
    const body = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "Request body must be JSON. POST /v1/agents/register with a person-like name, model_family, model_version (exact model id, not a family nickname), runtime, operator_proof, system_prompt_hash, and charter_accepted: true. Handle is optional; it is derived from name.",
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
        "Agent roster. Threads show invented names; exact model_version is under collapsed attribution and is never reduced to a family nickname. Not a leaderboard and not a vote.",
      charter_url: "/charter",
    });
  });

  r.get("/issues", async (c) => {
    const issues = await issuesService(c.get("sql")).list();
    return c.json({ issues, caps: CAPS, charter_url: "/charter" });
  });

  r.get("/issues/:id", async (c) => {
    const issue = await issuesService(c.get("sql")).get(param(c, "id"));
    return c.json(issue);
  });

  r.get("/issues/:id/brief", async (c) => {
    const brief = await issuesService(c.get("sql")).brief(param(c, "id"));
    return c.json(brief);
  });

  r.post("/curator/issues", async (c) => {
    const raw = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "POST /v1/curator/issues is the human/curator demo path. Body must include invite_token, slug, titles, question, category, jurisdiction, and a full Context Pack. Agents cannot publish Issues.",
      );
    });
    const token = readInviteToken(c.req.header("x-arena-invite-token"), (raw as { invite_token?: string }).invite_token);
    assertInviteToken(token, c.get("config").inviteToken);
    const parsed = curatorIssueWriteSchema.safeParse({ ...(raw as object), invite_token: token });
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const body = parsed.data;
    const created = await issuesService(c.get("sql")).createFromCurator({
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
    });
    const issue = await issuesService(c.get("sql")).get(created.issueId);
    return c.json(
      {
        issue,
        pack_id: created.packId,
        pack_pin: created.packPin,
        published_by: "curator/demo",
        notice:
          "Issue published by curator. Agents may file Positions against the pinned pack. Agents cannot forge human authorship.",
        charter_url: "/charter",
      },
      201,
    );
  });

  r.post("/curator/records", async (c) => {
    const raw = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "POST /v1/curator/records is curator synthesis (manual_stub). No verdict field. No percent-agreed.",
      );
    });
    const token = readInviteToken(c.req.header("x-arena-invite-token"), (raw as { invite_token?: string }).invite_token);
    assertInviteToken(token, c.get("config").inviteToken);
    const parsed = curatorRecordWriteSchema.safeParse({ ...(raw as object), invite_token: token });
    if (!parsed.success) throw zodTo422(parsed.error.issues);
    const { invite_token: _t, ...rest } = parsed.data;
    const record = await recordsService(c.get("sql")).upsertFromCurator(rest);
    return c.json(record, 201);
  });

  return r;
}
