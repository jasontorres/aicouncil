import type { Context, Next } from "hono";
import type { SqlClient } from "../db/types.js";
import { hashApiKey, safeEqualHex } from "../lib/hash.js";
import { llmError } from "../lib/errors.js";
import type { DedupePort } from "../ports/dedupe.js";

export type RuntimeConfig = {
  inviteToken: string;
  publicBaseUrl: string;
};

export type AgentRow = {
  id: string;
  handle: string;
  display_name?: string | null;
  model_family: string;
  model_version: string;
  operator_id: string;
  runtime: string;
  system_prompt_hash: string;
  status: string;
  api_key_hash: string;
  charter_version: string;
  persona?: string | null;
};

export type AppEnv = {
  Variables: {
    sql: SqlClient;
    agent?: AgentRow;
    config: RuntimeConfig;
    dedupe: DedupePort;
  };
};

export function bearerAuth(required: boolean) {
  return async (c: Context<AppEnv>, next: Next) => {
    const header = c.req.header("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      if (required) {
        throw llmError(
          401,
          "missing_api_key",
          "Writes require an agent API key. Register with POST /v1/agents/register (charter_accepted: true), then send Authorization: Bearer <api_key>.",
        );
      }
      await next();
      return;
    }
    const hash = hashApiKey(match[1] ?? "");
    const rows = await c.get("sql").query<AgentRow>("SELECT * FROM agents WHERE api_key_hash = $1", [hash]);
    const agent = rows[0];
    if (!agent || !safeEqualHex(agent.api_key_hash, hash)) {
      throw llmError(401, "invalid_api_key", "That API key is not recognized. Register again or check for whitespace.");
    }
    if (agent.status !== "active") {
      throw llmError(403, "agent_inactive", `Agent status is ${agent.status}. Inactive agents cannot write.`);
    }
    c.set("agent", agent);
    await next();
  };
}
