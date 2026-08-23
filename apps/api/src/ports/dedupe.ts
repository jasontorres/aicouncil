/**
 * Semantic dedupe port. Production may swap in Qdrant; tests use the
 * hashed-cosine in-memory adapter. Embeddings are optional.
 */

export type DedupeHit = {
  duplicate: boolean;
  similar_to?: string;
  score: number;
  threshold: number;
};

export interface DedupePort {
  similarThesis(issueId: string, thesisEn: string): Promise<DedupeHit>;
  indexThesis(issueId: string, positionId: string, thesisEn: string): Promise<void>;
  noveltyAgainst(previousTexts: string[], candidate: string): Promise<{ score: number; too_similar: boolean }>;
}

const DIMS = 256;
const DUP_THRESHOLD = 0.92;
const NOVELTY_THRESHOLD = 0.9;

function hashedEmbedding(text: string): Float64Array {
  const vec = new Float64Array(DIMS);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % DIMS;
    vec[idx] = (vec[idx] ?? 0) + 1;
  }
  let norm = 0;
  for (let i = 0; i < DIMS; i++) norm += (vec[i] ?? 0) ** 2;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIMS; i++) vec[i] = (vec[i] ?? 0) / norm;
  return vec;
}

function cosine(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < DIMS; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

type Stored = { positionId: string; vec: Float64Array; thesis: string };

export class MemoryDedupe implements DedupePort {
  private byIssue = new Map<string, Stored[]>();

  async similarThesis(issueId: string, thesisEn: string): Promise<DedupeHit> {
    const vec = hashedEmbedding(thesisEn);
    const rows = this.byIssue.get(issueId) ?? [];
    let best: { score: number; id: string } = { score: 0, id: "" };
    for (const row of rows) {
      const score = cosine(vec, row.vec);
      if (score > best.score) best = { score, id: row.positionId };
    }
    return {
      duplicate: best.score >= DUP_THRESHOLD,
      similar_to: best.id || undefined,
      score: best.score,
      threshold: DUP_THRESHOLD,
    };
  }

  async indexThesis(issueId: string, positionId: string, thesisEn: string): Promise<void> {
    const rows = this.byIssue.get(issueId) ?? [];
    rows.push({ positionId, vec: hashedEmbedding(thesisEn), thesis: thesisEn });
    this.byIssue.set(issueId, rows);
  }

  async noveltyAgainst(
    previousTexts: string[],
    candidate: string,
  ): Promise<{ score: number; too_similar: boolean }> {
    if (previousTexts.length === 0) return { score: 0, too_similar: false };
    const vec = hashedEmbedding(candidate);
    let best = 0;
    for (const prev of previousTexts) {
      best = Math.max(best, cosine(vec, hashedEmbedding(prev)));
    }
    return { score: best, too_similar: best >= NOVELTY_THRESHOLD };
  }
}

/**
 * Qdrant adapter stub. Wired when QDRANT_URL is set; Phase 1 does not
 * require a live cluster. Methods throw a clear configuration error so
 * callers fall back to MemoryDedupe unless explicitly constructed.
 */
export class QdrantDedupeStub implements DedupePort {
  constructor(private readonly url: string) {}

  async similarThesis(): Promise<DedupeHit> {
    throw new Error(
      `Qdrant adapter is a Phase 1 stub (url=${this.url}). Use MemoryDedupe until the cluster is provisioned.`,
    );
  }

  async indexThesis(): Promise<void> {
    throw new Error("Qdrant adapter is a Phase 1 stub.");
  }

  async noveltyAgainst(): Promise<{ score: number; too_similar: boolean }> {
    throw new Error("Qdrant adapter is a Phase 1 stub.");
  }
}

export function createDedupePort(qdrantUrl?: string): DedupePort {
  if (qdrantUrl) {
    // Keep the stub constructed and exported; do not fail the process.
    // Phase 1 always uses in-memory cosine until Qdrant is implemented.
    void new QdrantDedupeStub(qdrantUrl);
  }
  return new MemoryDedupe();
}
