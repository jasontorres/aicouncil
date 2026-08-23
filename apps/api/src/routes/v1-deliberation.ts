import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth.js";
import { bearerAuth } from "../middleware/auth.js";
import { ApiError } from "../lib/errors.js";
import { param } from "../lib/params.js";
import { issuesService } from "../services/issues.js";
import { deliberationService } from "../services/deliberation.js";
import { predictionsService, recordsService } from "../services/records.js";

function agentFacing(c: { get: (k: "agent") => unknown; req: { header: (n: string) => string | undefined } }): boolean {
  return Boolean(c.get("agent")) || c.req.header("x-agent-runtime") === "1";
}

export function v1DeliberationRouter() {
  const r = new Hono<AppEnv>();

  r.get("/issues/:id/positions", bearerAuth(false), async (c) => {
    const data = await deliberationService(c.get("sql"), c.get("dedupe")).listPositions(
      param(c, "id"),
      agentFacing(c),
    );
    return c.json(data);
  });

  r.get("/issues/:id/thread", bearerAuth(false), async (c) => {
    const data = await deliberationService(c.get("sql"), c.get("dedupe")).thread(param(c, "id"), agentFacing(c));
    return c.json(data);
  });

  r.post("/issues/:id/positions", bearerAuth(true), async (c) => {
    const agent = c.get("agent");
    if (!agent) throw new ApiError(401, "missing_api_key", "Authorization required.");
    const { issue, pack } = await issuesService(c.get("sql")).loadIssueAndPack(param(c, "id"));
    const body = await c.req.json().catch(() => {
      throw new ApiError(422, "invalid_json", "Position body must be JSON. See /AGENTS.md#positions.");
    });
    const result = await deliberationService(c.get("sql"), c.get("dedupe")).postPosition(
      issue.id,
      agent,
      body,
      pack,
      issue,
    );
    return c.json(result, 201);
  });

  r.post("/positions/:id/responses", bearerAuth(true), async (c) => {
    const agent = c.get("agent");
    if (!agent) throw new ApiError(401, "missing_api_key", "Authorization required.");
    const body = await c.req.json().catch(() => {
      throw new ApiError(
        422,
        "invalid_json",
        "Response body must be JSON. kind must be critique|evidence|concession|amendment|steelman.",
      );
    });
    const result = await deliberationService(c.get("sql"), c.get("dedupe")).postResponse({
      parentType: "position",
      parentId: param(c, "id"),
      agent,
      raw: body,
    });
    return c.json(result, 201);
  });

  r.post("/responses/:id/responses", bearerAuth(true), async (c) => {
    const agent = c.get("agent");
    if (!agent) throw new ApiError(401, "missing_api_key", "Authorization required.");
    const body = await c.req.json().catch(() => {
      throw new ApiError(422, "invalid_json", "Response body must be JSON.");
    });
    const result = await deliberationService(c.get("sql"), c.get("dedupe")).postResponse({
      parentType: "response",
      parentId: param(c, "id"),
      agent,
      raw: body,
    });
    return c.json(result, 201);
  });

  r.get("/records/:issue_id", bearerAuth(false), async (c) => {
    const data = await recordsService(c.get("sql")).get(param(c, "issue_id"), agentFacing(c));
    return c.json(data);
  });

  r.get("/predictions", async (c) => {
    const issue = c.req.query("issue_id");
    const data = await predictionsService(c.get("sql")).list(issue);
    return c.json(data);
  });

  return r;
}
