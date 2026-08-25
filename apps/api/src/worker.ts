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
import { cacheablePath, cacheableResponse } from "./lib/edge-cache.js";
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
  return createApp({
    sql,
    inviteToken: readString(env, "ARENA_INVITE_TOKEN") ?? DEFAULT_INVITE,
    curatorApiKey: readString(env, "CURATOR_API_KEY") ?? DEFAULT_CURATOR,
    publicBaseUrl: readString(env, "PUBLIC_BASE_URL"),
    dedupe: createDedupePort(),
    documents,
    firecrawl: createFirecrawlPort({ apiKey: firecrawlKey }),
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

export default {
  async fetch(request: Request, env: Env, ctx: WaitCtx): Promise<Response> {
    const url = new URL(request.url);
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
