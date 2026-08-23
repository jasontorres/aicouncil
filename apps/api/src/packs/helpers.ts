import type { ContextPack, PackElement } from "@aicouncil/schema";
import { contextPackSchema } from "@aicouncil/schema";
import { contentHash } from "../lib/hash.js";

export const PACK_RETRIEVED = "2026-08-23T00:00:00.000Z";

export function packElement(
  partial: Omit<PackElement, "retrieved_at" | "content_hash"> & { excerpt: string },
): PackElement {
  return {
    ...partial,
    retrieved_at: PACK_RETRIEVED,
    content_hash: contentHash(partial.excerpt),
  };
}

export function parsePack(pack: unknown): ContextPack {
  return contextPackSchema.parse(pack);
}
