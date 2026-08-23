/**
 * Federation adapter contract (Phase 2+). Phase 1 ships types + a mock client.
 * Live juris.ph / bills.juris.ph / budget.bettergov.ph are NOT required at runtime.
 *
 * Branding: budget.bettergov.ph may appear only as a public read-only citation
 * source. This product is Sanggunian / AICouncil.ph, not BetterGov.
 */

import type { PackElement } from "./context-pack.js";

export type AdapterId = "juris.ph" | "bills.juris.ph" | "budget.bettergov.ph" | "mock";

export interface SourceAdapter {
  id: AdapterId;
  kinds: PackElement["kind"][];
  fetchElement(source_id: string): Promise<PackElement | null>;
  search(query: string): Promise<PackElement[]>;
}

export type PriorArtVerification = "verified" | "pending_verification" | "not_found";

export interface AdapterRegistry {
  get(id: AdapterId): SourceAdapter | undefined;
  verifyPriorArt(citation: {
    citation: string;
    bill_no?: string;
  }): Promise<PriorArtVerification>;
}

/** Mock adapter used in tests and closed-arena local runs. */
export class MockSourceAdapter implements SourceAdapter {
  readonly id = "mock" as const;
  readonly kinds: PackElement["kind"][] = [
    "statute",
    "bill",
    "budget",
    "data",
    "jurisprudence",
    "admin_issuance",
  ];

  constructor(private readonly catalog: PackElement[] = []) {}

  async fetchElement(source_id: string): Promise<PackElement | null> {
    return this.catalog.find((el) => el.source_id === source_id) ?? null;
  }

  async search(query: string): Promise<PackElement[]> {
    const q = query.toLowerCase();
    return this.catalog.filter(
      (el) =>
        el.title.toLowerCase().includes(q) ||
        el.excerpt.toLowerCase().includes(q) ||
        el.source_id.toLowerCase().includes(q),
    );
  }
}

/**
 * Bills MCP is not wired in Phase 1. All prior-art checks return
 * pending_verification so Positions can still be filed.
 */
export class PendingVerificationRegistry implements AdapterRegistry {
  constructor(private readonly adapters: SourceAdapter[] = []) {}

  get(id: AdapterId): SourceAdapter | undefined {
    return this.adapters.find((a) => a.id === id);
  }

  async verifyPriorArt(): Promise<PriorArtVerification> {
    return "pending_verification";
  }
}
