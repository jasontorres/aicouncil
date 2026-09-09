/**
 * Sanggunian looks up Philippine statutes, cases, and bills inside the
 * BetterGov / Juris ecosystem — not lawphil.net.
 *
 * Statutes & jurisprudence: https://juris.ph/api
 * Bills (BatasWatch): https://bills.juris.ph/api
 */

export const JURIS_ORIGIN = "https://juris.ph";
export const JURIS_API = "https://juris.ph/api";
export const JURIS_API_V1 = "https://juris.ph/api/v1";
export const BILLS_ORIGIN = "https://bills.juris.ph";
export const BILLS_API = "https://bills.juris.ph/api";

/** Human pages for seed / live pack links we already resolved. */
const JURIS_PAGES: Record<string, string> = {
  "https://lawphil.net/statutes/repacts/ra2025/ra_12232_2025.html":
    "https://juris.ph/republic-act/e2938329-8505-57cf-b9c9-ec80c21bb89c",
  "https://lawphil.net/statutes/repacts/ra1992/ra_7227_1992.html":
    "https://juris.ph/republic-act/eeb279a0-0f47-5e6e-b31a-4bb5f4d94164",
  "https://lawphil.net/judjuris/juri2023/jun2023/gr_263590_2023.html":
    "https://juris.ph/case/0003c0a3-1b35-564f-a975-6276c08e6cc3",
  "https://www.officialgazette.gov.ph/2010/05/27/republic-act-no-10121":
    "https://juris.ph/republic-act/979152e2-1fdd-57fd-8eeb-739ff9bd95a6",
  "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160":
    "https://juris.ph/republic-act/f4ffef63-9f73-5004-b3e2-8eb73472207d",
  "https://www.officialgazette.gov.ph/2003/01/10/republic-act-no-9184-s-2003":
    "https://juris.ph/republic-act/1a959654-dbd1-5b0d-990a-40ec0b78aa5c",
  "https://www.officialgazette.gov.ph/2001/01/26/republic-act-no-9003-s-2001":
    "https://juris.ph/republic-act/090e97b9-9a4e-5e04-b53f-3cb16694adcc",
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function jurisSearchUrl(dataset: "jurisprudence" | "republic-acts", q: string): string {
  return `${JURIS_API_V1}/search?dataset=${dataset}&q=${encodeURIComponent(q)}`;
}

export function billsMeasuresUrl(opts: { q: string; chamber?: "senate" | "house" }): string {
  const chamber = opts.chamber ? `&chamber=${encodeURIComponent(opts.chamber)}` : "";
  return `${BILLS_API}/measures?q=${encodeURIComponent(opts.q)}${chamber}`;
}

export function billsPageUrl(opts: { chamber: "senate" | "house"; number: string }): string {
  return opts.chamber === "senate"
    ? `${BILLS_ORIGIN}/bills/senate/sbn-${opts.number}`
    : `${BILLS_ORIGIN}/bills/house/hb${opts.number}`;
}

/** Resolved statute/case pages keyed by pack source_id (live D1 may still store a news URL). */
const PAGES_BY_SOURCE_ID: Record<string, string> = {
  "ra-12232": "https://juris.ph/republic-act/e2938329-8505-57cf-b9c9-ec80c21bb89c",
  "ra-7227": "https://juris.ph/republic-act/eeb279a0-0f47-5e6e-b31a-4bb5f4d94164",
  "ra-12066": "https://juris.ph/republic-act/6e6fb659-caa2-561b-aa3c-41fe69de7d99",
  "ra-10121": "https://juris.ph/republic-act/979152e2-1fdd-57fd-8eeb-739ff9bd95a6",
  "ra-7160": "https://juris.ph/republic-act/f4ffef63-9f73-5004-b3e2-8eb73472207d",
  "ra-9184": "https://juris.ph/republic-act/1a959654-dbd1-5b0d-990a-40ec0b78aa5c",
  "ra-9003": "https://juris.ph/republic-act/090e97b9-9a4e-5e04-b53f-3cb16694adcc",
  "ra-8749": "https://juris.ph/republic-act/7bf989a9-b214-5cc6-9e64-bd8f50d105f3",
  "macalintal-263590": "https://juris.ph/case/0003c0a3-1b35-564f-a975-6276c08e6cc3",
};

/** Point a stored pack URL at juris.ph / bills.juris.ph when it is still lawphil or a mapped Gazette RA. */
export function ecosystemSourceUrl(url: string | null | undefined): string | null {
  if (url == null || url === "") return null;
  const trimmed = stripTrailingSlash(url.trim());
  const mapped = JURIS_PAGES[trimmed];
  if (mapped) return mapped;
  const ra = trimmed.match(/lawphil\.net\/statutes\/repacts\/ra\d+\/ra_(\d+)_\d+\.html/i);
  if (ra?.[1]) return jurisSearchUrl("republic-acts", `RA ${ra[1]}`);
  const gr = trimmed.match(/lawphil\.net\/judjuris\/[^/]+\/[^/]+\/gr_(\d+)_/i);
  if (gr?.[1]) return jurisSearchUrl("jurisprudence", `G.R. No. ${gr[1]}`);
  return url.trim();
}

type PackUrlFields = { kind?: string; source_id?: string; url?: string | null };

/**
 * Prefer the ecosystem page for statutes, cases, and numbered bills — even when
 * the stored pack still cites a news URL.
 */
export function ecosystemElementUrl(el: PackUrlFields): string | null {
  const sourceId = el.source_id?.trim() ?? "";
  if (sourceId && PAGES_BY_SOURCE_ID[sourceId]) return PAGES_BY_SOURCE_ID[sourceId];
  if (el.kind === "bill") {
    const sb = sourceId.match(/^sb-(\d+)$/i);
    if (sb?.[1]) return billsPageUrl({ chamber: "senate", number: sb[1] });
    const hb = sourceId.match(/^hb-(\d+)$/i);
    if (hb?.[1]) return billsPageUrl({ chamber: "house", number: hb[1] });
  }
  return ecosystemSourceUrl(el.url);
}
