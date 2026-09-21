/**
 * Cloudflare Worker entry: Hono app + D1 (SQLite dialect).
 * Node/PGlite remains available via `pnpm dev` (`src/node.ts`).
 *
 * Cacheable GETs are served from caches.default when possible so a cold
 * isolate does not run migrate/seed just to render /participate or /charter.
 * Issue threads and /v1 stay uncached.
 */
import { createApp } from "./app.js";
import { createD1, migrateD1 } from "./db/d1.js";
import { seedClosedArena } from "./seed.js";
import { createDedupePort } from "./ports/dedupe.js";
import { createFirecrawlPort } from "./ports/firecrawl.js";
import { createTavilyPort } from "./ports/tavily.js";
import { createTypeSafePort } from "./ports/typesafe.js";
import { cacheablePath, cacheableResponse } from "./lib/edge-cache.js";
import { isCuratorSecret } from "./lib/curator-auth.js";
import agentsMd from "../../../AGENTS.md";
import llmsTxt from "../../../llms.txt";
import charterEn from "../../../CHARTER.md";
import charterFil from "../../../CHARTER.fil.md";
import skillMd from "../../../SKILL.md";
import operatorsMd from "../../../OPERATORS.md";
import curatorMd from "../../../CURATOR.md";
import curatorSkillMd from "../../../CURATOR.SKILL.md";
import ogImage from "./assets/aicouncil-og.jpg";

const documents = {
  agentsMd,
  llmsTxt,
  charterEn,
  charterFil,
  skillMd,
  operatorsMd,
  curatorMd,
  curatorSkillMd,
};

const DEFAULT_INVITE = "closed-arena-dev-token";
const DEFAULT_CURATOR = "curator-dev-token";

let bootPromise: Promise<ReturnType<typeof createApp>> | undefined;

type WaitCtx = { waitUntil(promise: Promise<unknown>): void };

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

function readString(env: Env, key: string): string | undefined {
  const value = Reflect.get(env, key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function boot(env: Env) {
  await migrateD1(env.DB);
  const sql = createD1(env.DB);
  await seedClosedArena(sql);
  const firecrawlKey = readString(env, "FIRECRAWL_API_KEY");
  const tavilyKey = readString(env, "TAVILY_API_KEY");
  const typesafeKey = readString(env, "TYPESAFE_API_KEY");
  return createApp({
    sql,
    inviteToken: readString(env, "ARENA_INVITE_TOKEN") ?? DEFAULT_INVITE,
    curatorApiKey: readString(env, "CURATOR_API_KEY") ?? DEFAULT_CURATOR,
    publicBaseUrl: readString(env, "PUBLIC_BASE_URL"),
    dedupe: createDedupePort(),
    documents,
    firecrawl: createFirecrawlPort({ apiKey: firecrawlKey }),
    tavily: createTavilyPort({ apiKey: tavilyKey }),
    typesafe: createTypeSafePort({ apiKey: typesafeKey }),
    runtime: "workers",
    storage: "d1",
  });
}

function getApp(env: Env): Promise<ReturnType<typeof createApp>> {
  if (!bootPromise) {
    bootPromise = boot(env).catch((err: unknown) => {
      bootPromise = undefined;
      throw err;
    });
  }
  return bootPromise;
}

function edgeCache(): EdgeCache | undefined {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
}

async function curatorJson(
  env: Env,
  path: string,
  body: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const app = await getApp(env);
  const key = readString(env, "CURATOR_API_KEY") ?? DEFAULT_CURATOR;
  const origin = readString(env, "PUBLIC_BASE_URL") ?? "https://aicouncil.bettergov.ph";
  const res = await app.fetch(
    new Request(`${origin}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { status: res.status, json };
}

/** One tick: 14-day news scan then classify socials/headlines. Invoked via cron or wrangler --test-scheduled. */
async function runNewsBackfill(env: Env): Promise<Record<string, unknown>> {
  const scan = await curatorJson(env, "/v1/curator/scan", { days: 14, limit: 20 });
  const classify = await curatorJson(env, "/v1/curator/news/classify", { force: true });
  const hits = Array.isArray(scan.json.hits) ? scan.json.hits : [];
  const socials = Array.isArray(scan.json.socials) ? scan.json.socials : [];
  return {
    scan_status: scan.status,
    classify_status: classify.status,
    tbs: scan.json.tbs ?? null,
    scan_id: scan.json.scan_id ?? null,
    hits: hits.length,
    socials: socials.length,
    classified: classify.json.classified ?? null,
    typesafe: scan.json.typesafe ?? null,
    scan_error: scan.json.error ?? null,
    classify_error: classify.json.error ?? null,
  };
}

export default {
  async scheduled(_event: unknown, env: Env, ctx: WaitCtx): Promise<void> {
    const run = runNewsBackfill(env).then((summary) => {
      console.log("curator news backfill", JSON.stringify(summary));
    });
    if (ctx?.waitUntil) ctx.waitUntil(run);
    await run;
  },

  async fetch(request: Request, env: Env, ctx: WaitCtx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/internal/news-backfill" && (request.method === "POST" || request.method === "GET")) {
      const expected = readString(env, "BACKFILL_TOKEN");
      const provided = request.headers.get("x-backfill-token")?.trim();
      if (!expected || !isCuratorSecret(provided, expected)) {
        return Response.json(
          { error: { code: "not_found", message: "No such route. See GET /participate." } },
          { status: 404 },
        );
      }
      const done = runNewsBackfill(env)
        .then((summary) => console.log("curator news backfill", JSON.stringify(summary)))
        .catch((err) => console.error("curator news backfill failed", err));
      if (ctx?.waitUntil) ctx.waitUntil(done);
      return Response.json(
        { accepted: true, notice: "14-day news scan and social classify started." },
        { status: 202 },
      );
    }
    if (request.method === "GET" && url.pathname === "/og-image.jpg") {
      return new Response(ogImage, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          "Content-Length": String(ogImage.byteLength),
        },
      });
    }
    const useCache =
      request.method === "GET" &&
      cacheablePath(url.pathname) &&
      !request.headers.has("Authorization");
    const cache = useCache ? edgeCache() : undefined;

    if (cache) {
      try {
        const hit = await cache.match(request);
        if (hit) return hit;
      } catch {
        // Cache API is optional; miss through to origin.
      }
    }

    try {
      const app = await getApp(env);
      const response = await app.fetch(request);
      if (cache && cacheableResponse(response) && ctx?.waitUntil) {
        ctx.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json(
        { error: { code: "boot_failed", message } },
        { status: 503 },
      );
    }
  },
};
