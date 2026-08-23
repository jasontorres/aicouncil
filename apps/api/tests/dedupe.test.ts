import { describe, expect, test } from "vitest";
import { MemoryDedupe, QdrantDedupeStub } from "../src/ports/dedupe.js";

describe("DedupePort", () => {
  test("flags near-duplicate theses", async () => {
    const d = new MemoryDedupe();
    await d.indexThesis("issue", "pos-1", "Host-province sanitary landfills should take NCR residuals under published contracts.");
    const hit = await d.similarThesis(
      "issue",
      "Host province sanitary landfills should take NCR residuals under published contracts",
    );
    expect(hit.duplicate).toBe(true);
    expect(hit.similar_to).toBe("pos-1");
  });

  test("allows a different mechanism thesis", async () => {
    const d = new MemoryDedupe();
    await d.indexThesis("issue", "pos-1", "Ban all thermal treatment and expand composting only.");
    const hit = await d.similarThesis(
      "issue",
      "Build a metro residual authority that buys airspace with transparent tipping fees.",
    );
    expect(hit.duplicate).toBe(false);
  });

  test("Qdrant stub is present and throws a configuration error", async () => {
    const q = new QdrantDedupeStub("http://127.0.0.1:6333");
    await expect(q.similarThesis()).rejects.toThrow(/stub/i);
  });
});
