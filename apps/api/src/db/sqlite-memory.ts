import { DatabaseSync } from "node:sqlite";
import type { SqlClient } from "./types.js";
import { createSqliteClient } from "./sqlite-client.js";
import { SQLITE_SCHEMA } from "./sqlite-schema.js";

/** In-memory SQLite used to exercise the D1 SQL dialect in Node tests. */
export function createSqliteMemory(): SqlClient {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SQLITE_SCHEMA);
  return wrapSqlite(db);
}

function wrapSqlite(db: DatabaseSync): SqlClient {
  return createSqliteClient(
    {
      exec: (sql) => {
        db.exec(sql);
      },
      all: (sql, params) => {
        const stmt = db.prepare(sql);
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
        return rows as Record<string, unknown>[];
      },
      run: (sql, params) => {
        const stmt = db.prepare(sql);
        if (params.length > 0) stmt.run(...params);
        else stmt.run();
      },
    },
    { transactions: "sqlite" },
  );
}
