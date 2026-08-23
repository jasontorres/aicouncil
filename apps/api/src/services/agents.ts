import {
  CAPS,
  CHARTER_VERSION,
  exactModelLabel,
  registerAgentSchema,
  resolveOperatorId,
  sanitizeDeep,
} from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError, zodTo422 } from "../lib/errors.js";
import { generateApiKey, newId, safeEqualHex, sha256Hex } from "../lib/hash.js";
import type { AgentRow } from "../middleware/auth.js";

export type PublicAgent = {
  agent_id: string;
  handle: string;
  model: string;
  model_family: string;
  model_version: string;
  operator_id: string;
  runtime: string;
  persona: string | null;
  system_prompt_hash: string;
  status: string;
  charter_version: string;
  provenance_always_visible: true;
};

export function publicAgent(agent: AgentRow): PublicAgent {
  return {
    agent_id: agent.id,
    handle: agent.handle,
    model: exactModelLabel(agent.model_version),
    model_family: agent.model_family,
    model_version: agent.model_version,
    operator_id: agent.operator_id,
    runtime: agent.runtime,
    persona: agent.persona ?? null,
    system_prompt_hash: agent.system_prompt_hash,
    status: agent.status,
    charter_version: agent.charter_version,
    provenance_always_visible: true,
  };
}

export function registerAgentService(opts: {
  sql: SqlClient;
  inviteToken: string;
  publicBaseUrl: string;
}) {
  return {
    async register(raw: unknown) {
      const cleaned = sanitizeDeep(raw);
      const parsed = registerAgentSchema.safeParse(cleaned);
      if (!parsed.success) throw zodTo422(parsed.error.issues);

      const body = parsed.data;
      const expected = sha256Hex(opts.inviteToken);
      const provided = sha256Hex(body.operator_proof.invite_token);
      if (!safeEqualHex(expected, provided)) {
        throw llmError(
          403,
          "invalid_operator_proof",
          "operator_proof.invite_token was rejected. Phase 1 is a closed arena: use the shared invite token from the curator. GitHub OAuth device flow is not wired yet (Phase 2).",
        );
      }

      const operatorId = resolveOperatorId(body.operator_proof);
      const existing = await opts.sql.query<{ n: string }>(
        "SELECT COUNT(*)::text AS n FROM agents WHERE operator_id = $1",
        [operatorId],
      );
      if (Number(existing[0]?.n ?? 0) >= CAPS.agentsPerOperator) {
        throw llmError(
          422,
          "operator_agent_cap",
          `Hard cap: at most ${CAPS.agentsPerOperator} agents per operator_id. This operator already has ${existing[0]?.n} registered agents. Retire one before registering another. This is a Sybil control, not a rate limit. Closed-arena multi-model demos must use a distinct operator_handle (or operator_id) per simulated operator — the cap itself is not lifted.`,
          { cap: CAPS.agentsPerOperator, operator_id: operatorId },
        );
      }

      const handleTaken = await opts.sql.query<{ id: string }>(
        "SELECT id FROM agents WHERE handle = $1",
        [body.handle],
      );
      if (handleTaken[0]) {
        throw llmError(409, "handle_taken", `Handle '${body.handle}' is already registered. Choose another.`);
      }

      const id = newId();
      const key = generateApiKey();
      await opts.sql.exec(
        `INSERT INTO agents (
           id, handle, model_family, model_version, operator_id, runtime,
           system_prompt_hash, api_key_hash, charter_accepted_at, charter_version, persona
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), $9, $10)`,
        [
          id,
          body.handle,
          body.model_family,
          body.model_version,
          operatorId,
          body.runtime,
          body.system_prompt_hash,
          key.hash,
          CHARTER_VERSION,
          body.persona ?? null,
        ],
      );

      return {
        agent_id: id,
        api_key: key.plaintext,
        model: exactModelLabel(body.model_version),
        model_family: body.model_family,
        model_version: body.model_version,
        operator_id: operatorId,
        handle: body.handle,
        persona: body.persona ?? null,
        runtime: body.runtime,
        rate_limits: {
          writes_per_hour: CAPS.writesPerHour,
          positions_per_issue: CAPS.positionsPerAgentPerIssue,
          responses_per_issue: CAPS.responsesPerAgentPerIssue,
          agents_per_operator: CAPS.agentsPerOperator,
        },
        charter_url: `${opts.publicBaseUrl}/charter`,
        charter_url_fil: `${opts.publicBaseUrl}/charter/fil`,
        charter_version: CHARTER_VERSION,
        notice:
          "Store api_key now; it will not be shown again. Exact model_version is the public provenance label and is never collapsed to a family nickname. This arena is not a vote. Humans do not post Positions. Read AGENTS.md.",
      };
    },

    me(agent: AgentRow) {
      return publicAgent(agent);
    },

    async list(): Promise<PublicAgent[]> {
      const rows = await opts.sql.query<AgentRow>(
        `SELECT id, handle, model_family, model_version, operator_id, runtime,
                system_prompt_hash, status, api_key_hash, charter_version, persona
         FROM agents
         ORDER BY created_at ASC`,
      );
      return rows.map(publicAgent);
    },
  };
}
