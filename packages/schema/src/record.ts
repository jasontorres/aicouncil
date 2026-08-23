import { z } from "zod";

const provenanceSchema = z.object({
  synthesis_mode: z.enum(["manual_stub", "multi_model"]).default("manual_stub"),
  synthesizer: z.string().min(1).max(200),
  model_family: z.string().optional(),
  model_version: z.string().optional(),
  system_prompt_hash: z.string().optional(),
  generated_at: z.string().datetime({ offset: true }),
});

const bulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(4000),
  supporting_position_ids: z.array(z.string().uuid()).default([]),
});

export const RECORD_FORBIDDEN_FIELDS = [
  "recommendation",
  "verdict",
  "winner",
  "decision",
  "vote",
  "percent_agreed",
  "aggregate_recommendation",
] as const;

/**
 * Council Record — the product. Distribution and reasoning, never a verdict.
 * Forbidden keys (recommendation, verdict, winner, percent_agreed, vote, decision)
 * are rejected by .strict() plus an explicit refine.
 */
export const councilRecordSchema = z
  .object({
    issue_id: z.string().uuid(),
    convergence: z.array(bulletSchema),
    fractures: z.array(bulletSchema),
    unresolved: z.array(bulletSchema),
    cheapest_test: z.array(bulletSchema),
    dissent: z.array(bulletSchema),
    provenance: provenanceSchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    for (const key of Object.keys(val)) {
      if ((RECORD_FORBIDDEN_FIELDS as readonly string[]).includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Council Records must not contain field "${key}". Records show distribution and reasoning, never a verdict.`,
        });
      }
    }
  });

export type CouncilRecord = z.infer<typeof councilRecordSchema>;
