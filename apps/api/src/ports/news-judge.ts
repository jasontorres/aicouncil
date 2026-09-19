import type { NewsHit } from "./firecrawl.js";
import {
  choiceAnswer,
  noulAnswer,
  scoreAnswer,
  type TypeSafeAnswer,
  type TypeSafePort,
  type TypeSafeQuestion,
  TYPESAFE_MODEL,
} from "./typesafe.js";

/** Cap judged stories so one System One call stays inside Jev's shared token budget. */
export const MAX_JUDGED_HITS = 24;

/** Noul near 0.5 is yes≈no, not medium intensity. Require a lean toward yes. */
export const WORTHY_MIN = 0.55;
/** Score 0–2; 0.8 is past "no instrument in the headline". */
export const ACTIONABILITY_MIN = 0.8;
/** Low Choice confidence means several dispositions are still plausible. */
export const DISPOSITION_CONFIDENCE_MIN = 0.4;

export const NEWS_DISPOSITIONS = [
  "publish_candidate",
  "skip_no_instrument",
  "skip_not_ph_policy",
  "skip_vibes",
  "skip_crime_without_policy",
] as const;

export type NewsDisposition = (typeof NEWS_DISPOSITIONS)[number];

export type NewsJudgment = {
  worthy: number;
  disposition: NewsDisposition;
  disposition_confidence: number;
  actionability: number;
  recommend: boolean;
  uncertain: boolean;
  rank: number;
};

export type JudgedNewsHit = NewsHit & { judgment?: NewsJudgment };

export type NewsJudgeResult = {
  hits: JudgedNewsHit[];
  configured: boolean;
  model: string | null;
  judged: number;
  error?: string;
};

const DISPOSITION_CRITERIA: Record<NewsDisposition, string> = {
  publish_candidate:
    "A Philippine public-policy controversy with a bill, statute, circular, Comelec action, budget line, site, appointment, or prohibition a council can argue.",
  skip_no_instrument:
    "Policy-adjacent news, but the title and snippet name no instrument or agency decision a curator could put in a Context Pack.",
  skip_not_ph_policy:
    "Not Philippine public policy: foreign story with no PH mechanism, markets-only, weather with no agency action.",
  skip_vibes: "Celebrity, sports, lifestyle, entertainment, or mood piece with no government decision.",
  skip_crime_without_policy:
    "Crime, arrest, or scandal that does not name a controlling law, bill, circular, or agency process.",
};

const ACTIONABILITY_LEVELS = [
  "The title and snippet name no agency, bill, circular, or decision a curator could cite.",
  "A curator could guess an instrument, but would need a scrape to confirm it exists.",
  "The title or snippet already names a bill, RA, circular, Comelec action, or agency decision a council can argue.",
];

export function worthyQuestion(index: number): TypeSafeQuestion {
  return {
    type: "noul",
    instructions: `Does stories[${index}] describe a live Philippine public-policy controversy a council could take a side on — a bill, circular, appointment, site, fund, or prohibition — rather than sports, celebrity, vibes, or crime with no named instrument? Use stories[${index}].title and stories[${index}].snippet.`,
    criteria: {
      true: "A government decision or named instrument is in play in the Philippines.",
      false: "No council-ready controversy; skip or it is not PH public policy.",
    },
  };
}

export function dispositionQuestion(index: number): TypeSafeQuestion {
  return {
    type: "choice",
    instructions: `How should a Sanggunian curator treat stories[${index}] given stories[${index}].title and stories[${index}].snippet? Pick one disposition. Sanggunian Issues need a decision question and a named instrument.`,
    criteria: DISPOSITION_CRITERIA,
  };
}

export function actionabilityQuestion(index: number): TypeSafeQuestion {
  return {
    type: "score",
    instructions: `From stories[${index}].title and stories[${index}].snippet only, how readily could a curator name a controlling instrument without inventing a bill number?`,
    criteria: ACTIONABILITY_LEVELS,
  };
}

export function newsJudgeQuestions(count: number): Record<string, TypeSafeQuestion> {
  const questions: Record<string, TypeSafeQuestion> = {};
  const n = Math.min(count, MAX_JUDGED_HITS);
  for (let i = 0; i < n; i += 1) {
    questions[`s${i}_worthy`] = worthyQuestion(i);
    questions[`s${i}_disposition`] = dispositionQuestion(i);
    questions[`s${i}_actionability`] = actionabilityQuestion(i);
  }
  return questions;
}

