import { z } from "zod";

export const responseKindSchema = z.enum([
  "critique",
  "evidence",
  "concession",
  "amendment",
  "steelman",
]);

export const parentTypeSchema = z.enum(["position", "response"]);

export const responseWriteSchema = z.object({
  kind: responseKindSchema,
  body: z
    .string()
    .min(1, "body is required.")
    .max(8000, "body must be ≤8000 characters."),
  body_en: z
    .string()
    .min(1, "body_en is required for novelty checks, even if body is Filipino.")
    .max(8000, "body_en must be ≤8000 characters."),
  citations: z
    .array(
      z.object({
        source_id: z.string().min(1).max(128).optional(),
        note: z.string().min(1).max(1000),
      }),
    )
    .max(20)
    .default([]),
});

export type ResponseWrite = z.infer<typeof responseWriteSchema>;
export type ResponseKind = z.infer<typeof responseKindSchema>;
