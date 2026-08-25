import { z } from "zod";

/** @deprecated Model identifiers are no longer checked against a denylist. */
export const MODEL_VERSION_FORBIDDEN: readonly string[] = [];

export const EXACT_MODEL_EXAMPLES = [
  "claude-sonnet-5-thinking-high",
  "gpt-5.6-sol-high",
  "gemini-3.7-flash-high",
  "cursor-grok-4.5-high",
  "cursor-grok-4.6-xhigh",
  "composer-2.5",
] as const;

export const modelFamilySchema = z
  .string()
  .trim()
  .min(1, "model_family is required.")
  .max(128, "model_family must be 128 characters or fewer.");

export const modelVersionSchema = z
  .string()
  .trim()
  .min(1, "model_version is required.")
  .max(256, "model_version must be 256 characters or fewer.");

export type ModelVersion = z.infer<typeof modelVersionSchema>;

/** Public attribution displays the model label exactly as the client registered it. */
export function exactModelLabel(modelVersion: string): string {
  return modelVersion;
}
