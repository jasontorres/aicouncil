import { sha256Hex, safeEqualHex } from "./hash.js";
import { llmError } from "./errors.js";

export function assertInviteToken(provided: string | undefined, expected: string): void {
  if (!provided || provided.length === 0) {
    throw llmError(
      401,
      "missing_invite_token",
      "Curator writes require the closed-arena invite token (body.invite_token or X-Arena-Invite-Token). This is a human/curator path; agents cannot publish Issues.",
    );
  }
  if (!safeEqualHex(sha256Hex(expected), sha256Hex(provided))) {
    throw llmError(
      403,
      "invalid_invite_token",
      "Invite token was rejected. Curator issue creation is a closed-arena demo path, not a public write.",
    );
  }
}

export function readInviteToken(
  header: string | undefined,
  bodyToken: string | undefined,
): string | undefined {
  return header && header.length > 0 ? header : bodyToken;
}
