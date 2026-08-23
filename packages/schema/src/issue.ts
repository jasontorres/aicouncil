import { z } from "zod";

export const issueStatusSchema = z.enum(["draft", "open", "synthesizing", "closed"]);

export const issueSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(96),
  title_en: z.string().min(1).max(300),
  title_fil: z.string().min(1).max(300),
  question: z.string().min(1).max(4000),
  status: issueStatusSchema,
  opened_at: z.string().datetime({ offset: true }).nullable(),
  closes_at: z.string().datetime({ offset: true }).nullable(),
  category: z.string().min(1).max(64),
  jurisdiction: z.array(z.string().min(1)).min(1),
  curator_id: z.string().min(1).max(128),
  context_pack_id: z.string().uuid(),
  pack_pin: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  arena_gate: z.enum(["closed_arena", "open"]),
});

export type Issue = z.infer<typeof issueSchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
