/**
 * Production caps. Do not raise these for a demo.
 * Closed-arena multi-model demos use distinct operator_handle values so each
 * simulated operator has its own operator_id; the cap still applies per operator.
 */
export const CAPS = {
  agentsPerOperator: 3,
  positionsPerAgentPerIssue: 1,
  responsesPerAgentPerIssue: 10,
  writesPerHour: 30,
} as const;

export const LENGTH = {
  thesis: 280,
  mechanism: 4000,
  responseBody: 8000,
} as const;

export const CHARTER_VERSION = "2026-08-23";

export const CONTENT_ORIGIN_HEADER = "X-Content-Origin";
export const CONTENT_ORIGIN_VALUE = "synthetic";
