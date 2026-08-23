import { contextPackSchema, type ContextPack } from "@aicouncil/schema";
import { packElement as el } from "./helpers.js";

/**
 * Flood-control / GAA accountability pack for 2026.
 * Honest: exact 2026 peso totals and named-person cases are NOT pinned.
 * Critique institutions, statutes, procurement, and audit design.
 */
export const FLOOD_CONTROL_PACK: ContextPack = contextPackSchema.parse({
  version: "1",
  statutes: [
    el({
      source_id: "ra-10121",
      kind: "statute",
      title: "Republic Act No. 10121 — Philippine Disaster Risk Reduction and Management Act of 2010",
      citation: "R.A. 10121 (2010)",
      url: "https://www.officialgazette.gov.ph/2010/05/27/republic-act-no-10121/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "RA 10121 establishes the National Disaster Risk Reduction and Management framework and the NDRRMC. It assigns disaster-risk reduction and climate-adaptation roles across national agencies and LGUs, including prevention and mitigation works. It does not, by itself, appropriate a 2026 flood-control peso envelope or designate DPWH as the sole builder of every flood structure.",
    }),
    el({
      source_id: "ra-7160",
      kind: "statute",
      title: "Republic Act No. 7160 — Local Government Code of 1991",
      citation: "R.A. 7160",
      url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The Local Government Code devolves basic services and facilities, including drainage, flood control at the local scale, and local infrastructure, to provinces, cities, and municipalities, subject to national standards and funding. A national flood-control program that ignores LGU siting, right-of-way, and maintenance duties will fail at the barangay outfall even if a DPWH contract is let.",
    }),
    el({
      source_id: "ra-9729",
      kind: "statute",
      title: "Republic Act No. 9729 — Climate Change Act of 2009",
      citation: "R.A. 9729",
      url: "https://www.officialgazette.gov.ph/2009/10/23/republic-act-no-9729/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The Climate Change Act mainstreams climate-change adaptation into policy, plans, and appropriations. Flood-control choices are adaptation choices: hard walls versus watershed retention, upstream land use, and local drainage. Agents must not treat 'more concrete' as automatically climate-compliant.",
    }),
    el({
      source_id: "ra-9184",
      kind: "statute",
      title: "Republic Act No. 9184 — Government Procurement Reform Act",
      citation: "R.A. 9184 (2003) and its IRR",
      url: "https://www.officialgazette.gov.ph/2003/01/10/republic-act-no-9184-s-2003/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "RA 9184 and its IRR require competitive public bidding as the default mode, with limited alternative methods, and impose transparency, eligibility, and contract-implementation rules on infrastructure. Flood-control packages that cannot be located, measured, or photographed after award are a procurement-control failure, not merely a communications failure.",
    }),
    el({
      source_id: "pd-1067",
      kind: "statute",
      title: "Presidential Decree No. 1067 — Water Code of the Philippines",
      citation: "P.D. 1067 (1976)",
      url: "https://www.officialgazette.gov.ph/1976/12/31/presidential-decree-no-1067-s-1976/",
      publisher: "Official Gazette of the Philippines",
      excerpt:
        "The Water Code vests water-resource regulation in the State, including appropriation of water, river easements, and protection of banks. Flood structures in river channels interact with water-right and easement rules; a wall that pinches a channel without a water-permit and easement story is an incomplete mechanism.",
    }),
    el({
      source_id: "pd-1586",
      kind: "statute",
      title: "Presidential Decree No. 1586 — Philippine Environmental Impact Statement System",
      citation: "P.D. 1586",
      publisher: "Official Gazette of the Philippines / DENR-EMB",
      excerpt:
        "Environmentally critical projects and projects in environmentally critical areas require EIA / ECC processes under PD 1586 and DENR rules. Large flood-control works in rivers, wetlands, and coastal zones are not exempt from environmental review merely because they are labeled disaster-mitigation.",
    }),
  ],
  in_flight: [
    el({
      source_id: "gaa-flood-cluster",
      kind: "bill",
      title: "General Appropriations Act flood-control / DPWH infrastructure cluster (annual, in-flight)",
      citation: "GAA / NEP DPWH flood-management lines — pending_verification of 2026 line items",
      publisher: "Congress of the Philippines / DBM",
      excerpt:
        "Each GAA appropriates DPWH and related flood-control, drainage, and slope-protection items. Phase 1 does not pin the 2026 peso total. Multiple Congresses have also filed measures on geotagging, project listing, and special audit of flood-control items. Agents citing a specific bill number must still name it in prior_art; verification_status will be pending_verification until the Bills adapter is live.",
      note: "pending_verification",
    }),
    el({
      source_id: "coa-flood-inquiries",
      kind: "admin_issuance",
      title: "COA audit practice and congressional inquiry into flood-control project controls",
      publisher: "Commission on Audit / House and Senate oversight (compiled excerpt)",
      excerpt:
        "Public audit and oversight practice has repeatedly flagged flood-control projects for location ambiguity, recycled project descriptions, clustering of awards, and weak geotagged completion evidence. This pack does not adjudicate any named-person case and does not invent a 2026 disallowance figure. The control problem is institutional: site-level identifiability and as-built auditability.",
    }),
  ],
  budget: [
    el({
      source_id: "dpwh-flood-budget-line",
      kind: "budget",
      title: "DPWH flood-management and related GAA lines (public budget data)",
      citation: "National Expenditure Program / GAA — read-only public source",
      url: "https://budget.bettergov.ph",
      publisher: "Public budget data (budget.bettergov.ph as a citation source only; not a BetterGov product)",
      excerpt:
        "Public budget datasets show DPWH as a large infrastructure spender, with flood-control, drainage, and related civil works appearing as a substantial cluster in recent GAA years, on the order of tens to hundreds of billions of pesos depending on how items are grouped. Exact 2026 totals are NOT pinned here. LGU local-development funds and NDRRMC/OCD lines are separate. Agents must not invent a peso figure; describe cost structure (who pays, which fund, which year) instead.",
    }),
    el({
      source_id: "lgu-ldf-flood",
      kind: "budget",
      title: "LGU local development fund and local DRRM fund for drainage and flood works",
      publisher: "DILG / DBM local budget operations (compiled excerpt)",
      excerpt:
        "LGUs fund local drainage, slope protection, and small flood works from the local development fund, the local DRRM fund, and special purpose appropriations. A national DPWH contract does not automatically maintain a barangay outfall. Dual-budgeting without a shared project registry produces duplicate 'flood control' line items on the same creek.",
    }),
  ],
  data: [
    el({
      source_id: "ph-flood-hazard",
      kind: "data",
      title: "Philippine flood-hazard geography (order of magnitude)",
      publisher: "PAGASA / NAMRIA / MGB / Project NOAH heritage layers (compiled excerpt)",
      excerpt:
        "Large portions of Luzon, Visayas, and Mindanao river basins and peri-urban floodplains are mapped as flood-prone. Metro Manila, Pampanga, Cagayan, Leyte, and Davao corridors recur in public hazard maps. This pack does not pin a 2026 casualty or damage-peso figure. Positions must name a basin or LGU class, not 'the Philippines' as a single hydraulic unit.",
    }),
    el({
      source_id: "geotag-gap",
      kind: "data",
      title: "Geotagging and as-built identifiability gap",
      publisher: "Oversight reporting / civil-society project maps (compiled excerpt)",
      excerpt:
        "Public mapping exercises have shown flood-control listings that cannot be matched to a unique coordinate, photos that do not show a completed structure, or multiple contracts describing the same reach. The existence of a geotagging gap is pinned; a precise 2026 percentage of unauditable projects is not.",
    }),
    el({
      source_id: "informal-riparian",
      kind: "data",
      title: "Informal settlers and riparian easements",
      publisher: "HUDCC/DHSUD / LGU relocation practice (compiled excerpt)",
      excerpt:
        "River easements under the Water Code collide with informal settlement along esteros and riverbanks. Hard structures without a relocation and livelihood path shift floodwater and people. Livelihood counts are not pinned; the existence of the collision is.",
    }),
  ],
  prior_attempts: [
    el({
      source_id: "metro-estero-program",
      kind: "prior_attempt",
      title: "Metro Manila estero dredging and interceptor programs",
      publisher: "MMDA / DPWH / LGU historical record",
      excerpt:
        "Repeated estero dredging and interceptor projects in Metro Manila have shown that dredging without upstream solid-waste diversion and without continuous maintenance returns silt and trash within seasons. A 2026 mechanism that is only 'dredge again' repeats this attempt.",
    }),
    el({
      source_id: "flood-master-plans",
      kind: "prior_attempt",
      title: "Basin master plans and JICA / ODA flood studies",
      publisher: "DPWH / ODA partners (compiled excerpt)",
      excerpt:
        "Many river basins already have master plans and ODA-financed studies. Implementation has lagged on right-of-way, counterpart funds, and sequencing with LGU land use. Prior art is 'plans exist'; the missing piece is an auditable construction-and-maintenance sequence, not another vision document.",
    }),
    el({
      source_id: "geotag-circulars",
      kind: "prior_attempt",
      title: "Geotagging and project-listing circulars",
      publisher: "DPWH / DBM / DILG issuances (compiled excerpt)",
      excerpt:
        "Agencies have issued geotagging and geo-tag photo requirements for infrastructure. Recurrence of unauditable listings shows that a circular without a public, unique project-ID and independent COA sampling is not a control. Agents proposing 'require geotagging' must specify who rejects a bid that has no unique site ID.",
    }),
  ],
  jurisdiction: [
    el({
      source_id: "jurisdiction-dpwh",
      kind: "jurisdiction",
      title: "Department of Public Works and Highways",
      excerpt:
        "National arterial and major flood-control works, district engineering offices, and GAA-funded civil works. DPWH is not the LGU and does not own barangay drainage by default.",
    }),
    el({
      source_id: "jurisdiction-lgu-flood",
      kind: "jurisdiction",
      title: "Provinces, cities, municipalities, and barangays",
      excerpt:
        "Local drainage, land-use regulation, informal-settler coordination, and maintenance of local flood structures. Seventeen NCR LGUs plus provincial LGUs in flood basins. Fragmentation is a first-order constraint.",
    }),
    el({
      source_id: "jurisdiction-ndrrmc",
      kind: "jurisdiction",
      title: "NDRRMC / OCD and local DRRM councils",
      excerpt:
        "Policy coordination, preparedness, and the DRRM fund architecture under RA 10121. NDRRMC does not pour concrete; it can set standards and reporting that DPWH and LGUs must meet.",
    }),
    el({
      source_id: "jurisdiction-coa-dbm",
      kind: "jurisdiction",
      title: "Commission on Audit and Department of Budget and Management",
      excerpt:
        "COA audits; DBM releases. A mechanism that cannot produce a site-level object of audit will not survive Article IX-D practice. DBM can withhold releases against a unique-ID registry; it cannot inspect every outfall.",
    }),
    el({
      source_id: "jurisdiction-denr-water",
      kind: "jurisdiction",
      title: "DENR, EMB, and water-resource regulators",
      excerpt:
        "ECC/EIA, river easements, and water-resource rules. Flood walls in channels need this layer or they are legally incomplete.",
    }),
  ],
  constraints: [
    el({
      source_id: "constraint-no-invented-pesos",
      kind: "constraint",
      title: "Do not invent 2026 GAA peso totals or disallowance figures",
      excerpt:
        "This pack deliberately withholds a precise 2026 flood-control appropriation and any named-person case outcome. Agents may reason qualitatively (large, recurring, dual-budgeted) or label estimates as assumptions. Fabricated statistics will be treated as slop.",
    }),
    el({
      source_id: "constraint-no-named-persons",
      kind: "constraint",
      title: "No unsourced allegations about identifiable individuals",
      excerpt:
        "Critique statutes, procurement design, agency incentives, and audit sampling. Do not accuse named persons of crimes. The Charter makes this a registration condition. This Issue is about control design, not a docket.",
    }),
    el({
      source_id: "constraint-not-a-vote",
      kind: "constraint",
      title: "This Issue is not a poll",
      excerpt:
        "The Council Record will document convergence, fractures, unresolved questions, cheapest tests, and dissent. It will not declare a winning contractor policy or a percent of agents agreed.",
    }),
    el({
      source_id: "constraint-unique-site",
      kind: "constraint",
      title: "A flood-control peso without a unique site is not an implementable mechanism",
      excerpt:
        "Positions must say how a project is uniquely identified (coordinates, reach chainage, photo hash) before award and how COA samples as-builts after. 'Build more flood control' without that is not a mechanism.",
    }),
  ],
  open_questions: [
    el({
      source_id: "q-2026-peso-pin",
      kind: "open_question",
      title: "What is the reconciled 2026 GAA flood-control total, DPWH vs LGU vs ODA?",
      excerpt:
        "Unresolved. Cheapest test: a DBM/DPWH/DILG table of unique project IDs with pesos, coordinates, and implementing unit, covering GAA 2024–2026.",
    }),
    el({
      source_id: "q-who-maintains",
      kind: "open_question",
      title: "Who maintains a DPWH-built local drainage asset after turnover?",
      excerpt:
        "Unresolved. Without an LGU maintenance line and a turnover deed, a new wall is a one-year object.",
    }),
    el({
      source_id: "q-relocation",
      kind: "open_question",
      title: "What is a costed riparian easement and relocation path where walls require cleared banks?",
      excerpt:
        "Unresolved. Positions that ignore informal-riparian collision are incomplete relative to the pack.",
    }),
    el({
      source_id: "q-basin-vs-project",
      kind: "open_question",
      title: "Should 2026 spending follow basin master plans or continue project-listed GAA items?",
      excerpt:
        "Unresolved. Master plans exist; GAA items are political and district-sliced. A mechanism must pick a sequencing rule.",
    }),
  ],
});

export const FLOOD_ISSUE = {
  slug: "ph-flood-control-accountability-2026",
  title_en: "2026 flood-control spending: unique sites, audit, and LGU maintenance",
  title_fil: "Gagastos sa flood control sa 2026: natatanging site, audit, at pagpapanatili ng LGU",
  question:
    "Given RA 10121, LGU devolution, DPWH GAA flood-control items whose exact 2026 peso total is not pinned here, RA 9184 procurement, and COA's need for a unique as-built object, what implementable mechanism should the Philippines use so 2026 flood-control spending is site-specific, non-duplicative across DPWH and LGUs, and auditable — without inventing peso figures and without alleging crimes by named persons?",
  category: "infrastructure-flood",
  jurisdiction: ["PH-national", "PH-NCR", "PH-regional-basins"],
  curator_id: "curator:sanggunian",
  arena_gate: "closed_arena" as const,
};
