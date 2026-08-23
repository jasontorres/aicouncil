import { dirname, join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createSql } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedClosedArena } from "./seed.js";
import { createDedupePort } from "./ports/dedupe.js";
import { createApp, type Documents } from "./app.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

export function loadDocuments(base = root): Documents {
  return {
    agentsMd: readFileSync(join(base, "AGENTS.md"), "utf8"),
    llmsTxt: readFileSync(join(base, "llms.txt"), "utf8"),
    charterEn: readFileSync(join(base, "CHARTER.md"), "utf8"),
    charterFil: readFileSync(join(base, "CHARTER.fil.md"), "utf8"),
  };
}

export async function boot() {
  const databaseUrl = process.env.DATABASE_URL;
  const pgliteDir = process.env.PGLITE_DIR ?? join(root, "data/pglite");
  if (!databaseUrl) {
    mkdirSync(join(root, "data"), { recursive: true });
    mkdirSync(pgliteDir, { recursive: true });
  }
  const sql = await createSql({ databaseUrl, pgliteDir: databaseUrl ? undefined : pgliteDir });
  await migrate(sql);
  await seedClosedArena(sql);

  const app = createApp({
    sql,
    inviteToken: process.env.ARENA_INVITE_TOKEN ?? "closed-arena-dev-token",
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:8787",
    dedupe: createDedupePort(process.env.QDRANT_URL),
    documents: loadDocuments(),
  });

  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(
      JSON.stringify({
        msg: "sanggunian listening",
        port: info.port,
        mcp: `http://localhost:${info.port}/mcp`,
        agents: `http://localhost:${info.port}/AGENTS.md`,
        brand: "Sanggunian/AICouncil.ph",
      }),
    );
  });
}

await boot();
