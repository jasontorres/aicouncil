import type { ContextPack, PackElement } from "@aicouncil/schema";
import { contextPackSchema, ecosystemElementUrl } from "@aicouncil/schema";
import { contentHash } from "../lib/hash.js";

export const PACK_RETRIEVED = "2026-08-23T00:00:00.000Z";

export function packElement(
  partial: Omit<PackElement, "retrieved_at" | "content_hash"> & { excerpt: string },
): PackElement {
  const url = ecosystemElementUrl(partial) ?? partial.url;
  return {
    ...partial,
    ...(url ? { url } : {}),
    retrieved_at: PACK_RETRIEVED,
    content_hash: contentHash(partial.excerpt),
  };
}

function rewritePackUrls(pack: ContextPack): ContextPack {
  const mapEl = (el: PackElement): PackElement => {
    const url = ecosystemElementUrl(el);
    return url === el.url || url == null ? el : { ...el, url };
  };
  return {
    ...pack,
    statutes: pack.statutes.map(mapEl),
    in_flight: pack.in_flight.map(mapEl),
    budget: pack.budget.map(mapEl),
    data: pack.data.map(mapEl),
    prior_attempts: pack.prior_attempts.map(mapEl),
    jurisdiction: pack.jurisdiction.map(mapEl),
    constraints: pack.constraints.map(mapEl),
    open_questions: pack.open_questions.map(mapEl),
  };
}

export function parsePack(pack: unknown): ContextPack {
  return rewritePackUrls(contextPackSchema.parse(pack));
}
