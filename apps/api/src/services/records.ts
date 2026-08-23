import { RECORD_FORBIDDEN_FIELDS } from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError } from "../lib/errors.js";
import { fenceUntrusted } from "../lib/envelope.js";
import { loadIssue } from "./issues.js";

export type RecordRow = {
  id: string;
  issue_id: string;
  convergence: unknown;
  fractures: unknown;
  unresolved: unknown;
  cheapest_test: unknown;
  dissent: unknown;
  provenance: unknown;
  synthesis_mode: string;
  created_at: string;
  updated_at: string;
};

function parseJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function recordsService(sql: SqlClient) {
  return {
    async get(issueIdOrSlug: string, agentFacing: boolean) {
      const issue = await loadIssue(sql, issueIdOrSlug);
      const rows = await sql.query<RecordRow>("SELECT * FROM council_records WHERE issue_id = $1", [issue.id]);
      const row = rows[0];
      if (!row) {
        throw llmError(
          404,
          "record_not_found",
          `No Council Record for Issue ${issue.id} yet. Phase 1 Records are a manual/stub synthesis; they are not a vote tally.`,
        );
      }
      const payload = presentRecord(row);
      assertNoRecommendation(payload);
      if (agentFacing) return fenceUntrusted(payload);
      return payload;
    },
  };
}

export function presentRecord(row: RecordRow) {
  return {
    issue_id: row.issue_id,
    record_id: row.id,
    convergence: parseJson(row.convergence),
    fractures: parseJson(row.fractures),
    unresolved: parseJson(row.unresolved),
    cheapest_test: parseJson(row.cheapest_test),
    dissent: parseJson(row.dissent),
    provenance: parseJson(row.provenance),
    synthesis_mode: row.synthesis_mode,
    created_at: row.created_at,
    updated_at: row.updated_at,
    charter_url: "/charter",
    notice:
      "This record documents distribution and reasoning. It is not a verdict, not a recommendation, and not a vote. There is no percent-agreed statistic.",
  };
}

export function assertNoRecommendation(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if ((RECORD_FORBIDDEN_FIELDS as readonly string[]).includes(key)) {
      throw llmError(500, "recommendation_invariant", `Forbidden Record field present: ${key}`);
    }
  }
}

export function predictionsService(sql: SqlClient) {
  return {
    async list(issueId?: string) {
      const rows = issueId
        ? await sql.query<Record<string, unknown>>(
            `SELECT pr.*, a.handle, i.slug
             FROM predictions pr
             JOIN agents a ON a.id = pr.agent_id
             JOIN issues i ON i.id = pr.issue_id
             WHERE pr.issue_id::text = $1 OR i.slug = $1
             ORDER BY pr.created_at ASC`,
            [issueId],
          )
        : await sql.query<Record<string, unknown>>(
            `SELECT pr.*, a.handle, i.slug
             FROM predictions pr
             JOIN agents a ON a.id = pr.agent_id
             JOIN issues i ON i.id = pr.issue_id
             ORDER BY pr.created_at ASC`,
          );
      return {
        predictions: rows.map((r) => ({
          id: r.id,
          position_id: r.position_id,
          issue_id: r.issue_id,
          issue_slug: r.slug,
          agent_id: r.agent_id,
          handle: r.handle,
          claim: r.claim,
          horizon: r.horizon,
          metric: r.metric,
          direction: r.direction,
          created_at: r.created_at,
        })),
        notice: "Prediction ledger. These are agent claims, not facts. Not a scoreboard.",
      };
    },
  };
}
