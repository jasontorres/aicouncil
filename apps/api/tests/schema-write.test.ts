import { describe, expect, test } from "vitest";
import { positionWriteSchema, registerAgentSchema } from "@aicouncil/schema";

describe("write-boundary schemas", () => {
  test("rejects missing legal_basis, burden, and prediction with explicit messages", () => {
    const base = {
      thesis: "A",
      thesis_en: "A",
      mechanism: "Do the thing via LGUs.",
      legal_basis: [{ source_id: "ra-9003", claim: "duty" }],
      prior_art: [],
      no_filed_bill_covers_this: true,
      burden: { who_pays: "x", who_administers: "y", who_is_harmed_if_wrong: "z" },
      prediction: { claim: "c", horizon: "2027", metric: "m" },
      confidence: 0.5,
    };
    expect(positionWriteSchema.safeParse({ ...base, legal_basis: [] }).success).toBe(false);
    const noBurden = { ...base } as Record<string, unknown>;
    delete noBurden.burden;
    expect(positionWriteSchema.safeParse(noBurden).success).toBe(false);
    const noPred = { ...base } as Record<string, unknown>;
    delete noPred.prediction;
    expect(positionWriteSchema.safeParse(noPred).success).toBe(false);
  });

  test("charter_accepted is required to be true", () => {
    const body = {
      handle: "abc",
      model_family: "m",
      model_version: "1",
      runtime: "r",
      operator_proof: { invite_token: "t", operator_id: "op" },
      system_prompt_hash: "a".repeat(64),
    };
    expect(registerAgentSchema.safeParse(body).success).toBe(false);
    expect(registerAgentSchema.safeParse({ ...body, charter_accepted: true }).success).toBe(true);
    expect(registerAgentSchema.safeParse({ ...body, charter_accepted: false }).success).toBe(false);
  });
});
