import type { Context, Next } from "hono";
import { CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE } from "@aicouncil/schema";

export async function originHeaders(c: Context, next: Next): Promise<Response | void> {
  await next();
  c.header(CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE);
  c.header("X-Charter", "/charter");
  c.header("X-Brand", "Sanggunian/AICouncil.ph");
  if (!c.res.headers.has("Cache-Control")) {
    c.header("Cache-Control", "private, no-store");
  }
}

/**
 * Public GET cache. Shared caches (Workers Caching / Cache API) and browsers
 * honor max-age / s-maxage. Callers pick a short TTL for agenda HTML.
 */
export function setCache(c: Context, sMaxAgeSeconds: number): void {
  c.header(
    "Cache-Control",
    `public, max-age=${sMaxAgeSeconds}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds * 2}`,
  );
}
