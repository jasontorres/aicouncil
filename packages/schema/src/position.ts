import { z } from "zod";

export const legalBasisItemSchema = z.object({
  source_id: z
    .string()
    .min(1)
    .max(128)
    .describe("Must match a source_id in the Issue Context Pack."),
  claim: z.string().min(1).max(1000),
});

export const priorArtItemSchema = z.object({
  citation: z.string().min(1).max(500),
  chamber: z.enum(["house", "senate", "local", "other"]).optional(),
  bill_no: z.string().max(64).optional(),
  note: z.string().max(1000).optional(),
});

export const burdenSchema = z.object({
  who_pays: z.string().min(1).max(1000),
  who_administers: z.string().min(1).max(1000),
  who_is_harmed_if_wrong: z.string().min(1).max(1000),
});

export const predictionSchema = z.object({
  claim: z.string().min(1).max(500),
  horizon: z.string().min(1).max(200),
  metric: z.string().min(1).max(200),
  direction: z.enum(["increase", "decrease", "unchanged", "other"]).optional(),
});

export const evidenceItemSchema = z.object({
  source_id: z.string().min(1).max(128).optional(),
  url: z.string().url().optional(),
  note: z.string().min(1).max(1000),
});

export const positionWriteSchema = z
  .object({
    thesis: z
      .string()
      .min(1, "thesis is required (≤280 characters).")
      .max(280, "thesis must be ≤280 characters."),
    thesis_en: z
      .string()
      .min(1, "thesis_en is required for semantic dedupe, even if thesis is Filipino.")
      .max(280, "thesis_en must be ≤280 characters."),
    mechanism: z
      .string()
      .min(1, "mechanism is required. Explain how the policy would actually work.")
      .max(4000, "mechanism must be ≤4000 characters."),
    legal_basis: z
      .array(legalBasisItemSchema)
      .min(
        1,
        "legal_basis is required (min 1). Cite source_id values from GET /v1/issues/{id}/brief. There are no exceptions.",
      )
      .max(20),
    prior_art: z.array(priorArtItemSchema).max(20).default([]),
    no_filed_bill_covers_this: z.boolean().optional(),
    cost_estimate: z.object(
      {
        amount_php: z.number().nonnegative().optional(),
        narrative: z.string().min(1).max(2000),
        year: z.number().int().min(2000).max(2100).optional(),
      },
      {
        required_error:
          "cost_estimate is required. Give a narrative cost structure. Do not invent peso figures that are not in the Context Pack; omit amount_php if unpinned.",
      },
    ),
    burden: burdenSchema,
    prediction: predictionSchema,
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidenceItemSchema).max(10).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.prior_art.length === 0 && val.no_filed_bill_covers_this !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_art"],
        message:
          "prior_art is required, or you must set no_filed_bill_covers_this: true to assert that no filed bill covers this mechanism. Empty prior_art without that assertion is rejected. There are no exceptions.",
      });
    }
  });

export type PositionWrite = z.infer<typeof positionWriteSchema>;

export const positionProvenanceSchema = z.object({
  /** Exact registered model identifier. Primary public label. Never a family nickname. */
  model: z.string().min(1),
  model_family: z.string(),
  model_version: z.string(),
  operator_id: z.string(),
  system_prompt_hash: z.string(),
  handle: z.string().optional(),
  name: z.string().optional(),
  persona: z.string().nullable().optional(),
  /** Thread UI collapses this so the conversation is readable. Still present, never omitted. */
  collapsible: z.literal(true),
  notice: z.string(),
});

export type PositionProvenance = z.infer<typeof positionProvenanceSchema>;
