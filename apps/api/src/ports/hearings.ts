import { hearingApiUrl, hearingTopicsApiUrl, hearingsApiUrl } from "@aicouncil/schema";
import { llmError } from "../lib/errors.js";

type FetchLike = typeof fetch;

export type HearingListItem = {
  video_id: string;
  title: string;
  agency: string | null;
  fiscal_year: string | null;
  hearing_date: string | null;
  page_url: string;
  youtube_url: string | null;
  topic_count: number | null;
  has_transcript: boolean;
};

export type HearingTopic = {
  index: number;
  topic: string;
  status: string | null;
  summary: string;
  url: string | null;
};

export type HearingDetail = HearingListItem & {
  topics: HearingTopic[];
  links: Record<string, string>;
};

export type HearingsPort = {
  list(input: { fy?: string; agency?: string; q?: string; limit?: number }): Promise<{
    hearings: HearingListItem[];
    notice: string;
  }>;
  get(videoId: string): Promise<{ hearing: HearingDetail; notice: string }>;
};

const NOTICE =
  "House Committee on Appropriations hearings via budget.bettergov.ph. Put page_url on pack.budget or pack.data. Figures in summaries are as spoken in the hearing — do not invent peso totals. legal_basis still uses pack source_id values.";

export function createHearingsPort(opts: { fetchImpl?: FetchLike } = {}): HearingsPort {
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function getJson(url: string): Promise<Record<string, unknown>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetchImpl(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Sanggunian/AICouncil.ph (hearings lookup)",
        },
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        json = { error: text.slice(0, 400) };
      }
      if (!res.ok) {
        throw llmError(
          res.status === 404 ? 404 : res.status >= 500 ? 503 : 502,
          "hearings_error",
          res.status === 404
            ? "No hearing matched that video_id. GET https://budget.bettergov.ph/api/v1/hearings."
            : "budget.bettergov.ph hearings API did not respond. Retry later. Do not invent hearing text.",
        );
      }
      return json;
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) throw err;
      throw llmError(
        503,
        "hearings_error",
        "budget.bettergov.ph hearings API did not respond. Retry later. Do not invent hearing text.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async list(input) {
      const json = await getJson(
        hearingsApiUrl({ fy: input.fy, agency: input.agency, q: input.q, limit: input.limit ?? 30 }),
      );
      const rows = asArray(json.data);
      const hearings = rows.map(rowToListItem).filter((h) => h.video_id);
      return { hearings, notice: NOTICE };
    },

    async get(videoId) {
      const id = videoId.trim();
      if (!id) {
        throw llmError(422, "missing_video_id", "get_hearing requires video_id (YouTube id on the hearing page).");
      }
      const [detail, topicsJson] = await Promise.all([
        getJson(hearingApiUrl(id)),
        getJson(hearingTopicsApiUrl(id)).catch(() => ({ data: [] })),
      ]);
      const data = (detail.data && typeof detail.data === "object" ? detail.data : detail) as Record<string, unknown>;
      const base = rowToListItem(data);
      const topicRows = asArray(topicsJson.data);
      const nested = asArray(data.topics);
      const topics = (topicRows.length ? topicRows : nested).map(rowToTopic);
      const links = data.links && typeof data.links === "object" ? (data.links as Record<string, string>) : {};
      return { hearing: { ...base, topics, links }, notice: NOTICE };
    },
  };
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

function rowToListItem(row: Record<string, unknown>): HearingListItem {
  const nested = row.hearing && typeof row.hearing === "object" ? (row.hearing as Record<string, unknown>) : row;
  const videoId = stringish(nested.video_id || nested.slug);
  return {
    video_id: videoId,
    title: stringish(nested.title) || videoId,
    agency: stringish(nested.agency) || null,
    fiscal_year: stringish(nested.fiscal_year) || null,
    hearing_date: stringish(nested.hearing_date || nested.published_at) || null,
    page_url: stringish(nested.page_url) || (videoId ? `https://budget.bettergov.ph/hearings/${videoId}` : ""),
    youtube_url: stringish(nested.youtube_url || nested.url) || null,
    topic_count: numberish(nested.topic_count),
    has_transcript: Boolean(nested.has_transcript),
  };
}

function rowToTopic(row: Record<string, unknown>): HearingTopic {
  const summary = stringish(row.summary);
  return {
    index: Number(row.index ?? 0),
    topic: stringish(row.topic) || "Untitled topic",
    status: stringish(row.status) || null,
    summary: summary.length > 800 ? `${summary.slice(0, 797)}...` : summary,
    url: stringish(row.url) || null,
  };
}

function stringish(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberish(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
