import { contextPackSchema, type ContextPack } from "@aicouncil/schema";
import { packElement, PACK_RETRIEVED_SPECIAL } from "./helpers.js";

function el(
  partial: Omit<Parameters<typeof packElement>[0], "retrieved_at">,
): ReturnType<typeof packElement> {
  return packElement({ ...partial, retrieved_at: PACK_RETRIEVED_SPECIAL });
}

/**
 * Operator-asked Special Topic: CADENA Act (SBN-1506), Senate-passed, pending in the House.
 */
export const CADENA_ACT_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "const-art-vi-appropriations",
      kind: "statute",
      title: "1987 Constitution, Article VI — the power of the purse stays with Congress",
      citation: "Const. art. VI, §§ 24–25, 29",
      url: "https://www.officialgazette.gov.ph/constitutions/1987-constitution/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "Appropriation bills originate in the House; no money is paid out of the Treasury except in pursuance of an appropriation made by law. A digital budget portal does not replace that. CADENA, if enacted, would sit on top of the GAA process: disclosure of budget documents, not a substitute appropriations statute.",
    }),
    el({
      source_id: "const-art-iii-sec-7",
      kind: "statute",
      title: "1987 Constitution, Article III, Section 7 — right to information on matters of public concern",
      citation: "Const. art. III, § 7",
      url: "https://www.officialgazette.gov.ph/constitutions/1987-constitution/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The right of the people to information on matters of public concern is recognized. Access to official records and to documents pertaining to official acts, transactions, or decisions, as well as to government research data used as basis for policy development, is afforded the citizen, subject to limitations provided by law. CADENA is one proposed statutory vehicle for budget-document access. This pack does not treat a Senate-passed bill as already that law.",
    }),
  ],
  in_flight: [
    el({
      source_id: "sb-1506",
      kind: "bill",
      title: "Senate Bill No. 1506 — CADENA Act (Citizen Access and Disclosure of Expenditures for National Accountability)",
      citation: "SBN-1506 (filed 12 Nov 2025); Senate third-reading copy dated 15 Dec 2025",
      publisher: "BatasWatch / Senate of the Philippines",
      url: "https://bills.juris.ph/bills/senate/sbn-1506",
      excerpt:
        "BatasWatch (id senate-20-sbn1506): short title CADENA ACT. Long title: an act mandating the full disclosure of government transactions through the establishment of a digital budget portal to enhance transparency, accountability, and public participation in the Philippine budget process. Principal author Bam Aquino. Filed 2025-11-12. Status at pack retrieve: PENDING IN THE HOUSE OF REPRESENTATIVES. Senate committee: Science and Technology; secondary Finance. Analysis of the third-reading copy: a tamper-proof portal for national-government budget documents from planning to spending; NBTAC; distributed ledger; open API; data sovereignty (hosting under Philippine government control, with a temporary overseas 'Data Embassy' only during pilot phases); coverage of national government departments, GOCCs and subsidiaries; LGUs excluded but encouraged to adopt similar mechanisms; agencies to record and publish budget-process documents (planning, legislation, execution, procurement, contract management) to facilitate public scrutiny; administrative penalties, and criminal penalties if mandated documents stay unpublished. Inquirer (15 Dec 2025): Senate approved SBN-1506 17-0-0 on third and final reading; the Act would establish a National Budget Blockchain System registering project allocations, disbursements, and procurement as Digital Public Records. Do not invent a House bill number. A CADENA funding line is not specified in this pack.",
      note: "pending_verification",
    }),
  ],
  budget: [],
  data: [
    el({
      source_id: "inquirer-cadena-2025-12-15",
      kind: "data",
      title: "Inquirer: Senate OKs CADENA 17-0; National Budget Blockchain System",
      url: "https://newsinfo.inquirer.net/2155356/senate-oks-bill-allowing-tamper-proof-blockchain-for-budget-records",
      publisher: "Philippine Daily Inquirer",
      excerpt:
        "15 Dec 2025: The Senate passed the Citizen Access and Disclosure of Expenditures for National Accountability (Cadena) Act, SBN-1506, 17-0-0 on third and final reading. The report says the Act would establish a National Budget Blockchain System to record and monitor all stages of the national budget process, with allocations, disbursements, and procurement registered as Digital Public Records. Aquino: once enacted, people could see where government-funded pesos go. The report also says the President had directed Congress to prioritize the Cadena Act among four measures. Enacted status is not claimed here — BatasWatch still lists the measure as pending in the House.",
    }),
    el({
      source_id: "philstar-cadena-2025-12-16",
      kind: "data",
      title: "Philstar: Senate passes CADENA; Aquino asks the House to pass it",
      url: "https://www.philstar.com/headlines/2025/12/16/2494490/senate-passes-cadena-act-put-budget-govt-records-blockchain",
      publisher: "Philippine Star",
      excerpt:
        "16 Dec 2025: Philstar reports Senate approval of CADENA, requiring agencies to upload and maintain budget-related documents on a digital platform secured through blockchain. Aquino urged the House to pass it. That is a Senate-passed bill waiting on the House, not an enacted RA.",
    }),
    el({
      source_id: "hearing-dict-fy2027-not-cadena-markup",
      kind: "data",
      title: "DICT FY 2027 hearing is not a CADENA markup (search hit only)",
      url: "https://budget.bettergov.ph/hearings/8gJ5lyWjQm8",
      publisher: "budget.bettergov.ph / House of Representatives",
      excerpt:
        "A CADENA search on budget.bettergov.ph returns the 7 Sep 2026 DICT FY 2027 appropriations hearing (video_id 8gJ5lyWjQm8). The topic list on that page is DICT budget items (utilization, Free Wi-Fi, data sovereignty, eGov). It does not title a CADENA Act markup. Do not cite this hearing as House action on SBN-1506.",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "sbn-1330-predecessor",
      kind: "prior_attempt",
      title: "SBN-1330 was an earlier CADENA / blockchain-budget filing (Nov 2025 reporting)",
      citation: "SBN-1330 (as reported 4 Nov 2025)",
      publisher: "Philippine Daily Inquirer",
      url: "https://newsinfo.inquirer.net/2134007/aquino-warns-penalties-await-violators-of-proposed-blockchain-bill",
      excerpt:
        "4 Nov 2025 Inquirer: Aquino was then pushing Senate Bill No. 1330 under the CADENA name — a secure, tamper-proof digital public ledger for government transaction documents, with penalties for officials who fail to disclose or upload false information. The Senate-passed vehicle at pack retrieve is SBN-1506, not 1330. Do not pin a peso appropriation from the predecessor bill as CADENA's cost. SBN-1506's funding line is not specified in this pack.",
      note: "pending_verification",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-house-cadena",
      kind: "jurisdiction",
      title: "Senate has passed SBN-1506; the House still has to act",
      excerpt:
        "BatasWatch status is pending in the House of Representatives. Senate referral was Science and Technology plus Finance. Implementing a portal would sit with national government agencies, with DICT/NPC named in the data-sovereignty section of the third-reading analysis. LGUs are excluded from mandatory coverage but encouraged to follow. Congress still has to enroll a law and fund whatever platform the enrolled text requires.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-no-house-bill-number",
      kind: "constraint",
      title: "No House bill number is published in this pack",
      excerpt:
        "Do not invent a House counterpart number. BatasWatch lists SBN-1506 as pending in the House. If a House bill number is not here, say that figure is not published.",
    }),
    el({
      source_id: "constraint-no-invented-funding",
      kind: "constraint",
      title: "Do not invent a CADENA peso appropriation",
      excerpt:
        "SBN-1506's funding line is not specified here. Do not reuse a predecessor-bill peso figure as CADENA's cost. Cost talk is structure (portal, ledger, agency upload duty, DICT/NPC supervision) unless a pack source states a number.",
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
        "You can name the bill, the Senate vote, and the House bottleneck. Do not accuse named persons of crimes without a pack source.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-house-vehicle",
      kind: "open_question",
      title: "What is the House vehicle, and does it keep the Senate's ledger and penalty design?",
      excerpt:
        "Unresolved. BatasWatch has SBN-1506 pending in the House. No House bill number is published here. A cheapest test is a House committee referral and a numbered counterpart, or a substitution bill.",
    }),
    el({
      source_id: "q-who-runs-the-ledger",
      kind: "open_question",
      title: "Who hosts the portal, who pays, and what happens if agencies miss the seven-day upload?",
      excerpt:
        "Unresolved in the enrolled sense. Analysis of the third-reading copy names data sovereignty, a possible temporary overseas Data Embassy in a pilot, NBTAC, and administrative then criminal penalties for unpublished mandated documents. Operating agency and GAA line are not pinned here.",
    }),
  ],
});

export const CADENA_ACT_ISSUE = {
  slug: "cadena-act",
  title_en:
    "The Cadena Act (SBN-1506) passed the Senate 17-0 and sits in the House. Pass the digital budget portal as written, or wait for a House bill number and a funding line?",
  title_fil:
    "CADENA Act (SBN-1506): pasado na sa Senado 17-0, pending sa House. Ipasa ang digital budget portal as written, o hintayin ang House bill number at funding line?",
  question:
    "SBN-1506 (Aquino), the CADENA Act, passed the Senate 17-0 on 15 Dec 2025. BatasWatch still lists it as pending in the House. The Senate-passed text (as analyzed) would force national-government budget documents onto a digital portal with a ledger, open API, data-sovereignty rules, and penalties for late or false uploads. No House bill number is published here, and a CADENA funding line is not specified. Should the House pass that portal as written, or hold until a House vehicle and a funding line exist? Not a poll — name the mechanism. Do not invent a House bill number or a peso total.",
  category: "budget-transparency",
  jurisdiction: ["PH-national"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
  special_topic: true,
};
