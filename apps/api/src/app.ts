import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE } from "@aicouncil/schema";
import type { SqlClient } from "./db/types.js";
import type { DedupePort } from "./ports/dedupe.js";
import type { AppEnv, RuntimeConfig } from "./middleware/auth.js";
import { originHeaders, setCache } from "./middleware/headers.js";
import { v1Router } from "./routes/v1-core.js";
import { v1DeliberationRouter } from "./routes/v1-deliberation.js";
import { handleMcp } from "./mcp/server.js";
import { publicPages } from "./ui/pages.js";
import { ApiError } from "./lib/errors.js";
import { createFirecrawlPort, type FirecrawlPort } from "./ports/firecrawl.js";

export type Documents = {
  agentsMd: string;
  llmsTxt: string;
  charterEn: string;
  charterFil: string;
  skillMd: string;
  operatorsMd: string;
  curatorMd: string;
  curatorSkillMd: string;
};

export type CreateAppOptions = {
  sql: SqlClient;
  inviteToken: string;
  curatorApiKey: string;
  /** If omitted, each request uses its own origin (Workers). */
  publicBaseUrl?: string;
  dedupe: DedupePort;
  documents: Documents;
  firecrawl?: FirecrawlPort;
  firecrawlApiKey?: string;
  runtime?: "node" | "workers";
  storage?: "pglite" | "postgres" | "d1";
};

export function createApp(opts: CreateAppOptions) {
  const app = new Hono<AppEnv>();
  const firecrawl = opts.firecrawl ?? createFirecrawlPort({ apiKey: opts.firecrawlApiKey });

  app.use("*", async (c, next) => {
    const config: RuntimeConfig = {
      inviteToken: opts.inviteToken,
      curatorApiKey: opts.curatorApiKey,
      publicBaseUrl: opts.publicBaseUrl ?? new URL(c.req.url).origin,
      firecrawlConfigured: firecrawl.configured,
    };
    c.set("sql", opts.sql);
    c.set("config", config);
    c.set("dedupe", opts.dedupe);
    c.set("firecrawl", firecrawl);
    await next();
  });
  app.use("*", originHeaders);
  app.use(
    "/mcp",
    cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type", "Accept", "X-Curator-Key"] }),
  );

  app.onError((err, c) => {
    c.header(CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE);
    c.header("X-Charter", "/charter");
    if (err instanceof ApiError) {
      if (err.status === 429) {
        const seconds = Number(err.extra.retry_after_seconds ?? 60);
        c.header("Retry-After", String(seconds));
      }
      const status = err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            ...err.extra,
            docs: "/AGENTS.md",
            charter: "/charter",
          },
        },
        status,
      );
    }
    console.error(err);
    return c.json(
      {
        error: {
          code: "internal",
          message: "Internal error. Retry later. If you are an agent, do not invent missing pack facts.",
          docs: "/AGENTS.md",
        },
      },
      500,
    );
  });

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "not_found",
          message:
            "No such route. See GET /participate, GET /SKILL.md, GET /CURATOR.md, GET /v1/issues, POST /v1/agents/register, POST /mcp, GET /AGENTS.md.",
        },
      },
      404,
    ),
  );

  const sendDoc = (c: Context<AppEnv>, contentType: string, body: string) => {
    setCache(c, 600);
    c.header("content-type", contentType);
    return c.body(body);
  };

  app.get("/healthz", (c) =>
    c.json({
      ok: true,
      brand: "Sanggunian",
      phase: 1,
      firecrawl: c.get("config").firecrawlConfigured,
      runtime: opts.runtime ?? "node",
      storage: opts.storage ?? "pglite",
    }),
  );

  app.get("/robots.txt", (c) =>
    sendDoc(
      c,
      "text/plain; charset=utf-8",
      "User-agent: *\nAllow: /\nSitemap: https://aicouncil.bettergov.ph/sitemap.xml\n",
    ),
  );
  app.get("/sitemap.xml", (c) => {
    setCache(c, 600);
    c.header("content-type", "application/xml; charset=utf-8");
    const origin = "https://aicouncil.bettergov.ph";
    const paths = ["/", "/tracker", "/participate", "/charter", "/charter/fil"];
    return c.body(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
        .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
        .join("\n")}\n</urlset>\n`,
    );
  });

  app.get("/AGENTS.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.agentsMd));
  app.get("/llms.txt", (c) => sendDoc(c, "text/plain; charset=utf-8", opts.documents.llmsTxt));
  app.get("/CHARTER.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.charterEn));
  app.get("/CHARTER.fil.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.charterFil));
  app.get("/SKILL.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.skillMd));
  app.get("/skills/aicouncil/SKILL.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.skillMd));
  app.get("/.well-known/skills/SKILL.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.skillMd));
  app.get("/OPERATORS.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.operatorsMd));
  app.get("/CURATOR.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.curatorMd));
  app.get("/CURATOR.SKILL.md", (c) => sendDoc(c, "text/markdown; charset=utf-8", opts.documents.curatorSkillMd));
  app.get("/skills/aicouncil-curator/SKILL.md", (c) =>
    sendDoc(c, "text/markdown; charset=utf-8", opts.documents.curatorSkillMd),
  );

  app.all("/mcp", (c) => handleMcp(c));

  const v1 = new Hono<AppEnv>();
  v1.route("/", v1Router());
  v1.route("/", v1DeliberationRouter());
  app.route("/v1", v1);

  app.route("/", publicPages({ charterEn: opts.documents.charterEn, charterFil: opts.documents.charterFil }));

  return app;
}

export type SanggunianApp = ReturnType<typeof createApp>;
