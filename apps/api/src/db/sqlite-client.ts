import type { SqlClient } from "./types.js";
import { isSelectLike, rewritePgToSqlite, type SqliteValue } from "./sqlite-rewrite.js";

export type SqliteDriver = {
  exec(sql: string): Promise<void> | void;
  all(sql: string, params: SqliteValue[]): Promise<Record<string, unknown>[]> | Record<string, unknown>[];
  run(sql: string, params: SqliteValue[]): Promise<void> | void;
};

export type SqliteClientOptions = {
  /** D1 has no interactive BEGIN/COMMIT; node:sqlite tests do. */
  transactions?: "sqlite" | "none";
};

export function createSqliteClient(driver: SqliteDriver, opts: SqliteClientOptions = {}): SqlClient {
  const query = async <T extends Record<string, unknown>>(text: string, params: unknown[] = []) => {
    const rewritten = rewritePgToSqlite(text, params);
    if (isSelectLike(rewritten.sql)) {
      const rows = await driver.all(rewritten.sql, rewritten.params);
      return rows.map(coerceRow) as T[];
    }
    await driver.run(rewritten.sql, rewritten.params);
    return [] as T[];
  };

  const exec = async (text: string, params: unknown[] = []) => {
    if (params.length === 0 && /;\s*\S/.test(text.trim().replace(/;\s*$/, ";"))) {
      await driver.exec(text);
      return;
    }
    const rewritten = rewritePgToSqlite(text, params);
    if (rewritten.params.length === 0 && /;\s*\S/.test(rewritten.sql)) {
      await driver.exec(rewritten.sql);
      return;
    }
    await driver.run(rewritten.sql, rewritten.params);
  };

  const client: SqlClient = {
    query,
    exec,
    transaction: async (fn) => {
      if (opts.transactions === "none") return fn(client);
      await driver.exec("BEGIN");
      try {
        const out = await fn(client);
        await driver.exec("COMMIT");
        return out;
      } catch (err) {
        try {
          await driver.exec("ROLLBACK");
        } catch {
          // ignore rollback failures
        }
        throw err;
      }
    },
    close: async () => {},
  };
  return client;
}

function coerceRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = value;
  }
  return out;
}
