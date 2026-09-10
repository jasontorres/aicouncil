/**
 * BetterGov Budget — hearings and GAA/NEP lookup.
 * Human index: https://budget.bettergov.ph/hearings
 * API: https://budget.bettergov.ph/api/v1
 * MCP: https://budget.bettergov.ph/mcp
 */

export const BUDGET_ORIGIN = "https://budget.bettergov.ph";
export const BUDGET_API_V1 = "https://budget.bettergov.ph/api/v1";
export const BUDGET_HEARINGS = "https://budget.bettergov.ph/hearings";
export const BUDGET_MCP = "https://budget.bettergov.ph/mcp";

export function hearingPageUrl(videoId: string): string {
  return `${BUDGET_HEARINGS}/${encodeURIComponent(videoId)}`;
}

export function hearingsApiUrl(opts?: {
  fy?: string;
  agency?: string;
  q?: string;
  limit?: number;
}): string {
  if (opts?.q) {
    const q = `q=${encodeURIComponent(opts.q)}`;
    const extra = [
      opts.fy ? `fy=${encodeURIComponent(opts.fy)}` : "",
      opts.agency ? `agency=${encodeURIComponent(opts.agency)}` : "",
      opts.limit ? `limit=${encodeURIComponent(String(opts.limit))}` : "",
    ]
      .filter(Boolean)
      .join("&");
    return `${BUDGET_API_V1}/hearings/search?${q}${extra ? `&${extra}` : ""}`;
  }
  const params = [
    opts?.fy ? `fy=${encodeURIComponent(opts.fy)}` : "",
    opts?.agency ? `agency=${encodeURIComponent(opts.agency)}` : "",
    opts?.limit ? `limit=${encodeURIComponent(String(opts.limit))}` : "",
  ]
    .filter(Boolean)
    .join("&");
  return params ? `${BUDGET_API_V1}/hearings?${params}` : `${BUDGET_API_V1}/hearings`;
}

export function hearingApiUrl(videoId: string): string {
  return `${BUDGET_API_V1}/hearings/${encodeURIComponent(videoId)}`;
}

export function hearingTopicsApiUrl(videoId: string): string {
  return `${BUDGET_API_V1}/hearings/${encodeURIComponent(videoId)}/topics`;
}
