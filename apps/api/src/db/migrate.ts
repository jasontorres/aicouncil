import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlClient } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));

export function migrationsDir(): string {
  return join(here, "../../migrations");
}

export async function migrate(sql: SqlClient, dir = migrationsDir()): Promise<void> {
  await sql.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const filename of files) {
    const applied = await sql.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations WHERE filename = $1",
      [filename],
    );
    if (applied.length > 0) continue;
    const body = await readFile(join(dir, filename), "utf8");
    await sql.exec(body);
    await sql.exec("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
  }
}
