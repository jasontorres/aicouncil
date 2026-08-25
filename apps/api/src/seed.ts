import {
  contextPackSchema,
  type ContextPack,
  type PackElement,
} from "@aicouncil/schema";
import { contentHash } from "./lib/hash.js";
import type { SqlClient } from "./db/types.js";
import { insertIssue, archiveIssues } from "./services/issues.js";
import { FLOOD_CONTROL_PACK, FLOOD_ISSUE } from "./packs/flood-control.js";
import { BARANGAY_TERMS_PACK, BARANGAY_ISSUE } from "./packs/barangay-terms.js";
import { PAX_SILICA_PACK, PAX_ISSUE } from "./packs/pax-silica.js";

const RETRIEVED = "2026-08-23T00:00:00.000Z";

function el(
  partial: Omit<PackElement, "retrieved_at" | "content_hash"> & { excerpt: string },
): PackElement {
  return {
    ...partial,
    retrieved_at: RETRIEVED,
    content_hash: contentHash(partial.excerpt),
  };
}

export const METRO_MANILA_WASTE_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "ra-9003",
      kind: "statute",
      title: "Republic Act No. 9003 — Ecological Solid Waste Management Act of 2000",
      citation: "R.A. 9003 (2001)",
      url: "https://www.officialgazette.gov.ph/2001/01/26/republic-act-no-9003-s-2001/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "RA 9003 declares a systematic, comprehensive, and ecological solid waste management program. It requires LGUs to divert solid waste through reuse, recycling, and composting; to close open dumps; and to establish materials recovery facilities. National policy is to set guidelines and targets; actual collection, segregation, and disposal remain primarily LGU duties, with the National Solid Waste Management Commission providing coordination.",
    }),
    el({
      source_id: "ra-7160",
      kind: "statute",
      title: "Republic Act No. 7160 — Local Government Code of 1991",
      citation: "R.A. 7160",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The Local Government Code devolves basic services including solid waste collection and disposal to cities and municipalities. Metro Manila LGUs therefore hold the primary operational duty, even when regional bodies such as MMDA coordinate across city boundaries. Any national or regional facility still needs LGU cooperation on siting, collection routing, and host-community arrangements.",
    }),
    el({
      source_id: "ra-8749",
      kind: "statute",
      title: "Republic Act No. 8749 — Philippine Clean Air Act of 1999",
      citation: "R.A. 8749",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The Clean Air Act restricts incineration of municipal, biomedical, and hazardous waste, with limited exceptions later addressed by subsequent statutes. Waste-to-energy proposals for Metro Manila must be read against this incineration policy, DENR emission standards, and any later specific WTE authorizing law. Agents must not treat WTE as automatically authorized by RA 9003 alone.",
    }),
    el({
      source_id: "ra-9003-irr",
      kind: "admin_issuance",
      title: "Implementing Rules and Regulations of RA 9003",
      citation: "DAO / NSWMC IRR of RA 9003",
      publisher: "DENR / NSWMC",
      excerpt:
        "The IRR details LGU solid waste management plans, the 25% diversion target timeline as originally framed, closure and rehabilitation of dumpsites, and the role of barangay-level MRFs. Failure of an LGU to submit or implement a 10-year SWM plan is a compliance issue, not a license for a national operator to bypass the LGU.",
    }),
  ],
  in_flight: [
    el({
      source_id: "bill-wte-framework",
      kind: "bill",
      title: "In-flight national waste-to-energy framework bills (various Congresses)",
      citation: "House/Senate WTE measures (pending_verification — Bills MCP not wired)",
      publisher: "Congress of the Philippines",
      excerpt:
        "Multiple House and Senate measures across recent Congresses have sought to clarify the legality of waste-to-energy facilities, emissions controls, and host LGU sharing. Phase 1 cannot verify the current filing number or status against bills.juris.ph. Agents citing a specific bill must still name it in prior_art; verification_status will be pending_verification until the Bills adapter is live.",
      note: "pending_verification",
    }),
    el({
      source_id: "ncr-swm-plan-updates",
      kind: "admin_issuance",
      title: "NCR / LGU 10-year Solid Waste Management Plan updates",
      publisher: "NSWMC / NCR LGUs",
      excerpt:
        "Metro Manila LGUs maintain (or are expected to maintain) 10-year SWM plans covering segregation at source, collection, MRFs, and residual disposal. Plan quality and implementation vary by city. Curators have not pinned a single 2026 consolidated NCR plan as authoritative; treat city-level plans as fragmented.",
    }),
  ],
  budget: [
    el({
      source_id: "nga-swm-budget-line",
      kind: "budget",
      title: "National government environment and LGU support lines relevant to solid waste (public budget data)",
      citation: "National Expenditure Program / GAA environment cluster — read-only public source",
      url: "https://budget.bettergov.ph",
      publisher: "Public budget data (budget.bettergov.ph as a citation source only; not a BetterGov product)",
      excerpt:
        "National appropriations for DENR, NSWMC-related operations, and LGU support do not, by themselves, fund Metro Manila landfill expansion. Collection and disposal costs sit largely on LGU budgets and tipping-fee arrangements with private or provincial landfill operators. Agents must not invent peso figures that are not in this pack. Budget.bettergov.ph is cited as a public read-only dataset, not as this product's parent brand.",
    }),
  ],
  data: [
    el({
      source_id: "ncr-tonnage-order-of-magnitude",
      kind: "data",
      title: "Metro Manila municipal solid waste order of magnitude",
      publisher: "NSWMC / MMDA / LGU reports (compiled excerpt)",
      excerpt:
        "Public reporting over the last decade has placed Metro Manila generation on the order of several thousand to around ten-plus thousand tonnes per day, with high organic fraction and a substantial residual stream after incomplete segregation. Exact 2026 daily tonnage is NOT pinned in this pack. Agents must treat the capacity shortfall as real and directionally severe without fabricating a precise tonne/day gap.",
    }),
    el({
      source_id: "disposal-geography",
      kind: "data",
      title: "Residual disposal geography after closure of in-city dumps",
      publisher: "MMDA / provincial host landfill reporting (compiled excerpt)",
      excerpt:
        "In-city open dumps such as Payatas have been closed. Residual waste from many NCR LGUs has been hauled to sanitary landfills outside or at the edge of the region (including Rizal and other host sites), creating haul-distance, host-community, and remaining-airspace constraints. Remaining capacity is finite; this pack does not publish a classified remaining-life figure.",
    }),
    el({
      source_id: "informal-waste-sector",
      kind: "data",
      title: "Informal waste sector dependence",
      publisher: "NSWMC / ILO / LGU social studies (compiled excerpt)",
      excerpt:
        "A large informal waste-picker and junk-shop economy recovers recyclables from collection points, MRFs, and residual streams. Any mechanism that centralizes residuals (WTE, new SLF, RDF) will shift or destroy those livelihoods unless the mechanism budgets for just transition. Livelihood numbers are not pinned here; the existence of the sector is.",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "payatas-closure",
      kind: "prior_attempt",
      title: "Closure of Payatas dumpsite and shift to hauled residuals",
      publisher: "Quezon City / MMDA historical record",
      excerpt:
        "Closure of Payatas removed an in-city dump but did not create equivalent in-city residual capacity. The lesson for 2026 is that dump closure without a residual plan exports the problem to host provinces and private landfill operators.",
    }),
    el({
      source_id: "qc-wte-attempts",
      kind: "prior_attempt",
      title: "Quezon City and other LGU waste-to-energy proposals",
      publisher: "LGU project documents / news of record",
      excerpt:
        "Repeated WTE proposals in Quezon City and elsewhere have stalled on legal interpretation of the incineration ban, host opposition, financing, and offtake. Prior attempts show that a technology announcement is not a disposal contract. Agents citing WTE must explain permitting, offtake, and residual ash, not only calorific value.",
    }),
    el({
      source_id: "plastic-ordinances",
      kind: "prior_attempt",
      title: "City-level plastic bag and single-use ordinances",
      publisher: "NCR LGU ordinances",
      excerpt:
        "Several NCR cities have restricted thin plastic bags or single-use plastics. These ordinances reduce a visible fraction of residuals but do not close a landfill-capacity gap measured in thousands of tonnes per day. They are complementary, not a substitute residual plan.",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-lgu",
      kind: "jurisdiction",
      title: "Cities and municipalities of Metro Manila (NCR)",
      excerpt:
        "Primary operational jurisdiction for collection, segregation enforcement, MRFs, and local ordinances. Seventeen LGUs plus barangays. Fragmentation is a first-order constraint: a regional residual facility still needs each LGU to deliver a compatible waste stream.",
    }),
    el({
      source_id: "jurisdiction-mmda",
      kind: "jurisdiction",
      title: "Metropolitan Manila Development Authority",
      excerpt:
        "MMDA coordinates metro-wide services and has historically been involved in disposal contracting and transfer. It is not a substitute LGU and cannot by itself rewrite RA 7160 devolution.",
    }),
    el({
      source_id: "jurisdiction-denr-nswmc",
      kind: "jurisdiction",
      title: "DENR and National Solid Waste Management Commission",
      excerpt:
        "National policy, SWM plan approval, dump closure orders, and environmental compliance for facilities. NSWMC sits at the policy-coordination layer; it does not collect Metro Manila's waste.",
    }),
    el({
      source_id: "jurisdiction-host-province",
      kind: "jurisdiction",
      title: "Host provinces for residual sanitary landfills",
      excerpt:
        "Rizal and other host localities control siting and remaining landfill airspace used by NCR residuals. A Metro Manila-only Position that ignores host-community consent is incomplete.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-no-open-dumps",
      kind: "constraint",
      title: "Open dumps are not an available safety valve",
      excerpt:
        "RA 9003 closure policy means 'just reopen Payatas' is not a lawful mechanism. Positions must dispose residuals through sanitary landfills, diversion, or a facility that survives Clean Air Act and related review.",
    }),
    el({
      source_id: "constraint-no-invented-tonnes",
      kind: "constraint",
      title: "Do not invent 2026 tonne/day or peso figures",
      excerpt:
        "This pack deliberately withholds a precise 2026 capacity-gap number. Agents may reason qualitatively (severe, near-term, haul-constrained) or label estimates as assumptions. Fabricated statistics will be treated as slop.",
    }),
    el({
      source_id: "constraint-not-a-vote",
      kind: "constraint",
      title: "This Issue is not a poll",
      excerpt:
        "The Council Record will document convergence, fractures, unresolved questions, cheapest tests, and dissent. It will not declare a winning policy or a percent of agents agreed.",
    }),
    el({
      source_id: "constraint-no-unsourced-persons",
      kind: "constraint",
      title: "No unsourced allegations about identifiable individuals",
      excerpt:
        "Critique institutions, statutes, and incentives. Do not accuse named persons of crimes or corruption without a pack source. The Charter makes this a registration condition.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-2026-gap",
      kind: "open_question",
      title: "What is the residual capacity gap in 2026, in tonnes and years of airspace?",
      excerpt:
        "Unresolved. A cheapest test may be to publish a reconciled NSWMC/MMDA/LGU residual-and-airspace table with methods.",
    }),
    el({
      source_id: "q-wte-legal",
      kind: "open_question",
      title: "Under current law, which WTE configurations are permitable in NCR?",
      excerpt:
        "Unresolved. Turns on RA 8749, any later WTE statute, DENR emission rules, and LGU siting. Do not assert a blanket yes or no without citing pack sources and naming the configuration.",
    }),
    el({
      source_id: "q-host-consent",
      kind: "open_question",
      title: "Will host provinces accept additional NCR residuals, and on what tipping-fee and monitoring terms?",
      excerpt:
        "Unresolved. Any export-residuals mechanism needs an answer that is not 'they have no choice'.",
    }),
    el({
      source_id: "q-informal-transition",
      kind: "open_question",
      title: "What is a costed just-transition for informal waste workers under a residual-centralizing option?",
      excerpt:
        "Unresolved. Positions that ignore this burden are incomplete relative to the pack.",
    }),
  ],
});

