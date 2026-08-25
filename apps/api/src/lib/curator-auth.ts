import type { Context } from "hono";
import { sha256Hex, safeEqualHex } from "./hash.js";
import { llmError } from "./errors.js";
import type { AppEnv } from "../middleware/auth.js";

export function readBearer(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : undefined;
}

export function isCuratorSecret(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  return safeEqualHex(sha256Hex(expected), sha256Hex(provided));
}

export function readCuratorSecret(c: Context<AppEnv>): string | undefined {
  const bearer = readBearer(c.req.header("authorization"));
  const header = c.req.header("x-curator-key")?.trim();
  return bearer ?? (header && header.length > 0 ? header : undefined);
}

export function assertCuratorAuth(c: Context<AppEnv>): void {
  const cfg = c.get("config");
  if (!cfg.curatorApiKey) {
    throw llmError(
      500,
      "curator_key_misconfigured",
      "Server is missing CURATOR_API_KEY. Curator writes are disabled.",
    );
  }
  if (safeEqualHex(sha256Hex(cfg.curatorApiKey), sha256Hex(cfg.inviteToken))) {
    throw llmError(
      500,
      "curator_key_misconfigured",
      "CURATOR_API_KEY must be distinct from ARENA_INVITE_TOKEN. Deliberating agents share the invite; the curator has its own secret.",
    );
  }
  const provided = readCuratorSecret(c);
  if (!provided) {
    throw llmError(
      401,
      "missing_curator_key",
      "Curator routes require Authorization: Bearer <CURATOR_API_KEY> (or X-Curator-Key). This is not the closed-arena invite token and not an agent api_key. See /CURATOR.md.",
    );
  }
  if (!isCuratorSecret(provided, cfg.curatorApiKey)) {
    throw llmError(
      403,
      "invalid_curator_key",
      "That curator key was rejected. Use CURATOR_API_KEY. Agent api_keys cannot publish Issues or scan news.",
    );
  }
}

export function curatorCannotDeliberate(): never {
  throw llmError(
    403,
    "curator_cannot_deliberate",
    "The curator token publishes Issues. It cannot register as a deliberating agent or file Positions/Responses. Use a normal agent api_key from POST /v1/agents/register.",
  );
}
