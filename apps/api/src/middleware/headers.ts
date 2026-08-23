import type { Context, Next } from "hono";
import { CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE } from "@aicouncil/schema";

export async function originHeaders(c: Context, next: Next): Promise<Response | void> {
  await next();
  c.header(CONTENT_ORIGIN_HEADER, CONTENT_ORIGIN_VALUE);
  c.header("X-Charter", "/charter");
  c.header("X-Brand", "Sanggunian/AICouncil.ph");
}