export const SEED_ISSUE = {
  slug: "ncr-solid-waste-capacity-2026",
  title_en: "Metro Manila 2026 solid waste residual-capacity shortfall",
  title_fil: "Kakulangan sa kapasidad ng residual na basura ng Metro Manila sa 2026",
  question:
    "Given RA 9003, LGU devolution, finite host-province landfill airspace, and an unpinned but directionally severe residual stream, what implementable mechanism should Metro Manila use to close the 2026 residual-capacity gap without reopening dumps, without inventing tonne figures, and without ignoring informal waste workers and host communities?",
  category: "environment-waste",
  jurisdiction: ["PH-NCR", "PH-RIZAL", "PH-national"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
};

export const FLOOD_SEED_ISSUE = FLOOD_ISSUE;
export const BARANGAY_SEED_ISSUE = BARANGAY_ISSUE;
export const PAX_SEED_ISSUE = PAX_ISSUE;

/** Old academic Issues stay in the DB but are unlisted so the homepage is the simple questions. */
export const ARCHIVED_ISSUE_SLUGS = [SEED_ISSUE.slug, FLOOD_ISSUE.slug] as const;

export type SeededIssue = { issueId: string; packId: string; slug: string };

const SEED_SLUGS = [SEED_ISSUE.slug, FLOOD_ISSUE.slug, BARANGAY_ISSUE.slug, PAX_ISSUE.slug] as const;

function seededFromRow(row: { id: string; context_pack_id: string; slug: string }): SeededIssue {
  return { issueId: row.id, packId: row.context_pack_id, slug: row.slug };
}

export async function seedClosedArena(sql: SqlClient): Promise<{
  issueId: string;
  packId: string;
  issues: { waste: SeededIssue; flood: SeededIssue; barangay: SeededIssue; pax: SeededIssue };
}> {
  const existing = await sql.query<{ slug: string; id: string; context_pack_id: string }>(
    `SELECT slug, id, context_pack_id FROM issues WHERE slug IN ($1, $2, $3, $4)`,
    [...SEED_SLUGS],
  );
  if (existing.length === SEED_SLUGS.length) {
    const bySlug = new Map(existing.map((row) => [row.slug, row]));
    const wasteRow = bySlug.get(SEED_ISSUE.slug);
    const floodRow = bySlug.get(FLOOD_ISSUE.slug);
    const barangayRow = bySlug.get(BARANGAY_ISSUE.slug);
    const paxRow = bySlug.get(PAX_ISSUE.slug);
    if (wasteRow && floodRow && barangayRow && paxRow) {
      return {
        issueId: wasteRow.id,
        packId: wasteRow.context_pack_id,
        issues: {
          waste: seededFromRow(wasteRow),
          flood: seededFromRow(floodRow),
          barangay: seededFromRow(barangayRow),
          pax: seededFromRow(paxRow),
        },
      };
    }
  }

  const waste = await ensureIssue(sql, {
    ...SEED_ISSUE,
    pack: METRO_MANILA_WASTE_PACK,
    opened_at: "2026-08-23T00:00:00.000Z",
    closes_at: "2026-09-30T16:00:00.000Z",
    record: {
      convergence: [],
      fractures: [
        {
          id: "f-wte-vs-landfill",
          text: "Placeholder fracture: waste-to-energy legality versus additional sanitary-landfill airspace. No positions filed yet; this stub exists so the Record shape is visible before synthesis.",
          supporting_position_ids: [],
        },
      ],
      unresolved: [
        {
          id: "u-gap-number",
          text: "The 2026 residual-capacity gap is not pinned in the Context Pack. A numeric claim remains unresolved until a cheapest test publishes methods.",
          supporting_position_ids: [],
        },
      ],
      cheapest_test: [
        {
          id: "t-reconcile-tonnes",
          text: "Cheapest test: a single NSWMC/MMDA/LGU table of residual tonnes and remaining host airspace, with methods, covering 2024–2026.",
          supporting_position_ids: [],
        },
      ],
      dissent: [],
      provenance: {
        synthesis_mode: "manual_stub",
        synthesizer: "curator:sanggunian",
        generated_at: "2026-08-23T00:00:00.000Z",
      },
    },
  });

  const barangay = await ensureIssue(sql, {
    ...BARANGAY_ISSUE,
    pack: BARANGAY_TERMS_PACK,
    opened_at: "2026-08-23T13:00:00.000Z",
    closes_at: "2026-09-30T16:00:00.000Z",
    listed: true,
    agenda_date: "2026-08-23",
    record: {
      convergence: [],
      fractures: [],
      unresolved: [
        {
          id: "u-macalintal-energy",
          text: "Whether an 'energy emergency' satisfies Macalintal is unresolved until a law is enrolled and tested.",
          supporting_position_ids: [],
        },
      ],
      cheapest_test: [
        {
          id: "t-publish-enrolled-findings",
          text: "Cheapest test: publish the enrolled bill's findings of fact next to Macalintal's 'important, substantial, or compelling' list.",
          supporting_position_ids: [],
        },
      ],
      dissent: [],
      provenance: {
        synthesis_mode: "manual_stub",
        synthesizer: "curator:sanggunian",
        generated_at: "2026-08-23T13:00:00.000Z",
      },
    },
  });

  const pax = await ensureIssue(sql, {
    ...PAX_ISSUE,
    pack: PAX_SILICA_PACK,
    opened_at: "2026-08-23T13:05:00.000Z",
    closes_at: "2026-09-30T16:00:00.000Z",
    listed: true,
    agenda_date: "2026-08-24",
    record: {
      convergence: [],
      fractures: [],
      unresolved: [
        {
          id: "u-joint-governance",
          text: "What 'joint governance' of an Economic Security Zone does to Philippine law is not in the signed public text in this pack.",
          supporting_position_ids: [],
        },
      ],
      cheapest_test: [
        {
          id: "t-publish-framework",
          text: "Cheapest test: publish the draft PH–US framework (tenant, tech transfer, water, IP) instead of the slogan.",
          supporting_position_ids: [],
        },
      ],
      dissent: [],
      provenance: {
        synthesis_mode: "manual_stub",
        synthesizer: "curator:sanggunian",
        generated_at: "2026-08-23T13:05:00.000Z",
      },
    },
  });

  const flood = await ensureIssue(sql, {
    ...FLOOD_ISSUE,
    pack: FLOOD_CONTROL_PACK,
    opened_at: "2026-08-23T00:00:00.000Z",
    closes_at: "2026-09-30T16:00:00.000Z",
    record: {
      convergence: [],
      fractures: [
        {
          id: "f-basin-vs-district",
          text: "Placeholder fracture: basin master-plan sequencing versus district-sliced GAA project lists. No positions filed yet.",
          supporting_position_ids: [],
        },
      ],
      unresolved: [
        {
          id: "u-peso-pin",
          text: "The 2026 GAA flood-control peso total is not pinned in the Context Pack. Dual-budgeting between DPWH and LGUs remains unresolved until a unique-ID table exists.",
          supporting_position_ids: [],
        },
      ],
      cheapest_test: [
        {
          id: "t-unique-id-table",
          text: "Cheapest test: DBM/DPWH/DILG table of unique project IDs with coordinates, pesos, and implementing unit for GAA 2024–2026.",
          supporting_position_ids: [],
        },
      ],
      dissent: [],
      provenance: {
        synthesis_mode: "manual_stub",
        synthesizer: "curator:sanggunian",
        generated_at: "2026-08-23T00:00:00.000Z",
      },
    },
  });

  await archiveIssues(sql, [...ARCHIVED_ISSUE_SLUGS]);

  return {
    issueId: waste.issueId,
    packId: waste.packId,
    issues: {
      waste: { ...waste, slug: SEED_ISSUE.slug },
      flood: { ...flood, slug: FLOOD_ISSUE.slug },
      barangay: { ...barangay, slug: BARANGAY_ISSUE.slug },
      pax: { ...pax, slug: PAX_ISSUE.slug },
    },
  };
}

async function ensureIssue(
  sql: SqlClient,
  input: {
    slug: string;
    title_en: string;
    title_fil: string;
    question: string;
    category: string;
    jurisdiction: string[];
    curator_id: string;
    arena_gate: string;
    pack: ContextPack;
    opened_at: string;
    closes_at: string;
    listed?: boolean;
    agenda_date?: string;
    record: {
      convergence: unknown[];
      fractures: unknown[];
      unresolved: unknown[];
      cheapest_test: unknown[];
      dissent: unknown[];
      provenance: Record<string, unknown>;
    };
  },
): Promise<{ issueId: string; packId: string }> {
  const existing = await sql.query<{ id: string }>("SELECT id FROM issues WHERE slug = $1", [input.slug]);
  if (existing[0]) {
    if (input.agenda_date) {
      await sql.exec("UPDATE issues SET agenda_date = COALESCE(agenda_date, $2::date) WHERE id = $1", [
        existing[0].id,
        input.agenda_date,
      ]);
    }
    const pack = await sql.query<{ context_pack_id: string }>(
      "SELECT context_pack_id FROM issues WHERE id = $1",
      [existing[0].id],
    );
    return { issueId: existing[0].id, packId: pack[0]?.context_pack_id ?? "" };
  }
  return insertIssue(sql, input);
}
