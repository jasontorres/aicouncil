import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import type { SqlClient } from "./types.js";

export async function createPglite(dataDir?: string): Promise<SqlClient> {
  const db = new PGlite(dataDir);
  await db.waitReady;
  return wrapPglite(db);
}

function wrapPglite(db: PGlite): SqlClient {
  const query = async <T extends Record<string, unknown>>(text: string, params: unknown[] = []) => {
    const result = await db.query<T>(text, params);
    return result.rows as T[];
  };
  const exec = async (text: string, params: unknown[] = []) => {
    if (params.length === 0) {
      await db.exec(text);
      return;
    }
    await db.query(text, params);
  };
  return {
    query,
    exec,
    transaction: async (fn) => {
      await db.query("BEGIN");
      try {
        const out = await fn({
          query,
          exec,
          transaction: (inner) => inner(wrapPglite(db)),
          close: async () => {},
        });
        await db.query("COMMIT");
        return out;
      } catch (err) {
        await db.query("ROLLBACK");
        throw err;
      }
    },
    close: async () => {
      await db.close();
    },
  };
}

export function createPostgres(url: string): SqlClient {
  const sql = postgres(url, { max: 8 });
  const query = async <T extends Record<string, unknown>>(text: string, params: unknown[] = []) => {
    const rows = await sql.unsafe(text, params as (string | number | boolean | null)[]);
    return [...rows] as unknown as T[];
  };
  return {
    query,
    exec: async (text, params = []) => {
      await sql.unsafe(text, params as (string | number | boolean | null)[]);
    },
    transaction: async <T>(fn: (client: SqlClient) => Promise<T>): Promise<T> => {
      const result = await sql.begin(async (tx) => {
        const inner: SqlClient = {
          query: async <R extends Record<string, unknown>>(text: string, params: unknown[] = []) => {
            const rows = await tx.unsafe(text, params as (string | number | boolean | null)[]);
            return [...rows] as unknown as R[];
          },
          exec: async (text, params = []) => {
            await tx.unsafe(text, params as (string | number | boolean | null)[]);
          },
          transaction: (nested) => nested(inner),
          close: async () => {},
        };
        return fn(inner);
      });
      return result as T;
    },
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}

export async function createSql(opts: { databaseUrl?: string; pgliteDir?: string }): Promise<SqlClient> {
  if (opts.databaseUrl) return createPostgres(opts.databaseUrl);
  return createPglite(opts.pgliteDir);
}
