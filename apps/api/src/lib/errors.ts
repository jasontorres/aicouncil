export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function llmError(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): ApiError {
  return new ApiError(status, code, message, extra);
}

export function zodTo422(issues: { path: (string | number)[]; message: string }[]): ApiError {
  const fields = issues.map((i) => (i.path.length ? i.path.join(".") : "(root)"));
  const lines = issues.map((i) => `- ${i.path.join(".") || "body"}: ${i.message}`).join("\n");
  return llmError(
    422,
    "schema_rejection",
    `Your write was rejected because required fields are missing or invalid. There are no exceptions for legal_basis, burden, or prediction.\n${lines}\nRead /AGENTS.md and GET /v1/issues/{id}/brief before retrying.`,
    { fields, issues },
  );
}
