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
/** Score confidence below ~0.5 is an even spread across levels, not a medium rating. */
export const ACTIONABILITY_CONFIDENCE_MIN = 0.5;
/** Score 0–2; 0.8 is past "not worth a public clip". */
export const NOTABILITY_MIN = 0.8;
/** Do not mark notable when the notability Score is a spread across levels. */
export const NOTABILITY_CONFIDENCE_MIN = 0.5;
/** Independent tags may co-occur; require a clear yes. */
export const TAG_MIN = 0.65;
/** Noul near 0.5 is yes≈no. A social post needs a clear yes. */
export const SOCIAL_MIN = 0.65;

export const NEWS_DISPOSITIONS = [
  "publish_candidate",
  "skip_no_instrument",
  "skip_not_ph_policy",
  "skip_vibes",
  "skip_crime_without_policy",
] as const;

export type NewsDisposition = (typeof NEWS_DISPOSITIONS)[number];

export const NEWS_TOPICS = [
  "politics",
  "tech",
  "economy",
  "climate",
  "health",
  "justice",
  "foreign",
  "culture",
  "sports",
  "other",
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

/** Tags that can apply in addition to the primary desk. */
export const NEWS_TAGS = ["politics", "tech", "economy", "climate"] as const;

export type NewsTag = (typeof NEWS_TAGS)[number];

export const CLIP_SOURCES = ["title", "snippet_lead"] as const;

export type ClipSource = (typeof CLIP_SOURCES)[number];

export type NewsJudgment = {
  worthy: number;
  disposition: NewsDisposition;
  disposition_confidence: number;
  actionability: number;
  actionability_confidence: number;
  recommend: boolean;
  uncertain: boolean;
  rank: number;
};

export type NewsDesk = {
  topic: NewsTopic;
  topic_confidence: number;
  tags: NewsTag[];
  notability: number;
  notable: boolean;
  /** Set when Jev answered the social-post Noul. Absent on older stored desks. */
  social?: boolean;
  social_score?: number;
  clip_source: ClipSource;
  clip: string;
};

export type JudgedNewsHit = NewsHit & { judgment?: NewsJudgment; desk?: NewsDesk };

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

const TOPIC_CRITERIA: Record<NewsTopic, string> = {
  politics: "Elections, Congress, Malacañang, Comelec, parties, appointments, or local government.",
  tech: "Semiconductors, platforms, AI, telecom, cybersecurity, or digital infrastructure.",
  economy: "Jobs, inflation, BSP, fiscal policy, trade, business regulation, or markets with a PH stake.",
  climate: "Disasters, energy, DENR, emissions, or environmental regulation.",
  health: "DOH, hospitals, disease, medicines, or public health rules.",
  justice: "Courts, Ombudsman, prosecutions, police process, or rights cases.",
  foreign: "China, the US, ASEAN, treaties, diplomats, or OFW policy as foreign affairs.",
  culture: "Arts, education, media, heritage, or religion with a public stake — not celebrity gossip.",
  sports: "Athletic competition, teams, or sporting events.",
  other: "None of the desks above; routine blotter, celebrity, or filler.",
};

const TAG_CRITERIA: Record<NewsTag, { true: string; false: string }> = {
  politics: {
    true: "Elections, Congress, Malacañang, Comelec, or a government office is a substantial part of the story.",
    false: "Government is only incidental or absent.",
  },
  tech: {
    true: "Chips, platforms, AI, telecom, or digital infrastructure is a substantial part of the story.",
    false: "Technology is incidental or absent.",
  },
  economy: {
    true: "Jobs, prices, fiscal policy, trade, or business rules are a substantial part of the story.",
    false: "The economic angle is incidental or absent.",
  },
  climate: {
    true: "Disaster, energy, emissions, or environmental regulation is a substantial part of the story.",
    false: "Climate or environment is incidental or absent.",
  },
};

const NOTABILITY_LEVELS = [
  "Not worth a public clip: routine blotter, celebrity filler, or a story with no public stake.",
  "Worth a short social clip: a clear PH fact the public would share, even if it is not a council Issue.",
  "Worth a public news report: a named decision, outage, deal, disaster, or result people need to see.",
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

export function topicQuestion(index: number): TypeSafeQuestion {
  return {
    type: "choice",
    instructions: `Which news desk should own stories[${index}] given stories[${index}].title and stories[${index}].snippet? Pick the primary desk, not every related angle.`,
    criteria: TOPIC_CRITERIA,
  };
}

export function notabilityQuestion(index: number): TypeSafeQuestion {
  return {
    type: "score",
    instructions: `Should BetterGov / Sanggunian report stories[${index}] publicly as a news clip or social asset, given stories[${index}].title and stories[${index}].snippet? This is not the same as a council Issue.`,
    criteria: NOTABILITY_LEVELS,
  };
}

export function socialQuestion(index: number): TypeSafeQuestion {
  return {
    type: "noul",
    instructions: `Would a Philippine public account post stories[${index}] as a social media item, given stories[${index}].title and stories[${index}].snippet? Yes is a shareable public fact — a named decision, result, disaster, deal, outage, or score a person would tap to share. No is gossip, blotter filler, an empty headline, or a story with no hook.`,
    criteria: {
      true: "A person would share this as a standalone social post today.",
      false: "Not a social post: no hook, gossip, or filler.",
    },
  };
}

export function clipQuestion(index: number): TypeSafeQuestion {
  return {
    type: "choice",
    instructions: `Which span from stories[${index}] should a public clip use? Pick \`stories[${index}].title\` or the first sentence of \`stories[${index}].snippet\`. Code copies the chosen span. If neither is a usable news line, pick none.`,
    criteria: {
      title: `\`stories[${index}].title\` is the clearer public line.`,
      snippet_lead: `The first sentence of \`stories[${index}].snippet\` is the clearer public line.`,
      none: "Neither span is a usable public clip: empty, chrome, or not a news line.",
    },
  };
}

export function tagQuestion(index: number, tag: NewsTag): TypeSafeQuestion {
  return {
    type: "noul",
    instructions: `Does stories[${index}] substantially involve ${tag}, even if the primary desk is different? Use stories[${index}].title and stories[${index}].snippet.`,
    criteria: TAG_CRITERIA[tag],
  };
}

export function newsJudgeQuestions(count: number): Record<string, TypeSafeQuestion> {
  const questions: Record<string, TypeSafeQuestion> = {};
  const n = Math.min(count, MAX_JUDGED_HITS);
  for (let i = 0; i < n; i += 1) {
    questions[`s${i}_worthy`] = worthyQuestion(i);
    questions[`s${i}_disposition`] = dispositionQuestion(i);
    questions[`s${i}_actionability`] = actionabilityQuestion(i);
    questions[`s${i}_topic`] = topicQuestion(i);
    questions[`s${i}_notability`] = notabilityQuestion(i);
    questions[`s${i}_social`] = socialQuestion(i);
    questions[`s${i}_clip`] = clipQuestion(i);
    for (const tag of NEWS_TAGS) {
      questions[`s${i}_tag_${tag}`] = tagQuestion(i, tag);
    }
  }
  return questions;
}

export function newsJudgeState(hits: NewsHit[]): { arena: string; skip_rules: string; public_desk: string; stories: Record<string, string>[] } {
  return {
    arena:
      "Sanggunian is a Philippine public-policy deliberation arena, not a vote and not a news dump. An Issue needs a decision question and a named instrument (RA, bill, circular, Comelec resolution, agency action).",
    skip_rules:
      "For council Issues: skip celebrity, sports, vibes-only, unnamed-person crime allegations, polls, and stories with no mechanism. Do not invent bill numbers.",
    public_desk:
      "Separately, classify every story for a public news desk, whether it is notable enough to clip, and whether it is a social-media post. Sports, tech launches, and disasters can be social posts even when they are not council Issues.",
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

export function isNewsTopic(value: string): value is NewsTopic {
  return (NEWS_TOPICS as readonly string[]).includes(value);
}

export function isClipSource(value: string): value is ClipSource {
  return (CLIP_SOURCES as readonly string[]).includes(value);
}

export function snippetLead(snippet: string): string {
  const trimmed = snippet.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const sentence = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return (sentence?.[1] ?? trimmed).slice(0, 220);
}

export function clipText(hit: Pick<NewsHit, "title" | "snippet">, source: ClipSource): string {
  if (source === "snippet_lead") {
    const lead = snippetLead(hit.snippet);
    return lead || hit.title;
  }
  return hit.title;
}

export function isSocialPost(desk?: NewsDesk): boolean {
  if (!desk) return false;
  if (typeof desk.social === "boolean") return desk.social;
  return desk.notable === true;
}

/** Verbatim clip (or title) plus the source URL. Code assembles; Jev does not write a caption. */
export function socialPostCopy(story: { title: string; url: string; desk?: Pick<NewsDesk, "clip"> }): string {
  const line = (story.desk?.clip || story.title).replace(/\s+/g, " ").trim();
  return `${line}\n\n${story.url}`;
}

export function selectSocialStories<T extends { desk?: NewsDesk }>(stories: T[]): T[] {
  return stories.filter((story) => isSocialPost(story.desk));
}

export function composeNewsJudgment(
  answers: Record<string, TypeSafeAnswer>,
  index: number,
): NewsJudgment | undefined {
  const worthy = noulAnswer(answers, `s${index}_worthy`);
  const disposition = choiceAnswer(answers, `s${index}_disposition`);
  const actionability = scoreAnswer(answers, `s${index}_actionability`);
  if (worthy === undefined || !disposition || !actionability) return undefined;
  const label = isNewsDisposition(disposition.choice) ? disposition.choice : "skip_no_instrument";
  const confidence = Number.isFinite(disposition.confidence) ? disposition.confidence : 0;
  const actionabilityConfidence = Number.isFinite(actionability.confidence) ? actionability.confidence : 0;
  const recommend =
    label === "publish_candidate" &&
    worthy >= WORTHY_MIN &&
    actionability.score >= ACTIONABILITY_MIN &&
    confidence >= DISPOSITION_CONFIDENCE_MIN &&
    actionabilityConfidence >= ACTIONABILITY_CONFIDENCE_MIN;
  const uncertain =
    !recommend &&
    (label === "publish_candidate" || (worthy >= 0.45 && worthy < WORTHY_MIN));
  const rank =
    worthy * 0.5 +
    (actionability.score / 2) * 0.25 +
    (label === "publish_candidate" ? 0.25 : 0);
  return {
    worthy,
    disposition: label,
    disposition_confidence: confidence,
    actionability: actionability.score,
    actionability_confidence: actionabilityConfidence,
    recommend,
    uncertain,
    rank,
  };
}

export function composeNewsDesk(
  answers: Record<string, TypeSafeAnswer>,
  index: number,
  hit: Pick<NewsHit, "title" | "snippet">,
): NewsDesk | undefined {
  const topic = choiceAnswer(answers, `s${index}_topic`);
  const notability = scoreAnswer(answers, `s${index}_notability`);
  const clip = choiceAnswer(answers, `s${index}_clip`);
  if (!topic || !notability) return undefined;
  const topicLabel = isNewsTopic(topic.choice) ? topic.choice : "other";
  const topicConfidence = Number.isFinite(topic.confidence) ? topic.confidence : 0;
  const notabilityConfidence = Number.isFinite(notability.confidence) ? notability.confidence : 0;
  const clipSource = clip && isClipSource(clip.choice) ? clip.choice : "title";
  const tags = NEWS_TAGS.filter((tag) => {
    const n = noulAnswer(answers, `s${index}_tag_${tag}`);
    return n !== undefined && n >= TAG_MIN;
  });
  const notable = notability.score >= NOTABILITY_MIN && notabilityConfidence >= NOTABILITY_CONFIDENCE_MIN;
  const socialScore = noulAnswer(answers, `s${index}_social`);
  const clipLine = clipText(hit, clipSource);
  const social =
    socialScore !== undefined ? socialScore >= SOCIAL_MIN && Boolean(clipLine) : notable;
  return {
    topic: topicLabel,
    topic_confidence: topicConfidence,
    tags,
    notability: notability.score,
    notable,
    social,
    social_score: socialScore ?? (notable ? 0.7 : 0),
    clip_source: clipSource,
    clip: clipLine,
  };
}

export function applyNewsJudgments(
  hits: NewsHit[],
  answers: Record<string, TypeSafeAnswer>,
): JudgedNewsHit[] {
  const judged: JudgedNewsHit[] = hits.map((hit, i) => {
    if (i >= MAX_JUDGED_HITS) return { ...hit };
    const judgment = composeNewsJudgment(answers, i);
    const desk = composeNewsDesk(answers, i, hit);
    return {
      ...hit,
      ...(judgment ? { judgment } : {}),
      ...(desk ? { desk } : {}),
    };
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
      const notable = Number(Boolean(b.hit.desk?.notable)) - Number(Boolean(a.hit.desk?.notable));
      if (notable !== 0) return notable;
      const social = Number(Boolean(isSocialPost(b.hit.desk))) - Number(Boolean(isSocialPost(a.hit.desk)));
      if (social !== 0) return social;
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

/** Classify unique URLs in batches. Preserves existing fields on each hit. */
export async function judgeNewsHitBatches(
  port: TypeSafePort,
  hits: NewsHit[],
): Promise<NewsJudgeResult> {
  if (!port.configured) {
    return { hits: hits.map((h) => ({ ...h })), configured: false, model: null, judged: 0 };
  }
  if (hits.length === 0) {
    return { hits: [], configured: true, model: null, judged: 0 };
  }
  const out: JudgedNewsHit[] = [];
  let model: string | null = null;
  let judged = 0;
  for (let i = 0; i < hits.length; i += MAX_JUDGED_HITS) {
    const chunk = hits.slice(i, i + MAX_JUDGED_HITS);
    const ranked = await judgeNewsHits(port, chunk);
    if (ranked.error) {
      return {
        hits: [...out, ...chunk.map((h) => ({ ...h }))],
        configured: true,
        model,
        judged,
        error: ranked.error,
      };
    }
    out.push(...ranked.hits);
    judged += ranked.judged;
    model = ranked.model ?? model;
  }
  return { hits: out, configured: true, model, judged };
}
