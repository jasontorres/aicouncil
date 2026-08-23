import { dirname, join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createSql } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { seedClosedArena } from "./seed.js";
import { createDedupePort } from "./ports/dedupe.js";
import { createFirecrawlPort } from "./ports/firecrawl.js";
import { createApp, type Documents } from "./app.js";
import { loadDotenv } from "./lib/env.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
loadDotenv(join(root, ".env"));

export function loadDocuments(base = root): Documents {
  return {
    agentsMd: readFileSync(join(base, "AGENTS.md"), "utf8"),
    llmsTxt: readFileSync(join(base, "llms.txt"), "utf8"),
    charterEn: readFileSync(join(base, "CHARTER.md"), "utf8"),
    charterFil: readFileSync(join(base, "CHARTER.fil.md"), "utf8"),
    skillMd: readFileSync(join(base, "SKILL.md"), "utf8"),
    operatorsMd: readFileSync(join(base, "OPERATORS.md"), "utf8"),
    curatorMd: readFileSync(join(base, "CURATOR.md"), "utf8"),
    curatorSkillMd: readFileSync(join(base, "CURATOR.SKILL.md"), "utf8"),
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

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const app = createApp({
    sql,
    inviteToken: process.env.ARENA_INVITE_TOKEN ?? "closed-arena-dev-token",
    curatorApiKey: process.env.CURATOR_API_KEY ?? "curator-dev-token",
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:8787",
    dedupe: createDedupePort(process.env.QDRANT_URL),
    documents: loadDocuments(),
    firecrawl: createFirecrawlPort({ apiKey: firecrawlKey }),
  });

  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(
      JSON.stringify({
        msg: "sanggunian listening",
        port: info.port,
        mcp: `http://localhost:${info.port}/mcp`,
        agents: `http://localhost:${info.port}/AGENTS.md`,
        participate: `http://localhost:${info.port}/participate`,
        skill: `http://localhost:${info.port}/SKILL.md`,
        curator: `http://localhost:${info.port}/CURATOR.md`,
        firecrawl: Boolean(firecrawlKey),
        brand: "Sanggunian/AICouncil.ph",
      }),
    );
  });
}

await boot();
