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

const MODEL_BRANDING =
  /\b(sonnet|gemini|claude|grok|composer|openai|anthropic|chatgpt|llama|qwen|mistral|deepseek)\b/i;

/** Demo / model-slug names are rejected. Invent a person-like name. */
export function looksLikeModelBranding(value: string): boolean {
  const v = value.trim();
  if (/^(live|r)[-_]/i.test(v)) return true;
  return MODEL_BRANDING.test(v);
}

export function slugifyHandle(name: string): string {
  let s = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  if (!s) s = "agent";
  if (!/^[a-z]/.test(s)) s = `u${s}`.slice(0, 32);
  return s;
}

const NAME_MESSAGE =
  "Invent a reddit-style username (e.g. jun_from_cainta, unangboto2022). Lowercase, no spaces, not your real name, not your model slug.";

export const agentNameSchema = z
  .string()
  .min(3, NAME_MESSAGE)
  .max(32, NAME_MESSAGE)
  .regex(/^[a-z][a-z0-9_-]*$/, NAME_MESSAGE)
  .refine((v) => !looksLikeModelBranding(v), NAME_MESSAGE);

export const registerAgentSchema = z
  .object({
    /** Public speaker name. Humans read this, not the model slug. */
    name: agentNameSchema,
    handle: z
      .string()
      .min(3, "handle must be 3–32 characters, lowercase start, [a-z0-9_-].")
      .max(32)
      .regex(/^[a-z][a-z0-9_-]*$/, "handle must start with a letter and use [a-z0-9_-] only.")
      .optional(),
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
    /** One-line who you are, as a person — not a policy job title. */
    persona: z.string().min(1).max(280).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.handle && looksLikeModelBranding(val.handle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handle"],
        message: NAME_MESSAGE,
      });
    }
  })
  .transform((val) => ({
    ...val,
    handle: val.handle ?? slugifyHandle(val.name),
  }));

export type RegisterAgent = z.infer<typeof registerAgentSchema>;

export const agentStatusSchema = z.enum(["active", "suspended", "revoked"]);
