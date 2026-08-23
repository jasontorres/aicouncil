import { contextPackSchema, type ContextPack } from "@aicouncil/schema";
import { packElement as el } from "./helpers.js";

/**
 * Short pack on Pax Silica (US-led AI/semiconductor/critical-minerals club) and the PH fight over it.
 * Not a legal memo. Sourced from public news + statutes the deal would sit under.
 */
export const PAX_SILICA_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "ra-7227",
      kind: "statute",
      title: "Republic Act No. 7227 — Bases Conversion and Development Act (BCDA)",
      citation: "R.A. 7227 (1992), as amended",
      url: "https://lawphil.net/statutes/repacts/ra1992/ra_7227_1992.html",
      publisher: "Congress of the Philippines / Lawphil",
      excerpt:
        "RA 7227 created the Bases Conversion and Development Authority to convert former US military reservations (including Clark) into productive civilian uses, with BCDA as owner/developer of the conversion areas. BCDA President Joshua Bingcang has said the Pax Silica Clark hub would sit under the BCDA legal framework (plus CREATE MORE), not a brand-new extra-legal zone. 'Joint governance' language in US/PH project talk still has to fit inside Philippine law — this pack does not treat a press release as a statute.",
    }),
    el({
      source_id: "ra-12066",
      kind: "statute",
      title: "Republic Act No. 12066 — CREATE MORE (tax incentives for registered business enterprises)",
      citation: "R.A. 12066 (signed 11 Nov 2024)",
      url: "https://newsinfo.inquirer.net/2003721/clearer-biz-rules-perks-with-create-more-law",
      publisher: "Congress of the Philippines (Inquirer report of RA 12066)",
      excerpt:
        "CREATE MORE amends the NIRC / original CREATE (RA 11534): lower CIT for registered business enterprises, longer incentive clocks, IPA/BOI/PEZA administration. Bingcang (Aug 2026) said the initial Pax Silica arrangement would be covered by the BCDA law and CREATE MORE. That is an incentives-and-land-owner story, not a semiconductor industrial-policy statute. Technology transfer, equity, and 'economic security zone' rules are not written in RA 12066.",
    }),
  ],
  in_flight: [
    el({
      source_id: "pax-silica-framework-talks",
      kind: "bill",
      title: "PH–US Pax Silica framework agreement (unsigned as of pack retrieve; November 2026 target)",
      citation: "Framework talks — not a filed PH bill; pending_verification of final text",
      publisher: "BCDA / DoF / US Department of State (as reported)",
      url: "https://techpilipinas.com/philippines-pushes-most-beneficial-terms-pax-silica-deal/",
      excerpt:
        "Pax Silica is a US-led coalition launched December 2025 on AI, semiconductors, and critical minerals (explicitly to reduce China-chokepoint risk). The Philippines joined in April 2026. A comprehensive framework for a ~1,618–1,620 hectare (about 4,000 acre) hub in New Clark City, Capas, Tarlac is still being negotiated. BCDA's Bingcang: sign target November 2026, 'not cast in stone,' push for terms 'most beneficial' to PH, existing PH law not a separate extra framework. DoF Sec. Frederick Go (July 2026) called signing within the year a priority. No enrolled PH bill number. Do not invent one.",
      note: "pending_verification",
    }),
  ],
  budget: [],
  data: [
    el({
      source_id: "rappler-what-is-pax-silica",
      kind: "data",
      title: "Rappler (22 Apr 2026): what Pax Silica is, and the PH critique",
      url: "https://www.rappler.com/technology/features/things-to-know-pax-silica-philippines-goals-concerns/",
      publisher: "Rappler",
      excerpt:
        "US Undersecretary Jacob Helberg: 21st century runs on compute and the minerals that feed it; 'aligned partners' build the AI stack. PH semiconductor industry is mostly assembly, test, packaging; chips are a huge share of merchandise exports. Finance Sec. Go: joining so minerals and location are 'not simply supporting global industries from the margins.' US Embassy language: Clark as an 'Economic Security Zone' with 'joint governance' and 'sovereign alignment' — details sparse. Critics (KMP, Computer Professionals Union, Makabayan): subordinate role (raw materials / low-value manufacturing), land conversion, mining, and the risk that a civilian industrial zone becomes a target if it sits next to expanding US–PH military cooperation. This pack records the argument; it does not adjudicate it.",
    }),
    el({
      source_id: "rappler-senate-hearing-2026-08-14",
      kind: "data",
      title: "Rappler: Senate environment hearing 14 Aug 2026 — jobs/AI yes, consultation/water/IP no",
      url: "https://www.rappler.com/philippines/senate-pax-silica-hearing-august-14-2026/",
      publisher: "Rappler",
      excerpt:
        "Senators (Gatchalian, Bam Aquino, Tulfo, Imee Marcos, Pangilinan) see potential for higher-value manufacturing but told BCDA/BOI to get infrastructure, safeguards, and communities right. Pangilinan: no real consultation with people around New Clark City. Capas Mayor Roseller Rodriguez: 'Wala pong nangyaring consultation' — a 22 June text invite, Pax Silica as a slide in a New Clark overview. BOI/DTI's Ceferino Rodolfo: first node is advanced manufacturing (AI data-center components), then IC design; critical-mineral processing is medium/long-term and would likely sit nearer mines (e.g. Dinagat/Agusan talk), not Clark this year. No factory this year; roads targeted 2H 2027, firms maybe 2028. Water: current local supply vs Pax Silica demand as stated in the hearing (Bingcang) is a real constraint; recycling/desal were discussed. Sitio Sapang Kawayan IP households, burial/prayer grounds, and farmers on BCDA land are unresolved. Signed Pax Silica document is supposedly on the BOI site — agents should not invent its clauses.",
    }),
    el({
      source_id: "bworld-dof-foxconn",
      kind: "data",
      title: "BusinessWorld (8 Jul 2026): DoF wants a framework this year; Foxconn named as intended anchor",
      url: "https://bworldonline.com/top-stories/2026/07/08/761816/dof-prioritizes-signing-of-pax-silica-deal-within-the-year/",
      publisher: "BusinessWorld",
      excerpt:
        "Go: hope to sign within the year; Clark as AI/semiconductor hub; Luzon Economic Corridor context (PH–US–Japan, later other partners). The article reports Go saying Taiwan-based Foxconn is to serve as the anchor investor. That is a news report of a cabinet statement, not a signed offtake contract in this pack. Do not treat it as a closed deal.",
    }),
    el({
      source_id: "techpilipinas-beneficial-terms",
      kind: "data",
      title: "TechPilipinas (22 Aug 2026): BCDA still negotiating 'most beneficial' terms",
      url: "https://techpilipinas.com/philippines-pushes-most-beneficial-terms-pax-silica-deal/",
      publisher: "TechPilipinas",
      excerpt:
        "Bingcang at Kapihan sa Manila Hotel: November signing target can slip; hub inside the Luzon Economic Corridor; manufacturing/microchips rather than data centers as the stated intent; covered by BCDA law + CREATE MORE.",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "ph-atp-history",
      kind: "prior_attempt",
      title: "PH is already a chip assembler — moving up the chain is the unkept promise",
      publisher: "ASEAN BAC / Rappler compilation",
      url: "https://www.rappler.com/technology/features/things-to-know-pax-silica-philippines-goals-concerns/",
      excerpt:
        "Electronics/semiconductors have been the bulk of PH merchandise exports for years (Rappler cites ASEAN BAC figures in the tens of billions of USD, easing 2022→2024). The country has been in the assembly-test-packaging slice, not lithography or leading-edge fab. Pax Silica's pitch is to climb (design, advanced manufacturing). Prior PEZA/eco-zone waves show land + incentives ≠ technology transfer. A mechanism has to say who owns IP, who trains whom, and what happens if the US–China split gets hotter.",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-bcda-boi-dti-capas",
      kind: "jurisdiction",
      title: "BCDA land, BOI/DTI investment rules, Tarlac/Capas LGU, NCIP for IP land",
      excerpt:
        "Clark conversion land is a BCDA problem. Incentives are BOI/DTI/CREATE MORE. Host LGU is Capas, Tarlac. IP communities need NCIP process if ancestral domains/burial grounds are in the footprint. A 'joint governance' zone that skips those is incomplete.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-not-a-vote",
      kind: "constraint",
      title: "Thread, not a geopolitical poll",
      excerpt: "No % agreed. No 'Filipinos think' claim. Agents argue mechanisms.",
    }),
    el({
      source_id: "constraint-no-invented-pesos-mw",
      kind: "constraint",
      title: "Do not invent peso, MW, or job figures that are not in this pack",
      excerpt:
        "Hearing numbers (water MLD, solar/LNG talk) stay inside their news sources. Do not fabricate a jobs total or a GAA line for Pax Silica.",
    }),
    el({
      source_id: "constraint-no-unsourced-persons",
      kind: "constraint",
      title: "No unsourced allegations about named people",
      excerpt: "Critique the deal structure. Do not accuse named persons of crimes without a pack source.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-joint-governance",
      kind: "open_question",
      title: "What does 'joint governance' / Economic Security Zone actually do to PH law?",
      excerpt:
        "Unresolved. Embassy language vs Bingcang's 'just BCDA + CREATE MORE'. Cheapest test: publish the draft framework, not the slogan.",
    }),
    el({
      source_id: "q-up-the-chain",
      kind: "open_question",
      title: "Is the first tenant assembly/test again, or actual design/advanced manufacturing?",
      excerpt:
        "Rodolfo says manufacturing then IC design; no factory this year. Unresolved until a signed tenant contract, not a press hit.",
    }),
    el({
      source_id: "q-china-risk",
      kind: "open_question",
      title: "If this is a US club against China's mineral/chip leverage, what is the PH exposure?",
      excerpt:
        "Unresolved. Jobs vs. becoming a node in a bloc fight (including targeting risk). Pack records both claims.",
    }),
  ],
});

export const PAX_ISSUE = {
  slug: "pax-silica-ph",
  title_en:
    "Pax Silica: US wants PH in a semiconductor club. People are split — jobs vs. getting dragged into a China-US fight. What's the actual mechanism, not the press release?",
  title_fil:
    "Pax Silica: gusto ng US isama ang PH sa semiconductor club. Jobs vs. gulo ng China-US. Ano ba talaga ang mekanismo, hindi yung press release?",
  question:
    "PH joined Pax Silica (US-led AI/chips/critical-minerals club) in April 2026. There's a ~4,000-acre New Clark City pitch, a November framework target, BCDA saying it'll just be BCDA law + CREATE MORE, senators asking where the consultation/water/IP plan is, and critics calling it a low-value/minerals-out deal. What's the actual mechanism — tenant, tech transfer, who governs the zone — not the slogan?",
  category: "industry-geopolitics",
  jurisdiction: ["PH-national", "PH-TARLAC", "PH-clark"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
};
