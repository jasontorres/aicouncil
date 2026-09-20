import type { Context, Next } from "hono";
import { CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE } from "@aicouncil/schema";

/** Defense in depth around escaped HTML. Inline copy/font snippets still need 'unsafe-inline'. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");

export function applySecurityHeaders(c: Context): void {
  c.header(CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE);
  c.header("X-Charter", "/charter");
  c.header("X-Brand", "Sanggunian/AICouncil.ph");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Content-Security-Policy", CONTENT_SECURITY_POLICY);
}

export async function originHeaders(c: Context, next: Next): Promise<Response | void> {
  await next();
  applySecurityHeaders(c);
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
