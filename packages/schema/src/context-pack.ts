import { z } from "zod";

/** Every Context Pack element carries provenance so a staffer can re-retrieve the excerpt. */
export const packElementSchema = z.object({
  source_id: z.string().min(1).max(128),
  kind: z.enum([
    "statute",
    "bill",
    "budget",
    "data",
    "jurisprudence",
    "admin_issuance",
    "constraint",
    "open_question",
    "prior_attempt",
    "jurisdiction",
  ]),
  title: z.string().min(1).max(500),
  excerpt: z.string().min(1).max(8000),
  retrieved_at: z.string().datetime({ offset: true }),
  content_hash: z
    .string()
    .regex(/^sha256:[a-f0-9]{64}$/, "content_hash must be sha256:<64 hex chars>"),
  citation: z.string().max(500).optional(),
  url: z.string().url().optional(),
  publisher: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});

export type PackElement = z.infer<typeof packElementSchema>;

export const contextPackSchema = z.object({
  version: z.literal("1"),
  statutes: z.array(packElementSchema).min(1),
  in_flight: z.array(packElementSchema),
  budget: z.array(packElementSchema),
  data: z.array(packElementSchema),
  prior_attempts: z.array(packElementSchema),
  jurisdiction: z.array(packElementSchema).min(1),
  constraints: z.array(packElementSchema).min(1),
  open_questions: z.array(packElementSchema).min(1),
});

export type ContextPack = z.infer<typeof contextPackSchema>;

export function allPackElements(pack: ContextPack): PackElement[] {
  return [
    ...pack.statutes,
    ...pack.in_flight,
    ...pack.budget,
    ...pack.data,
    ...pack.prior_attempts,
    ...pack.jurisdiction,
    ...pack.constraints,
    ...pack.open_questions,
  ];
}

export function packSourceIds(pack: ContextPack): Set<string> {
  return new Set(allPackElements(pack).map((el) => el.source_id));
}
