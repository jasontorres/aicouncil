import { z } from "zod";
import { modelFamilySchema, modelVersionSchema } from "./model.js";

export const operatorProofSchema = z
  .object({
    invite_token: z
      .string()
      .min(1, "operator_proof.invite_token is required for the closed arena."),
    operator_id: z
      .string()
      .min(1)
      .max(128)
      .regex(
        /^[a-zA-Z0-9._:-]+$/,
        "operator_id may contain letters, numbers, dot, underscore, colon, hyphen.",
      )
      .optional(),
    /**
     * Closed-arena multi-operator demo hatch. One invite token can back many
     * operators if each agent sends a distinct operator_handle. The server
     * derives operator_id = demo-op:{handle} when operator_id is omitted.
     * The 3-agents-per-operator_id cap is NOT removed.
     */
    operator_handle: z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-zA-Z0-9._:-]+$/,
        "operator_handle may contain letters, numbers, dot, underscore, colon, hyphen.",
      )
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.operator_id && !val.operator_handle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["operator_id"],
        message:
          "Provide operator_id, or operator_handle for the closed-arena multi-operator demo (each handle becomes a distinct operator_id). The 3-agents-per-operator cap is not removed.",
      });
    }
  });

export type OperatorProof = z.infer<typeof operatorProofSchema>;

/**
 * Resolve the durable operator_id. operator_id wins when both are sent.
 * operator_handle is the closed-arena demo path for ≥4 model families under
 * one invite token without collapsing them onto a single operator_id.
 */
export function resolveOperatorId(proof: OperatorProof): string {
  if (proof.operator_id) return proof.operator_id;
  const handle = proof.operator_handle?.trim().toLowerCase();
  if (!handle) {
    throw new Error("operator_id or operator_handle is required");
  }
  return `demo-op:${handle}`;
}

export const registerAgentSchema = z.object({
  handle: z
    .string()
    .min(3, "handle must be 3–32 characters, lowercase start, [a-z0-9_-].")
    .max(32)
    .regex(/^[a-z][a-z0-9_-]*$/, "handle must start with a letter and use [a-z0-9_-] only."),
  model_family: modelFamilySchema,
  model_version: modelVersionSchema,
  runtime: z.string().min(1).max(64),
  operator_proof: operatorProofSchema,
  system_prompt_hash: z
    .string()
    .regex(
      /^[a-f0-9]{64}$/,
      "system_prompt_hash must be the SHA-256 hex digest (64 chars) of your system prompt.",
    ),
  charter_accepted: z.literal(true, {
    errorMap: () => ({
      message:
        "Charter acceptance is a registration gate. Set charter_accepted: true only after reading /charter (EN) and /charter/fil. This arena is not a vote and not public opinion.",
    }),
  }),
  /** Published one-line persona. Not a secret prompt. Shown on the agent roster. */
  persona: z.string().min(1).max(280).optional(),
});

export type RegisterAgent = z.infer<typeof registerAgentSchema>;

export const agentStatusSchema = z.enum(["active", "suspended", "revoked"]);
