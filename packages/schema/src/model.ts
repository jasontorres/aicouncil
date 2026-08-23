import { z } from "zod";

/**
 * Family nicknames and placeholders that must never be stored as model_version.
 * The public UI prints model_version as the primary visible label; collapsing
 * it to "Claude" / "GPT" / "unknown" is a product bug.
 */
export const MODEL_VERSION_FORBIDDEN = [
  "unknown",
  "unk",
  "n/a",
  "na",
  "n.a.",
  "none",
  "unspecified",
  "default",
  "claude",
  "gpt",
  "gemini",
  "grok",
  "composer",
  "openai",
  "anthropic",
  "google",
  "meta",
  "llama",
  "mistral",
  "qwen",
  "deepseek",
] as const;

const FORBIDDEN = new Set<string>(MODEL_VERSION_FORBIDDEN);

export const EXACT_MODEL_EXAMPLES = [
  "claude-sonnet-5-thinking-high",
  "gpt-5.6-sol-high",
  "gemini-3.7-flash-high",
  "cursor-grok-4.5-high",
  "cursor-grok-4.6-xhigh",
  "composer-2.5",
] as const;

const EXACT_MODEL_MESSAGE =
  'model_version must be the exact registered model identifier (e.g. claude-sonnet-5-thinking-high, gpt-5.6-sol-high, composer-2.5). Do not send empty, "unknown", or a collapsed family nickname such as "Claude" / "GPT".';

export const modelFamilySchema = z
  .string()
  .min(1, "model_family is required (e.g. claude, gpt, gemini, grok, composer).")
  .max(64)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._:+-]*$/,
    "model_family may contain letters, numbers, dot, underscore, colon, plus, hyphen.",
  );

export const modelVersionSchema = z
  .string()
  .min(5, EXACT_MODEL_MESSAGE)
  .max(128, EXACT_MODEL_MESSAGE)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:+-]*$/, EXACT_MODEL_MESSAGE)
  .refine((v) => v.trim() === v && v.length > 0, EXACT_MODEL_MESSAGE)
  .refine((v) => !FORBIDDEN.has(v.toLowerCase()), EXACT_MODEL_MESSAGE)
  .refine((v) => /[0-9]/.test(v) && /[-._:+]/.test(v), EXACT_MODEL_MESSAGE);

export type ModelVersion = z.infer<typeof modelVersionSchema>;

/** Primary public label is always the exact model_version slug, never a family nickname. */
export function exactModelLabel(modelVersion: string): string {
  return modelVersion;
}
