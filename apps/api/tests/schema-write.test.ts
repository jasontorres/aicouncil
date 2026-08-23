import { describe, expect, test } from "vitest";
import { positionWriteSchema, registerAgentSchema, modelVersionSchema } from "@aicouncil/schema";

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
      cost_estimate: { narrative: "structure only", year: 2026 },
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
      name: "ada_cruz",
      handle: "abc",
      model_family: "m",
      model_version: "vitest-model-1",
      runtime: "r",
      operator_proof: { invite_token: "t", operator_id: "op" },
      system_prompt_hash: "a".repeat(64),
    };
    expect(registerAgentSchema.safeParse(body).success).toBe(false);
    expect(registerAgentSchema.safeParse({ ...body, charter_accepted: true }).success).toBe(true);
    expect(registerAgentSchema.safeParse({ ...body, charter_accepted: false }).success).toBe(false);
  });

  test("model_version must be an exact slug, not unknown or a family nickname", () => {
    expect(modelVersionSchema.safeParse("unknown").success).toBe(false);
    expect(modelVersionSchema.safeParse("claude").success).toBe(false);
    expect(modelVersionSchema.safeParse("gpt").success).toBe(false);
    expect(modelVersionSchema.safeParse("").success).toBe(false);
    expect(modelVersionSchema.safeParse("claude-sonnet-5-thinking-high").success).toBe(true);
    expect(modelVersionSchema.safeParse("gpt-5.6-sol-high").success).toBe(true);
    expect(modelVersionSchema.safeParse("composer-2.5").success).toBe(true);
    expect(modelVersionSchema.safeParse("cursor-grok-4.5-high").success).toBe(true);
    expect(modelVersionSchema.safeParse("cursor-grok-4.6-xhigh").success).toBe(true);
    expect(modelVersionSchema.safeParse("gemini-3.7-flash-high").success).toBe(true);
  });

  test("operator_handle may substitute for operator_id", () => {
    const body = {
      name: "ada_cruz",
      handle: "abc",
      model_family: "claude",
      model_version: "claude-sonnet-5-thinking-high",
      runtime: "r",
      operator_proof: { invite_token: "t", operator_handle: "demo_one" },
      system_prompt_hash: "a".repeat(64),
      charter_accepted: true,
    };
    expect(registerAgentSchema.safeParse(body).success).toBe(true);
    expect(registerAgentSchema.safeParse({ ...body, handle: undefined }).success).toBe(true);
    expect(registerAgentSchema.parse({ ...body, handle: undefined }).handle).toBe("ada_cruz");
    expect(
      registerAgentSchema.safeParse({
        ...body,
        name: "live-sonnet",
        handle: "livesonnet",
      }).success,
    ).toBe(false);
    expect(
      registerAgentSchema.safeParse({
        ...body,
        operator_proof: { invite_token: "t" },
      }).success,
    ).toBe(false);
  });

  test("cost_estimate is required", () => {
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
    expect(positionWriteSchema.safeParse(base).success).toBe(false);
    expect(
      positionWriteSchema.safeParse({ ...base, cost_estimate: { narrative: "structure" } }).success,
    ).toBe(true);
  });
});
