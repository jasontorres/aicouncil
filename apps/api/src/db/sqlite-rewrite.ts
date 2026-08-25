export const SQLITE_NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

export type SqliteValue = string | number | null;

export type RewrittenSql = { sql: string; params: SqliteValue[] };

/**
 * Rewrite the Postgres-shaped SQL the app already issues into SQLite/D1.
 * Placeholders stay numbered until the last step, then become `?` in
 * appearance order so repeated `$1` binds the same value twice.
 */
export function rewritePgToSqlite(text: string, params: unknown[] = []): RewrittenSql {
  const next = params.map((value) => cloneParam(value));
  let sql = text;
  const anySlots: unknown[][] = [];

  sql = sql.replace(/string_to_array\(\$(\d+)\s*,\s*','\s*\)/gi, (_, n: string) => {
    const idx = Number(n) - 1;
    const raw = next[idx];
    if (typeof raw === "string" && !raw.trim().startsWith("[")) {
      next[idx] = JSON.stringify(
        raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      );
    } else if (Array.isArray(raw)) {
      next[idx] = JSON.stringify(raw);
    }
    return `$${n}`;
  });

  sql = sql.replace(/=\s*ANY\(\$(\d+)(?:::text\[\])?\)/gi, (_, n: string) => {
    const idx = Number(n) - 1;
    const raw = next[idx];
    const values = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split(",").map((part) => part.trim()).filter(Boolean)
        : [];
    const token = `__ANY_${anySlots.length}__`;
    anySlots.push(values);
    if (values.length === 0) return `IN (${token})`;
    return `IN (${token})`;
  });

  sql = sql.replace(/\bnow\(\)\s*-\s*interval\s+'(\d+)\s+hours?'/gi, (_m, hours: string) => {
    return `datetime('now', '-${hours} hour')`;
  });
  sql = sql.replace(/\bnow\(\)/gi, SQLITE_NOW);
  sql = sql.replace(/::(?:jsonb|timestamptz|timestamp|int|integer|date|text|numeric|bool|boolean)\b/gi, "");
  sql = sql.replace(/\s+NULLS\s+(?:LAST|FIRST)/gi, "");

  const out: SqliteValue[] = [];
  sql = sql.replace(/\$(\d+)|__ANY_(\d+)__/g, (match, dollar: string | undefined, anyIdx: string | undefined) => {
    if (anyIdx !== undefined) {
      const values = anySlots[Number(anyIdx)] ?? [];
      if (values.length === 0) {
        out.push("__never__");
        return "?";
      }
      for (const value of values) out.push(bindValue(value));
      return values.map(() => "?").join(", ");
    }
    const value = next[Number(dollar) - 1];
    out.push(bindValue(value));
    return "?";
  });

  return { sql: sql.trim(), params: out };
}

function cloneParam(value: unknown): unknown {
  if (Array.isArray(value)) return [...value];
  return value;
}

export function bindValue(value: unknown): SqliteValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function isSelectLike(sql: string): boolean {
  return /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sql);
}
