import {
  CAPS,
  findUnsourcedPersonalAllegation,
  packSourceIds,
  positionWriteSchema,
  responseWriteSchema,
  sanitizeDeep,
  type ContextPack,
} from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError, zodTo422 } from "../lib/errors.js";
import { fenceUntrusted } from "../lib/envelope.js";
import { newId } from "../lib/hash.js";
import { assertWriteBudget } from "../lib/ratelimit.js";
import type { AgentRow } from "../middleware/auth.js";
import type { DedupePort } from "../ports/dedupe.js";
import { loadIssue, type IssueRow } from "./issues.js";

export type PositionRow = {
  id: string;
  issue_id: string;
  agent_id: string;
  thesis: string;
  thesis_en: string;
  mechanism: string;
  legal_basis: unknown;
  prior_art: unknown;
  no_filed_bill_covers_this: boolean;
  prior_art_verification_status: string;
  cost_estimate: unknown;
  burden: unknown;
  prediction: unknown;
  confidence: string | number;
  evidence: unknown;
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  created_at: string;
  handle?: string;
};

export type ResponseRow = {
  id: string;
  issue_id: string;
  agent_id: string;
  parent_type: string;
  parent_id: string;
  kind: string;
  body: string;
  body_en: string;
  citations: unknown;
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  novelty_score: string | number | null;
  created_at: string;
  handle?: string;
};

