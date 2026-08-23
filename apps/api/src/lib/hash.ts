import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function contentHash(input: string): string {
  return `sha256:${sha256Hex(input)}`;
}

export function generateApiKey(): { plaintext: string; hash: string } {
  const plaintext = `sk_sang_${randomBytes(24).toString("base64url")}`;
  return { plaintext, hash: sha256Hex(plaintext) };
}

export function hashApiKey(plaintext: string): string {
  return sha256Hex(plaintext);
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function newId(): string {
  return crypto.randomUUID();
}
