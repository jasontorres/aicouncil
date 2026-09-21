import { llmError } from "../lib/errors.js";

export const TYPESAFE_BASE = "https://api.typesafe.ai";
export const TYPESAFE_MODEL = "jev-latest";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Instructions may be a string, object, or array (live TypeSafe API). */
export type QuestionInstructions = JsonValue;

export type NoulQuestion = {
  type: "noul";
  instructions: QuestionInstructions;
  criteria?: { true?: string; false?: string };
};

export type ChoiceQuestion = {
  type: "choice";
  instructions: QuestionInstructions;
  criteria: Record<string, string | null>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: QuestionInstructions;
  criteria: string[];
};

export type TypeSafeQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type NoulAnswer = { type: "noul"; noul: number };

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type TypeSafeAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type SystemOneRequest = {
  state: JsonValue;
  questions: Record<string, TypeSafeQuestion>;
  model?: string;
};

export type SystemOneResult = {
  model: string;
  answers: Record<string, TypeSafeAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type TypeSafePort = {
  configured: boolean;
  systemOne(input: SystemOneRequest): Promise<SystemOneResult>;
};

type FetchLike = typeof fetch;

export function createTypeSafePort(opts: {
  apiKey?: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
}): TypeSafePort {
  const apiKey = opts.apiKey?.trim();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = (opts.baseUrl ?? TYPESAFE_BASE).replace(/\/$/, "");

  function unconfigured(): never {
    throw llmError(
      503,
      "typesafe_unconfigured",
      "TypeSafe ranking needs TYPESAFE_API_KEY on the server. The curator agent does not hold that key. Scan still returns news hits.",
    );
  }

  return {
    configured: Boolean(apiKey),

    async systemOne(input) {
      if (!apiKey) unconfigured();
      const body = {
        state: input.state,
        model: input.model ?? TYPESAFE_MODEL,
        questions: input.questions,
      };
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 45_000);
        try {
          const res = await fetchImpl(`${base}/v1/systemone`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
          const text = await res.text();
          let json: unknown = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { error: text.slice(0, 400) };
          }
          if (res.status === 429 || res.status === 529) {
            const wait = retryAfterMs(res, attempt);
            await sleep(wait);
            lastError = llmError(429, "typesafe_error", typesafePublicMessage(res.status), {
              retry_after_seconds: Math.ceil(wait / 1000),
            });
            continue;
          }
          if (!res.ok) {
            throw llmError(
              res.status >= 500 ? 503 : 502,
              "typesafe_error",
              typesafePublicMessage(res.status),
            );
          }
          return normalizeResult(json);
        } catch (err) {
          if (err && typeof err === "object" && "status" in err) throw err;
          lastError = err;
          if (attempt < 2) {
            await sleep(400 * 2 ** attempt);
            continue;
          }
          throw llmError(
            503,
            "typesafe_error",
            "TypeSafe did not respond. Ranking is skipped. Do not invent news to fill the gap.",
          );
        } finally {
          clearTimeout(timer);
        }
      }
      if (lastError && typeof lastError === "object" && "status" in lastError) throw lastError;
      throw llmError(503, "typesafe_error", "TypeSafe did not respond. Ranking is skipped.");
    },
  };
}

function normalizeResult(json: unknown): SystemOneResult {
  if (!json || typeof json !== "object") {
    throw llmError(502, "typesafe_error", "TypeSafe returned an empty body.");
  }
  const row = json as Record<string, unknown>;
  const answers = row.answers;
  if (!answers || typeof answers !== "object") {
    throw llmError(502, "typesafe_error", "TypeSafe returned no answers.");
  }
  return {
    model: typeof row.model === "string" ? row.model : TYPESAFE_MODEL,
    answers: answers as Record<string, TypeSafeAnswer>,
    usage:
      row.usage && typeof row.usage === "object"
        ? (row.usage as { input_tokens?: number; output_tokens?: number })
        : undefined,
  };
}

function typesafePublicMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "TypeSafe rejected the server key. An operator must rotate TYPESAFE_API_KEY. Do not paste keys into Issues.";
  }
  if (status === 422) return "TypeSafe rejected the ranking request. Scan hits are returned unranked.";
  if (status === 429) return "TypeSafe rate-limited the server. Ranking is skipped for this scan.";
  if (status === 529) return "TypeSafe is overloaded. Ranking is skipped for this scan.";
  return "TypeSafe ranking failed. Scan hits are returned unranked.";
}

function retryAfterMs(res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 8_000);
  return Math.min(400 * 2 ** attempt, 4_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function noulAnswer(answers: Record<string, TypeSafeAnswer>, id: string): number | undefined {
  const a = answers[id];
  return a && a.type === "noul" && Number.isFinite(a.noul) ? a.noul : undefined;
}

export function choiceAnswer(answers: Record<string, TypeSafeAnswer>, id: string): ChoiceAnswer | undefined {
  const a = answers[id];
  return a && a.type === "choice" ? a : undefined;
}

export function scoreAnswer(answers: Record<string, TypeSafeAnswer>, id: string): ScoreAnswer | undefined {
  const a = answers[id];
  return a && a.type === "score" && Number.isFinite(a.score) ? a : undefined;
}
