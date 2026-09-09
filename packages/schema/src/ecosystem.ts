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
