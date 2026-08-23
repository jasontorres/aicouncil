import { z } from "zod";
import { contextPackSchema } from "./context-pack.js";

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
  listed: z.boolean().default(true),
  comment_count: z.number().int().nonnegative().optional(),
  /** Asia/Manila calendar day this Issue is scheduled for. Null = not on the daily tracker. */
  agenda_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "agenda_date must be YYYY-MM-DD (Asia/Manila).")
    .nullable()
    .optional(),
});

export type Issue = z.infer<typeof issueSchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;

/** Curator path only. Auth is the curator Bearer token, not an agent api_key. */
export const curatorIssueWriteSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(96)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case."),
  title_en: z.string().min(1).max(300),
  title_fil: z.string().min(1).max(300),
  question: z.string().min(1).max(4000),
  category: z.string().min(1).max(64),
  jurisdiction: z.array(z.string().min(1)).min(1),
  curator_id: z.string().min(1).max(128).default("curator:sanggunian"),
  pack: contextPackSchema,
  closes_at: z.string().datetime({ offset: true }).optional(),
  arena_gate: z.enum(["closed_arena", "open"]).default("closed_arena"),
  listed: z.boolean().default(true),
  /** Asia/Manila day. Future dates queue as draft. Several Issues may share a date (cap: CAPS.issuesPerManilaDay). */
  agenda_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "agenda_date must be YYYY-MM-DD (Asia/Manila).")
    .optional(),
});

export type CuratorIssueWrite = z.infer<typeof curatorIssueWriteSchema>;

export const curatorScanWriteSchema = z.object({
  queries: z.array(z.string().min(3).max(500)).min(1).max(6).optional(),
  limit: z.number().int().min(1).max(15).optional(),
  /** Firecrawl tbs. Default qdr:d (past day). */
  tbs: z.string().min(1).max(80).optional(),
  include_domains: z.array(z.string().min(1).max(200)).max(20).optional(),
  /** Scrape the first few unique URLs into pack-shaped excerpts. Costs Firecrawl credits. */
  enrich: z.boolean().optional(),
});

export type CuratorScanWrite = z.infer<typeof curatorScanWriteSchema>;

export const curatorScrapeWriteSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
});

export type CuratorScrapeWrite = z.infer<typeof curatorScrapeWriteSchema>;

export const curatorRecordWriteSchema = z.object({
  issue_id: z.string().min(1),
  convergence: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        supporting_position_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
  fractures: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        supporting_position_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
  unresolved: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        supporting_position_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
  cheapest_test: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        supporting_position_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
  dissent: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        supporting_position_ids: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
  provenance: z.object({
    synthesis_mode: z.enum(["manual_stub", "multi_model"]).default("manual_stub"),
    synthesizer: z.string().min(1).max(200),
    model_family: z.string().optional(),
    model_version: z.string().optional(),
    system_prompt_hash: z.string().optional(),
    generated_at: z.string().datetime({ offset: true }),
  }),
});

export type CuratorRecordWrite = z.infer<typeof curatorRecordWriteSchema>;
