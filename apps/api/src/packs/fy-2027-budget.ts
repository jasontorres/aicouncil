import { contextPackSchema, type ContextPack } from "@aicouncil/schema";
import { packElement, PACK_RETRIEVED_SPECIAL } from "./helpers.js";

function el(
  partial: Omit<Parameters<typeof packElement>[0], "retrieved_at">,
): ReturnType<typeof packElement> {
  return packElement({ ...partial, retrieved_at: PACK_RETRIEVED_SPECIAL });
}

/**
 * Operator-asked Special Topic: FY 2027 GAA / House appropriations hearings.
 * Hearing figures are as spoken. Do not treat news peso totals as an enrolled GAA table.
 */
export const FY_2027_BUDGET_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "const-art-vi-appropriations",
      kind: "statute",
      title: "1987 Constitution, Article VI — appropriation bills originate in the House; no money paid except by law",
      citation: "Const. art. VI, §§ 24–25, 29",
      url: "https://www.officialgazette.gov.ph/constitutions/1987-constitution/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "Section 24: all appropriation, revenue, or tariff bills originate exclusively in the House of Representatives; the Senate may propose or concur with amendments. Section 25: the President submits a budget of expenditures within thirty days of the opening of every regular session; Congress may not increase the appropriations recommended by the President for the operation of the Government as specified in the budget. No law shall be passed authorizing any transfer of appropriations, with limited exceptions for the President, Senate President, Speaker, Chief Justice, and heads of Constitutional Commissions, who may be authorized by law to augment items from savings. Section 29: no money shall be paid out of the Treasury except in pursuance of an appropriation made by law. The FY 2027 fight is that appropriations process — not a press release.",
    }),
  ],
  in_flight: [
    el({
      source_id: "hb-10858-filed",
      kind: "bill",
      title: "House Bill No. 10858 — 2027 General Appropriations Bill (as reported; not a BatasWatch pin)",
      citation: "H.B. 10858 (filed ~28 Aug 2026, as reported)",
      publisher: "Philippine Star / House Committee on Appropriations (as reported)",
      url: "https://www.philstar.com/headlines/2026/08/28/2552345/p72-trillion-budget-bill-2027-filed",
      excerpt:
        "Philstar (28 Aug 2026): House appropriations chair Mikaela Suansing said she formally filed House Bill 10858, the 2027 General Appropriations Bill, as the legislative counterpart of the 2027 National Expenditure Program. The article reports the spending plan as P7.2 trillion. That is a news figure for the filed bill, not an enrolled GAA table in this pack. House committee-level budget deliberations were already underway. A House Committee on Appropriations hearing page (DOH, 7 Sep 2026) says the hearing was terminated and proceedings on House Bill No. 10858 were suspended. BatasWatch did not return a catalog row for HB 10858 at pack retrieve — do not invent a House status beyond what is reported here.",
      note: "pending_verification",
    }),
  ],
  budget: [
    el({
      source_id: "hearing-doh-fy2027",
      kind: "budget",
      title: "House FY 2027 DOH budget hearing",
      citation: "House Committee on Appropriations, FY 2027 DOH, 7 Sep 2026 (as spoken)",
      url: "https://budget.bettergov.ph/hearings/4wK1OLsr2lw",
      publisher: "budget.bettergov.ph / House of Representatives",
      excerpt:
        "House Committee on Appropriations heard the FY 2027 DOH proposal on 7 Sep 2026 (video_id 4wK1OLsr2lw). Topic summaries are as spoken in the hearing (ASR is messy — 'R51 billion dollars', '20 26 GAA'). Members raised a reported HFEP shortfall of about 15 billion; combined infrastructure and equipment disbursement spoken as 26 percent; proposed FY2027 catch-up spoken as roughly 14 billion; capital outlay spoken as 14.5 versus 22.3 in the prior GAA. Medical assistance / MAIFIP spoken as about 51 billion falling to about 24 billion. An agency official stated the FY2027 immunization budget as 6855000000. Members also discussed zero-balance billing, a possible additional hospital requirement of about 11 to 12 billion, Super Health Centers (left unresolved), and PhilHealth-related unallocated collections spoken as about 199 billion (member characterization of about 133 billion unallocated sin taxes plus an unclear PCSO/Pagcor figure). The chair required utilization and catch-up data. The hearing was terminated and proceedings on House Bill No. 10858 were suspended. Do not invent a DOH or GAA peso total that is not on this hearing page.",
    }),
    el({
      source_id: "hearing-dict-fy2027",
      kind: "budget",
      title: "House FY 2027 DICT budget hearing",
      citation: "House Committee on Appropriations, FY 2027 DICT, 7 Sep 2026 (as spoken)",
      url: "https://budget.bettergov.ph/hearings/8gJ5lyWjQm8",
      publisher: "budget.bettergov.ph / House of Representatives",
      excerpt:
        "House Committee on Appropriations heard the FY 2027 DICT proposal on 7 Sep 2026 (video_id 8gJ5lyWjQm8). DICT presented a proposed FY 2027 budget of about 19.49 billion for the department and attached agencies, including about 7.6 billion for the Office of the Secretary. Members cited low utilization: about 61.7 percent obligation and 22 percent disbursement for 2025 as spoken, and an unobligated balance of about 20.5 billion as spoken; DICT reported a 24 percent BUR. Free Wi-Fi: about 10.37 million unique users, 11,836 locations; a Free Wi-Fi request spoken as about 5 billion to sustain existing sites. Data sovereignty: DICT said about 80 percent of government data was outside the Philippines; complete sovereign data-center infrastructure spoken as around 20 billion. Topic titles are DICT budget items. Do not treat this hearing as a CADENA Act markup session. Do not invent a DICT or GAA peso total that is not on this hearing page.",
    }),
  ],
  data: [
    el({
      source_id: "philstar-hb-10858-2026-08-28",
      kind: "data",
      title: "Philstar: P7.2 trillion 2027 budget bill (HB 10858) filed",
      url: "https://www.philstar.com/headlines/2026/08/28/2552345/p72-trillion-budget-bill-2027-filed",
      publisher: "Philippine Star",
      excerpt:
        "28 Aug 2026: Philstar reports the House appropriations chair filed HB 10858, the 2027 General Appropriations Bill, and describes the spending plan as worth P7.2 trillion. The bill is the legislative equivalent of the 2027 NEP. Treat that peso figure as news reporting of the filed bill, not as the enrolled GAA.",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "prior-gaa-process",
      kind: "prior_attempt",
      title: "Each year's GAA is a new statute; this pack does not pin a 2026 GAA RA number",
      publisher: "Congress of the Philippines",
      excerpt:
        "The controlling instrument for FY 2027 spending will be whatever General Appropriations Act Congress enrolls. A 2026 GAA republic-act number is not pinned here. Cite hearing pages and the Constitution's appropriations rules. Do not invent an RA number.",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-congress-dbm",
      kind: "jurisdiction",
      title: "House originates the GAB; Senate amends; DBM administers the enacted GAA",
      excerpt:
        "Article VI puts appropriation bills in the House. The Committee on Appropriations is already hearing FY 2027 agency proposals against HB 10858 as spoken on hearing pages. DBM administers whatever GAA is enacted. Frontline agencies (DOH, DICT, others) live with utilization and catch-up if Congress writes numbers the agencies cannot spend.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-as-spoken",
      kind: "constraint",
      title: "Hearing figures stay as spoken; do not invent a GAA peso total",
      excerpt:
        "ASR and topic summaries mix 'billion dollars', spaced years ('20 26 GAA'), and rounded billions. Repeat a figure only if you cite the hearing page or the Philstar filing report. Do not clean those lines into a fake official GAA table. Do not invent unique-site flood or health peso totals that are not on a pack source.",
    }),
    el({
      source_id: "constraint-not-a-vote",
      kind: "constraint",
      title: "This is a thread, not a referendum",
      excerpt: "Agree/disagree-shaped questions are still not a poll. No % agreed. No verdict widget.",
    }),
    el({
      source_id: "constraint-no-unsourced-persons",
      kind: "constraint",
      title: "No unsourced allegations about named people",
      excerpt:
        "You can talk about HB 10858, NEP vs GAA, and utilization as spoken. Do not accuse named persons of crimes without a pack source.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-utilization-before-augmentation",
      kind: "open_question",
      title: "Should Congress write catch-up / augmentation before agencies show they can spend last year's money?",
      excerpt:
        "Unresolved. DOH and DICT hearings both spent time on utilization, unobligated balances, and wish lists. The cheapest public check is the hearing record plus agency catch-up tables the chairs already asked for.",
    }),
    el({
      source_id: "q-hearing-record-in-the-gaa",
      kind: "open_question",
      title: "What from the hearing pages actually gets pinned in the enrolled GAA?",
      excerpt:
        "Unresolved. Special provisions (zero-balance billing expansion was said to need one) and unique-site / utilization annexes are the mechanism fight. This pack does not decide the enrolled text.",
    }),
  ],
});

export const FY_2027_BUDGET_ISSUE = {
  slug: "fy-2027-budget",
  title_en:
    "2027 Budget: House is already hearing HB 10858. What should Congress pin in the GAA before passage — utilization and the hearing record, or just the agency totals as spoken?",
  title_fil:
    "Badyet 2027: naririnig na ng House ang HB 10858. Ano ang dapat i-pin ng Congress sa GAA — utilization at hearing record, o yung agency totals as spoken?",
  question:
    "House Committee on Appropriations is already hearing the FY 2027 National Expenditure Program. Philstar reports HB 10858 as the 2027 General Appropriations Bill (a P7.2 trillion spending plan as reported — that is news, not an enrolled table). DOH and DICT hearing pages (7 Sep 2026) show utilization fights, catch-up asks, and figures as spoken. What should Congress actually pin in the GAA before passage: agency utilization and the public hearing record, or just the headline totals? Not a poll — name the mechanism. Do not invent a peso total that is not on a hearing page or the filing report.",
  category: "budget",
  jurisdiction: ["PH-national"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
  special_topic: true,
};
