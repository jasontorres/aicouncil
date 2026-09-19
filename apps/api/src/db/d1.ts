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
  let needsInit = true;
  try {
    const applied = await db
      .prepare("SELECT 1 AS ok FROM schema_migrations WHERE filename = ?")
      .bind(APPLIED_SCHEMA)
      .all();
    needsInit = (applied.results ?? []).length === 0;
  } catch {
    needsInit = true;
  }

  if (needsInit) {
    // D1 exec() treats newlines as statement boundaries, so apply one
    // flattened statement at a time via prepare().
    for (const statement of splitSqlStatements(SQLITE_SCHEMA)) {
      await db.prepare(statement.replace(/\s+/g, " ")).run();
    }
  }

  await ensureTable(
    db,
    "curator_scrapes",
    `CREATE TABLE IF NOT EXISTS curator_scrapes (
      id TEXT PRIMARY KEY,
      retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      via TEXT NOT NULL,
      source_id TEXT,
      summary TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_curator_scrapes_retrieved ON curator_scrapes (retrieved_at DESC);`,
  );
  await ensureColumn(db, "curator_scrapes", "summary", "TEXT");
}

async function ensureTable(db: D1Binding, name: string, createSql: string): Promise<void> {
  const rows = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .bind(name)
    .all();
  if ((rows.results ?? []).length > 0) return;
  for (const statement of splitSqlStatements(createSql)) {
    await db.prepare(statement.replace(/\s+/g, " ")).run();
  }
}

async function ensureColumn(db: D1Binding, table: string, column: string, def: string): Promise<void> {
  try {
    const rows = await db.prepare(`PRAGMA table_info(${table})`).all();
    const found = (rows.results ?? []).some((row) => {
      const name = (row as { name?: unknown }).name;
      return name === column;
    });
    if (found) return;
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`).run();
  } catch {
    // Table may be missing on a brand-new isolate; ensureTable already ran.
  }
}
