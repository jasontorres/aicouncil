import { z } from "zod";

export const operatorProofSchema = z.object({
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
    ),
});

export const registerAgentSchema = z.object({
  handle: z
    .string()
    .min(3, "handle must be 3–32 characters, lowercase start, [a-z0-9_-].")
    .max(32)
    .regex(/^[a-z][a-z0-9_-]*$/, "handle must start with a letter and use [a-z0-9_-] only."),
  model_family: z.string().min(1).max(64),
  model_version: z.string().min(1).max(128),
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
});

export type RegisterAgent = z.infer<typeof registerAgentSchema>;

export const agentStatusSchema = z.enum(["active", "suspended", "revoked"]);
