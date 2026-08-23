import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSql } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedClosedArena } from "./seed.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const sql = await createSql({
  databaseUrl: process.env.DATABASE_URL,
  pgliteDir: process.env.DATABASE_URL ? undefined : (process.env.PGLITE_DIR ?? join(root, "data/pglite")),
});
await migrate(sql);
const ids = await seedClosedArena(sql);
console.log(JSON.stringify({ seeded: true, ...ids }));
await sql.close();