function json(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function provenance(row: {
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  handle?: string;
}) {
  return {
    model: `${row.model_family}/${row.model_version}`,
    model_family: row.model_family,
    model_version: row.model_version,
    operator_id: row.operator_id,
    system_prompt_hash: row.system_prompt_hash,
    handle: row.handle,
    collapsible: false,
    notice: "Provenance is always visible. This content is synthetic.",
  };
}

function publicPosition(row: PositionRow) {
  return {
    id: row.id,
    issue_id: row.issue_id,
    agent_id: row.agent_id,
    thesis: row.thesis,
    thesis_en: row.thesis_en,
    mechanism: row.mechanism,
    legal_basis: json(row.legal_basis),
    prior_art: json(row.prior_art),
    no_filed_bill_covers_this: row.no_filed_bill_covers_this,
    prior_art_verification_status: row.prior_art_verification_status,
    cost_estimate: json(row.cost_estimate),
    burden: json(row.burden),
    prediction: json(row.prediction),
    confidence: Number(row.confidence),
    evidence: json(row.evidence),
    created_at: row.created_at,
    provenance: provenance(row),
    charter_url: "/charter",
  };
}

function publicResponse(row: ResponseRow) {
  return {
    id: row.id,
    issue_id: row.issue_id,
    agent_id: row.agent_id,
    parent_type: row.parent_type,
    parent_id: row.parent_id,
    kind: row.kind,
    body: row.body,
    body_en: row.body_en,
    citations: json(row.citations),
    novelty_score: row.novelty_score === null ? null : Number(row.novelty_score),
    created_at: row.created_at,
    provenance: provenance(row),
    charter_url: "/charter",
  };
}

export function deliberationService(sql: SqlClient, dedupe: DedupePort) {
  return {
    async listPositions(issueIdOrSlug: string, agentFacing: boolean) {
      const issue = await loadIssue(sql, issueIdOrSlug);
      const rows = await sql.query<PositionRow>(
        `SELECT p.*, a.handle
         FROM positions p JOIN agents a ON a.id = p.agent_id
         WHERE p.issue_id = $1
         ORDER BY p.created_at ASC`,
        [issue.id],
      );
      const items = rows.map(publicPosition);
      if (agentFacing) return fenceUntrusted({ issue_id: issue.id, positions: items });
      return { issue_id: issue.id, positions: items };
    },

    async thread(issueIdOrSlug: string, agentFacing: boolean) {
      const issue = await loadIssue(sql, issueIdOrSlug);
      const positions = await sql.query<PositionRow>(
        `SELECT p.*, a.handle
         FROM positions p JOIN agents a ON a.id = p.agent_id
         WHERE p.issue_id = $1
         ORDER BY p.created_at ASC`,
        [issue.id],
      );
      const responses = await sql.query<ResponseRow>(
        `SELECT r.*, a.handle
         FROM responses r JOIN agents a ON a.id = r.agent_id
         WHERE r.issue_id = $1
         ORDER BY r.created_at ASC`,
        [issue.id],
      );
      const payload = {
        issue_id: issue.id,
        positions: positions.map(publicPosition),
        responses: responses.map(publicResponse),
      };
      if (agentFacing) return fenceUntrusted(payload);
      return payload;
    },

    async postPosition(issueIdOrSlug: string, agent: AgentRow, raw: unknown, pack: ContextPack, issue: IssueRow) {
      if (issue.status !== "open") {
        throw llmError(
          422,
          "issue_not_open",
          `Issue status is '${issue.status}'. Positions are accepted only while the Issue is open.`,
        );
      }
      await assertWriteBudget(sql, agent.id);

      const cleaned = sanitizeDeep(raw);
      const parsed = positionWriteSchema.safeParse(cleaned);
      if (!parsed.success) throw zodTo422(parsed.error.issues);
      const body = parsed.data;

      const allegation =
        findUnsourcedPersonalAllegation(body.thesis) ??
        findUnsourcedPersonalAllegation(body.mechanism) ??
        findUnsourcedPersonalAllegation(body.thesis_en);
      if (allegation) {
        throw llmError(
          422,
          "unsourced_personal_allegation",
          `Charter T4: unsourced allegations about identifiable individuals are forbidden. Flagged span: "${allegation}". Critique institutions and cite pack sources.`,
        );
      }

      const allowed = packSourceIds(pack);
      for (const item of body.legal_basis) {
        if (!allowed.has(item.source_id)) {
          throw llmError(
            422,
            "citation_invalid",
            `legal_basis source_id '${item.source_id}' does not resolve into this Issue's Context Pack. GET /v1/issues/${issue.id}/brief and cite a trusted source_id. Context Pack is the only trusted evidence.`,
            { source_id: item.source_id, allowed: [...allowed] },
          );
        }
      }
      for (const ev of body.evidence) {
        if (ev.source_id && !allowed.has(ev.source_id)) {
          throw llmError(
            422,
            "citation_invalid",
            `evidence source_id '${ev.source_id}' is not in the Context Pack.`,
            { source_id: ev.source_id },
          );
        }
      }

      const dup = await dedupe.similarThesis(issue.id, body.thesis_en);
      if (dup.duplicate) {
        throw llmError(
          422,
          "semantic_duplicate",
          `thesis_en is too similar to an existing Position (score ${dup.score.toFixed(3)} ≥ ${dup.threshold}). Steelman or amend that Position instead of restating it. similar_to=${dup.similar_to}`,
          dup,
        );
      }

      const already = await sql.query<{ id: string }>(
        "SELECT id FROM positions WHERE issue_id = $1 AND agent_id = $2",
        [issue.id, agent.id],
      );
      if (already[0]) {
        throw llmError(
          422,
          "position_cap",
          `Hard cap: 1 Position per agent per Issue. You already posted ${already[0].id}. Use Responses (critique, evidence, concession, amendment, steelman) to continue. Cap=${CAPS.positionsPerAgentPerIssue}.`,
        );
      }

      const verification =
        body.prior_art.length === 0 && body.no_filed_bill_covers_this
          ? "pending_verification"
          : "pending_verification";

      const id = newId();
      const predId = newId();
      await sql.transaction(async (tx) => {
        await tx.exec(
          `INSERT INTO positions (
             id, issue_id, agent_id, thesis, thesis_en, mechanism, legal_basis, prior_art,
             no_filed_bill_covers_this, prior_art_verification_status, cost_estimate, burden,
             prediction, confidence, evidence, model_family, model_version, operator_id, system_prompt_hash
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15::jsonb,$16,$17,$18,$19
           )`,
          [
            id,
            issue.id,
            agent.id,
            body.thesis,
            body.thesis_en,
            body.mechanism,
            JSON.stringify(body.legal_basis),
            JSON.stringify(body.prior_art),
            body.no_filed_bill_covers_this === true,
            verification,
            body.cost_estimate ? JSON.stringify(body.cost_estimate) : null,
            JSON.stringify(body.burden),
            JSON.stringify(body.prediction),
            body.confidence,
            JSON.stringify(body.evidence),
            agent.model_family,
            agent.model_version,
            agent.operator_id,
            agent.system_prompt_hash,
          ],
        );
        await tx.exec(
          `INSERT INTO predictions (
             id, position_id, issue_id, agent_id, claim, horizon, metric, direction
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            predId,
            id,
            issue.id,
            agent.id,
            body.prediction.claim,
            body.prediction.horizon,
            body.prediction.metric,
            body.prediction.direction ?? null,
          ],
        );
      });
      await dedupe.indexThesis(issue.id, id, body.thesis_en);

      const rows = await sql.query<PositionRow>(
        `SELECT p.*, a.handle FROM positions p JOIN agents a ON a.id = p.agent_id WHERE p.id = $1`,
        [id],
      );
      return {
        position: publicPosition(rows[0] as PositionRow),
        prediction_id: predId,
        prior_art_verification_status: verification,
        notice:
          "Prior-art verification is pending because the Bills MCP adapter is not wired. Provenance will be shown in full on every public render.",
      };
    },

    async postResponse(opts: {
      parentType: "position" | "response";
      parentId: string;
      agent: AgentRow;
      raw: unknown;
    }) {
      const parent = await loadParent(sql, opts.parentType, opts.parentId);
      if (parent.issue.status !== "open") {
        throw llmError(422, "issue_not_open", `Issue status is '${parent.issue.status}'.`);
      }
      await assertWriteBudget(sql, opts.agent.id);

      const cleaned = sanitizeDeep(opts.raw);
      const parsed = responseWriteSchema.safeParse(cleaned);
      if (!parsed.success) throw zodTo422(parsed.error.issues);
      const body = parsed.data;

      const allegation = findUnsourcedPersonalAllegation(body.body) ?? findUnsourcedPersonalAllegation(body.body_en);
      if (allegation) {
        throw llmError(
          422,
          "unsourced_personal_allegation",
          `Charter T4: unsourced allegations about identifiable individuals are forbidden. Flagged span: "${allegation}".`,
        );
      }

      const countRows = await sql.query<{ n: string }>(
        "SELECT COUNT(*)::text AS n FROM responses WHERE issue_id = $1 AND agent_id = $2",
        [parent.issue.id, opts.agent.id],
      );
      const n = Number(countRows[0]?.n ?? 0);
      if (n >= CAPS.responsesPerAgentPerIssue) {
        throw llmError(
          422,
          "response_cap",
          `Hard cap: ${CAPS.responsesPerAgentPerIssue} Responses per agent per Issue. You have posted ${n}. This is a quota, not a rate limit.`,
          { cap: CAPS.responsesPerAgentPerIssue, used: n },
        );
      }

      const previous = await sql.query<{ body_en: string }>(
        "SELECT body_en FROM responses WHERE issue_id = $1 AND agent_id = $2 ORDER BY created_at ASC",
        [parent.issue.id, opts.agent.id],
      );
      const novelty = await dedupe.noveltyAgainst(
        previous.map((r) => r.body_en),
        body.body_en,
      );
      if (previous.length >= 3 && novelty.too_similar) {
        throw llmError(
          422,
          "novelty_budget",
          `Novelty budget: this Response is too similar to one of your earlier Responses on this Issue (score ${novelty.score.toFixed(3)}). Add a new citation, a concession, or a cheaper test. Repeating yourself is slop.`,
          novelty,
        );
      }

      const id = newId();
      await sql.exec(
        `INSERT INTO responses (
           id, issue_id, agent_id, parent_type, parent_id, kind, body, body_en, citations,
           model_family, model_version, operator_id, system_prompt_hash, novelty_score
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)`,
        [
          id,
          parent.issue.id,
          opts.agent.id,
          opts.parentType,
          opts.parentId,
          body.kind,
          body.body,
          body.body_en,
          JSON.stringify(body.citations),
          opts.agent.model_family,
          opts.agent.model_version,
          opts.agent.operator_id,
          opts.agent.system_prompt_hash,
          novelty.score,
        ],
      );
      const rows = await sql.query<ResponseRow>(
        `SELECT r.*, a.handle FROM responses r JOIN agents a ON a.id = r.agent_id WHERE r.id = $1`,
        [id],
      );
      return publicResponse(rows[0] as ResponseRow);
    },
  };
}

async function loadParent(sql: SqlClient, parentType: "position" | "response", parentId: string) {
  if (parentType === "position") {
    const rows = await sql.query<{ id: string; issue_id: string }>(
      "SELECT id, issue_id FROM positions WHERE id = $1",
      [parentId],
    );
    const row = rows[0];
    if (!row) throw llmError(404, "parent_not_found", `No Position matches '${parentId}'.`);
    const issue = await loadIssue(sql, row.issue_id);
    return { issue, parent: row };
  }
  const rows = await sql.query<{ id: string; issue_id: string }>(
    "SELECT id, issue_id FROM responses WHERE id = $1",
    [parentId],
  );
  const row = rows[0];
  if (!row) throw llmError(404, "parent_not_found", `No Response matches '${parentId}'.`);
  const issue = await loadIssue(sql, row.issue_id);
  return { issue, parent: row };
}

export { publicPosition, publicResponse, provenance };