export function newsJudgeState(hits: NewsHit[]): { arena: string; skip_rules: string; stories: Record<string, string>[] } {
  return {
    arena:
      "Sanggunian is a Philippine public-policy deliberation arena, not a vote and not a news dump. An Issue needs a decision question and a named instrument (RA, bill, circular, Comelec resolution, agency action).",
    skip_rules:
      "Skip celebrity, sports, vibes-only, unnamed-person crime allegations, polls, and stories with no mechanism. Do not invent bill numbers.",
    stories: hits.slice(0, MAX_JUDGED_HITS).map((h, i) => ({
      id: `s${i}`,
      title: h.title,
      snippet: h.snippet,
      url: h.url,
      query: h.query,
    })),
  };
}

export function isNewsDisposition(value: string): value is NewsDisposition {
  return (NEWS_DISPOSITIONS as readonly string[]).includes(value);
}

export function composeNewsJudgment(
  answers: Record<string, TypeSafeAnswer>,
  index: number,
): NewsJudgment | undefined {
  const worthy = noulAnswer(answers, `s${index}_worthy`);
  const disposition = choiceAnswer(answers, `s${index}_disposition`);
  const actionability = scoreAnswer(answers, `s${index}_actionability`);
  if (worthy === undefined || !disposition || actionability === undefined) return undefined;
  const label = isNewsDisposition(disposition.choice) ? disposition.choice : "skip_no_instrument";
  const confidence = Number.isFinite(disposition.confidence) ? disposition.confidence : 0;
  const recommend =
    label === "publish_candidate" &&
    worthy >= WORTHY_MIN &&
    actionability >= ACTIONABILITY_MIN &&
    confidence >= DISPOSITION_CONFIDENCE_MIN;
  const uncertain =
    !recommend &&
    (label === "publish_candidate" || (worthy >= 0.45 && worthy < WORTHY_MIN));
  const rank =
    worthy * 0.5 +
    (actionability / 2) * 0.25 +
    (label === "publish_candidate" ? 0.25 : 0);
  return {
    worthy,
    disposition: label,
    disposition_confidence: confidence,
    actionability,
    recommend,
    uncertain,
    rank,
  };
}

export function applyNewsJudgments(
  hits: NewsHit[],
  answers: Record<string, TypeSafeAnswer>,
): JudgedNewsHit[] {
  const judged: JudgedNewsHit[] = hits.map((hit, i) => {
    if (i >= MAX_JUDGED_HITS) return { ...hit };
    const judgment = composeNewsJudgment(answers, i);
    return judgment ? { ...hit, judgment } : { ...hit };
  });
  return sortJudgedHits(judged);
}

export function sortJudgedHits(hits: JudgedNewsHit[]): JudgedNewsHit[] {
  return hits
    .map((hit, index) => ({ hit, index }))
    .sort((a, b) => {
      const ja = a.hit.judgment;
      const jb = b.hit.judgment;
      const rec = Number(Boolean(jb?.recommend)) - Number(Boolean(ja?.recommend));
      if (rec !== 0) return rec;
      const unc = Number(Boolean(jb?.uncertain)) - Number(Boolean(ja?.uncertain));
      if (unc !== 0) return unc;
      const rank = (jb?.rank ?? -1) - (ja?.rank ?? -1);
      if (rank !== 0) return rank;
      return a.index - b.index;
    })
    .map((row) => row.hit);
}

export async function judgeNewsHits(port: TypeSafePort, hits: NewsHit[]): Promise<NewsJudgeResult> {
  if (!port.configured || hits.length === 0) {
    return { hits: hits.map((h) => ({ ...h })), configured: port.configured, model: null, judged: 0 };
  }
  try {
    const result = await port.systemOne({
      state: newsJudgeState(hits),
      questions: newsJudgeQuestions(hits.length),
      model: TYPESAFE_MODEL,
    });
    const judgedHits = applyNewsJudgments(hits, result.answers);
    return {
      hits: judgedHits,
      configured: true,
      model: result.model,
      judged: Math.min(hits.length, MAX_JUDGED_HITS),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "TypeSafe ranking failed.";
    return {
      hits: hits.map((h) => ({ ...h })),
      configured: true,
      model: null,
      judged: 0,
      error: message,
    };
  }
}
