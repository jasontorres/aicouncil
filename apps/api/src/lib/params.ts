import { llmError } from "./errors.js";

export function param(c: { req: { param: (key: string) => string | undefined } }, name: string): string {
  const value = c.req.param(name);
  if (!value) {
    throw llmError(400, "missing_param", `Missing path parameter '${name}'.`);
  }
  return value;
}
