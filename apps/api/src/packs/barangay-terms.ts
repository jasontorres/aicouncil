import { contextPackSchema, type ContextPack } from "@aicouncil/schema";
import { packElement as el } from "./helpers.js";

/**
 * Short, readable pack for the 2026 barangay/SK term-extension / postponement fight.
 * Bills MCP is not wired; bill numbers below are from public news of record (Aug 2026).
 */
export const BARANGAY_TERMS_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "ra-12232",
      kind: "statute",
      title: "Republic Act No. 12232 — four-year barangay/SK term; next BSKE first Monday of November 2026",
      citation: "R.A. 12232 (approved 13 Aug 2025)",
      url: "https://lawphil.net/statutes/repacts/ra2025/ra_12232_2025.html",
      publisher: "Lawphil / Congress of the Philippines",
      excerpt:
        "RA 12232 sets the term of elected barangay and Sangguniang Kabataan officials at four years (barangay: max three consecutive terms in the same post; SK: max one term). The next regular BSKE is the first Monday of November 2026 (2 Nov 2026) and every four years thereafter. Incumbents hold over until successors are elected and qualified. Incumbents on a third consecutive barangay term cannot run for the same post in November 2026. This law itself already postponed the 2025 BSKE and lengthened the term from three years to four.",
    }),
    el({
      source_id: "const-art-x-sec-8",
      kind: "statute",
      title: "1987 Constitution, Article X, Section 8 — barangay term is set by law",
      citation: "Const. art. X, § 8",
      url: "https://www.officialgazette.gov.ph/constitutions/1987-constitution/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The term of elective local officials, except barangay officials, is three years, with a three-consecutive-term cap. The term of barangay officials 'shall be determined by law.' Congress may lengthen or shorten barangay tenure by statute. That is not a blank check to postpone a scheduled election for any reason — see Macalintal (G.R. No. 263590).",
    }),
  ],
  in_flight: [
    el({
      source_id: "sb-2387",
      kind: "bill",
      title: "Senate Bill No. 2387 (Escudero) — five-year term + move Nov 2026 BSKE to Nov 2028",
      citation: "S.B. 2387 (filed ~6 Aug 2026) — pending_verification, Bills MCP not wired",
      publisher: "Senate of the Philippines (as reported by Philstar / Malaya)",
      url: "https://www.philstar.com/headlines/2026/08/07/2547578/2-year-bske-postponement-5-year-term-pushed",
      excerpt:
        "Sen. Francis Escudero's SB 2387 would amend RA 12232: barangay and SK terms become five years (term limits kept: three consecutive barangay terms; SK still one term). Next BSKE moves from the first Monday of November 2026 to the first Monday of November 2028, then every five years. Reporting also says incumbents' extra two years would count as completing a term, and third-term barangay officials would be ineligible to run for the same post in 2028. Explanatory note: longer tenure for community programs; frequent elections disrupt projects. Not enacted as of pack retrieve.",
      note: "pending_verification",
    }),
    el({
      source_id: "hb-10591",
      kind: "bill",
      title: "House Bill No. 10591 (Benitez + dozens) — postpone BSKE to last Monday of November 2028",
      citation: "H.B. 10591 — pending_verification",
      publisher: "House of Representatives (Manila Bulletin / Malaya)",
      url: "https://mb.com.ph/2026/08/06/3-house-bills-seek-bske-postponement-all-point-to-the-same-reason",
      excerpt:
        "HB 10591, filed by Negros Occidental Rep. Javier Miguel Benitez with dozens of co-authors, seeks to move the 2 Nov 2026 BSKE to the last Monday of November 2028. House colleagues invoked an 'energy emergency' and higher fuel costs tied to the US–Iran war. Pending, Committee on Suffrage and Electoral Reforms. Not enacted.",
      note: "pending_verification",
    }),
    el({
      source_id: "hb-10583",
      kind: "bill",
      title: "House Bill No. 10583 (Hernandez et al.) — postpone BSKE to last Monday of May 2027",
      citation: "H.B. 10583 — pending_verification",
      publisher: "House of Representatives (Manila Bulletin)",
      url: "https://mb.com.ph/2026/08/06/3-house-bills-seek-bske-postponement-all-point-to-the-same-reason",
      excerpt:
        "HB 10583 (Senior Deputy Speaker Ferdinand Hernandez and co-authors) would hold the next BSKE on the last Monday of May 2027 — a shorter slip than the 2028 House bills. Same committee. Not enacted.",
      note: "pending_verification",
    }),
    el({
      source_id: "hb-10584",
      kind: "bill",
      title: "House Bill No. 10584 (Alano) — postpone BSKE to last Monday of November 2028",
      citation: "H.B. 10584 — pending_verification",
      publisher: "House of Representatives (Manila Bulletin)",
      url: "https://mb.com.ph/2026/08/06/3-house-bills-seek-bske-postponement-all-point-to-the-same-reason",
      excerpt:
        "HB 10584 (Basilan Rep. Ustadz Yusop Alano) also seeks the last Monday of November 2028. Authors cite Macalintal: postponement only for important, substantial, or compelling reasons. Not enacted.",
      note: "pending_verification",
    }),
    el({
      source_id: "hb-10376",
      kind: "bill",
      title: "House Bill No. 10376 (Zamora) — postpone 2026 BSKE, citing economic recovery",
      citation: "H.B. 10376 — pending_verification",
      publisher: "House of Representatives (Philippine Daily Inquirer)",
      url: "https://www.inquirer.net/484521/comelec-to-congress-decide-on-fate-of-2026-barangay-sk-polls-by-september/",
      excerpt:
        "San Juan Rep. Ysabel Zamora, among the authors of HB 10376, argued in committee that the elections should be postponed so government can focus on economic recovery. Exact reset date is not pinned in this pack beyond that reporting. Not enacted.",
      note: "pending_verification",
    }),
  ],
  budget: [],
  data: [
    el({
      source_id: "philstar-2026-08-07",
      kind: "data",
      title: "Philstar: SB 2387 five-year term; House also pushing a 2028 reset",
      url: "https://www.philstar.com/headlines/2026/08/07/2547578/2-year-bske-postponement-5-year-term-pushed",
      publisher: "Philippine Star",
      excerpt:
        "A year after postponing the 2025 BSKE, both chambers filed bills to postpone November 2026 again, some by two years to 2028. Escudero's SB 2387 is the term-extension vehicle (4→5 years). Comelec said it is prepared to run 2 Nov 2026.",
    }),
    el({
      source_id: "inquirer-comelec-september",
      kind: "data",
      title: "Inquirer: Comelec asks Congress to decide by September; if slip, not later than June 2027",
      url: "https://www.inquirer.net/484521/comelec-to-congress-decide-on-fate-of-2026-barangay-sk-polls-by-september/",
      publisher: "Philippine Daily Inquirer",
      excerpt:
        "Comelec Chair George Erwin Garcia told the House suffrage committee Comelec is ready for 2 Nov 2026 and asked for a clear decision by September because of logistics. If Congress postpones, he asked that the reset not go past mid-2027 (June), because June 2027 onward is prep for the national and local elections. Peso line-items in that hearing are not copied here as pinned totals.",
    }),
    el({
      source_id: "mb-comelec-ready",
      kind: "data",
      title: "Manila Bulletin: Comelec ready for Nov 2 despite House/Senate postponement bills",
      url: "https://mb.com.ph/2026/08/06/comelec-ready-for-nov-2-bske-despite-postponement-bills-in-house-senate",
      publisher: "Manila Bulletin",
      excerpt:
        "Garcia: postponement is a political decision of Congress and the Executive; Comelec implements the law. He noted the last postponement (term 3→4 years) and that rising fuel costs were not in Comelec's election budget. He cited Art. X § 8: barangay term may be less or more than three years because it is determined by law. Sen. Imee Marcos has also filed a Senate measure to move the November 2026 BSKE to October 2027 (bill number not pinned here — do not invent it).",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "macalintal-263590",
      kind: "jurisprudence",
      title: "Macalintal v. COMELEC, G.R. No. 263590 (2023) — postponement needs a real reason",
      citation: "G.R. No. 263590 / 263673 (June 2023)",
      url: "https://lawphil.net/judjuris/juri2023/jun2023/gr_263590_2023.html",
      publisher: "Supreme Court of the Philippines",
      excerpt:
        "The Court struck down RA 11935 (the 2022 BSKE postponement). House bills in 2026 themselves quote the test: an election may be postponed only for important, substantial, or compelling reasons. Superficial reasons — election fatigue, 'divisiveness,' shortness of the existing term — are not enough by themselves. Public emergency can count, but only to the extent strictly required. This pack does not decide whether an 'energy emergency' meets that test.",
    }),
    el({
      source_id: "ra-12232-already-slipped-2025",
      kind: "prior_attempt",
      title: "RA 12232 already postponed the 2025 BSKE and added a year to the term",
      publisher: "Congress / Malacañang (Inquirer, Rappler)",
      url: "https://www.inquirer.net/452642/marcos-signs-law-postponing-bske-to-nov-2026-officials-terms-extended/",
      excerpt:
        "August 2025: RA 12232 moved the December 2025 BSKE to November 2026 and raised the term from three years to four (up to 12 consecutive years in the same barangay post). SB 2387 would do another slip plus another year. The pattern is the prior art.",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-congress-comelec",
      kind: "jurisdiction",
      title: "Congress writes the term; Comelec runs the election that the law still schedules",
      excerpt:
        "Congress (House suffrage committee + Senate) is where SB 2387 / the HB postponement bills live. Comelec administers whatever date is in force. Barangay and SK officials are the people whose tenure moves if a bill becomes law. Voters in every barangay are the ones who wait.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-not-a-vote",
      kind: "constraint",
      title: "This is a thread, not a referendum",
      excerpt:
        "Agree/disagree-shaped questions are still not a poll. No % agreed. No verdict widget.",
    }),
    el({
      source_id: "constraint-no-invented-pesos",
      kind: "constraint",
      title: "Do not invent Comelec or GAA peso figures",
      excerpt:
        "Hearing totals are not pinned here. Cost talk is structure (procurement, boards, fuel) unless you cite a pack source that actually states a number.",
    }),
    el({
      source_id: "constraint-no-unsourced-persons",
      kind: "constraint",
      title: "No unsourced allegations about named people",
      excerpt:
        "You can talk about bills, Comelec's calendar, and Macalintal. Do not accuse named persons of crimes without a pack source.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-energy-emergency-macalintal",
      kind: "open_question",
      title: "Does an 'energy emergency' / fuel spike actually satisfy Macalintal?",
      excerpt:
        "Unresolved. House bills assert it. Comelec says it is ready anyway. A cheapest test is the enrolled bill's findings vs the Court's 'important, substantial, or compelling' list.",
    }),
    el({
      source_id: "q-comelec-calendar",
      kind: "open_question",
      title: "If Congress slips the date, can Comelec still hit 2028 national/local prep?",
      excerpt:
        "Garcia asked: decide by September; if postpone, not later than June 2027. SB 2387's November 2028 date sits past that ask. Unresolved until a law exists.",
    }),
  ],
});

export const BARANGAY_ISSUE = {
  slug: "brgy-term-sb-2387",
  title_en: "Should barangay captains get a longer term under SB 2387? Seems like every Congress tries to postpone the barangay election again.",
  title_fil: "Dapat bang palawigin ang termino ng kapitan under SB 2387? Para bang taon-taon postponement ng barangay election.",
  question:
    "SB 2387 (Escudero) would make barangay/SK terms 5 years and move the 2 Nov 2026 election to Nov 2028. The House has HB 10591 / 10584 (Nov 2028) and HB 10583 (May 2027). Comelec says it can still run November. Last year RA 12232 already added a year and slipped 2025. Do you actually buy the energy-emergency / 'more time for programs' story, or is this just another holdover? Not a poll — say what the mechanism is.",
  category: "elections-local",
  jurisdiction: ["PH-national", "PH-barangay"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
};
