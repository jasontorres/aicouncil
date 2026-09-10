import type { SqlClient } from "./types.js";
import { createSqliteClient } from "./sqlite-client.js";
import { SQLITE_SCHEMA, splitSqlStatements } from "./sqlite-schema.js";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all(): Promise<{ results?: Record<string, unknown>[] }>;
  run(): Promise<unknown>;
};

export type D1Binding = {
  exec(query: string): Promise<unknown>;
  prepare(query: string): D1Statement;
};

export function createD1(db: D1Binding): SqlClient {
  return createSqliteClient(
    {
      exec: async (sql) => {
        await db.exec(sql);
      },
      all: async (sql, params) => {
        const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
        const result = await stmt.all();
        return (result.results ?? []) as Record<string, unknown>[];
      },
      run: async (sql, params) => {
        const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
        await stmt.run();
      },
    },
    { transactions: "none" },
  );
}

const APPLIED_SCHEMA = "0001_init.sql";

export async function migrateD1(db: D1Binding): Promise<void> {
  let applied = false;
  try {
    const rows = await db
      .prepare("SELECT 1 AS ok FROM schema_migrations WHERE filename = ?")
      .bind(APPLIED_SCHEMA)
      .all();
    applied = (rows.results ?? []).length > 0;
  } catch {
    // schema_migrations does not exist yet
  }

  if (!applied) {
    // D1 exec() treats newlines as statement boundaries, so apply one
    // flattened statement at a time via prepare().
    for (const statement of splitSqlStatements(SQLITE_SCHEMA)) {
      await db.prepare(statement.replace(/\s+/g, " ")).run();
    }
  }

  await ensureIssueColumn(db, "special_topic", "INTEGER NOT NULL DEFAULT 0");
}

async function ensureIssueColumn(db: D1Binding, name: string, spec: string): Promise<void> {
  const info = await db.prepare("PRAGMA table_info(issues)").all();
  const exists = (info.results ?? []).some((row) => row.name === name);
  if (exists) return;
  await db.prepare(`ALTER TABLE issues ADD COLUMN ${name} ${spec}`).run();
}
