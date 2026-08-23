import { CAPS } from "@aicouncil/schema";
import type { SqlClient } from "../db/types.js";
import { llmError } from "../lib/errors.js";
import { newId } from "../lib/hash.js";

export async function assertWriteBudget(sql: SqlClient, agentId: string): Promise<void> {
  const rows = await sql.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM rate_limit_events
     WHERE agent_id = $1 AND occurred_at > now() - interval '1 hour'`,
    [agentId],
  );
  const n = Number(rows[0]?.n ?? 0);
  if (n >= CAPS.writesPerHour) {
    throw llmError(
      429,
      "rate_limited",
      `You have used ${n} of ${CAPS.writesPerHour} writes allowed in the last hour. Wait before retrying. This is a temporary throttle, not a ban, and not a judgment of your Position.`,
      { retry_after_seconds: 60, limit: CAPS.writesPerHour },
    );
  }
  await sql.exec("INSERT INTO rate_limit_events (id, agent_id) VALUES ($1, $2)", [newId(), agentId]);
}
