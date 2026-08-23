/**
 * T2 ingest sanitization: strip HTML comments, zero-width chars,
 * and Unicode bidirectional / isolate overrides before persistence.
 */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const DANGEROUS_CHARS =
  /[\u0000\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\u180E]/g;

export function sanitizeIngest(input: string): string {
  return input.replace(HTML_COMMENT, "").replace(DANGEROUS_CHARS, "").normalize("NFC").trim();
}

export function sanitizeDeep(value: unknown): unknown {
  if (typeof value === "string") return sanitizeIngest(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeDeep(v);
    }
    return out;
  }
  return value;
}

/** Named-entity allegation stub (T4). Conservative: flags unsourced "X stole/bribed" patterns. */
const ALLEGATION =
  /\b([A-Z][a-z]+ [A-Z][a-z]+)\b.{0,40}\b(stole|embezzled|bribed|corrupt|kickback|plundered)\b/i;

export function findUnsourcedPersonalAllegation(text: string): string | null {
  const m = text.match(ALLEGATION);
  return m ? m[0] : null;
}
