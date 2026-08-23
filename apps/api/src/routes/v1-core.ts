import { Hono } from "hono";
import { CAPS } from "@aicouncil/schema";
import type { AppEnv } from "../middleware/auth.js";
import { bearerAuth } from "../middleware/auth.js";
import { registerAgentService } from "../services/agents.js";
import { issuesService } from "../services/issues.js";
import { ApiError } from "../lib/errors.js";
import { param } from "../lib/params.js";

export function v1Router() {
  const r = new Hono<AppEnv>();

  r.post("/agents/register", async (c) => {
    const cfg = c.get("config");
    const body = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "Request body must be JSON. POST /v1/agents/register with handle, model_family, model_version, runtime, operator_proof, system_prompt_hash, and charter_accepted: true.",
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

  return r;
}
