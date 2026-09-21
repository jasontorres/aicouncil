import { articleParagraphs, cleanNewsMarkdown, looksLikeChrome } from "../lib/news-text.js";
import type { ScrapedPage } from "./firecrawl.js";
import {
  choiceAnswer,
  TYPESAFE_MODEL,
  type TypeSafeAnswer,
  type TypeSafePort,
  type TypeSafeQuestion,
} from "./typesafe.js";

export const MAX_SUMMARIZED_PAGES = 8;
export const MAX_SUMMARY_PARAS = 5;
/** Choice confidence below ~0.5 means the lede options are still competing; keep the code fallback. */
export const LEDE_CONFIDENCE_MIN = 0.5;

function fallbackSummary(markdown: string, title: string): string {
  const cleaned = cleanNewsMarkdown(markdown || title);
  const lede = cleaned.lede && !/^by:?\s/i.test(cleaned.lede) ? cleaned.lede : "";
  return lede.slice(0, 500);
}

export function scrapeSummaryQuestions(
  pages: { paragraphs: string[] }[],
): Record<string, TypeSafeQuestion> {
  const questions: Record<string, TypeSafeQuestion> = {};
  const n = Math.min(pages.length, MAX_SUMMARIZED_PAGES);
  for (let i = 0; i < n; i += 1) {
    const paras = pages[i]?.paragraphs ?? [];
    const criteria: Record<string, string> = {
      none: "None of these paragraphs is the article lede. The page is chrome, a cookie wall, or nav.",
    };
    paras.forEach((_p, pi) => {
      criteria[`p${pi}`] =
        `\`pages[${i}].paragraphs[${pi}]\` is the article lede — the sentence that states what happened.`;
    });
    questions[`s${i}_lede`] = {
      type: "choice",
      instructions: `Which candidate in \`pages[${i}].paragraphs\` is the article lede for pages[${i}]? Pick the first sentence that states the news. Use \`pages[${i}].title\` and \`pages[${i}].paragraphs\`. If none fits, pick none.`,
      criteria,
    };
  }
  return questions;
}

export function applyScrapeSummaries(
  pages: ScrapedPage[],
  answers: Record<string, TypeSafeAnswer>,
): ScrapedPage[] {
  return pages.map((page, i) => {
    const paras = articleParagraphs(`${page.title}\n\n${page.markdown || page.excerpt}`, MAX_SUMMARY_PARAS);
    const picked = choiceAnswer(answers, `s${i}_lede`);
    const confidence = picked && Number.isFinite(picked.confidence) ? picked.confidence : 0;
    if (picked?.choice && picked.choice !== "none" && confidence >= LEDE_CONFIDENCE_MIN) {
      const idx = Number(picked.choice.replace(/^p/, ""));
      const para = Number.isFinite(idx) ? paras[idx] : undefined;
      if (para && !looksLikeChrome(para)) {
        return { ...page, summary: para.slice(0, 500) };
      }
    }
    return { ...page, summary: page.summary || fallbackSummary(page.markdown || page.excerpt, page.title) };
  });
}

export async function summarizeScrapedPages(port: TypeSafePort, pages: ScrapedPage[]): Promise<ScrapedPage[]> {
  const withFallback = pages.map((page) => ({
    ...page,
    summary: page.summary || fallbackSummary(page.markdown || page.excerpt, page.title),
  }));
  if (!port.configured || pages.length === 0) return withFallback;

  const needJudge = withFallback.filter((page) => {
    const paras = articleParagraphs(`${page.title}\n\n${page.markdown || page.excerpt}`, MAX_SUMMARY_PARAS);
    return paras.length >= 2;
  });
  if (needJudge.length === 0) return withFallback;

  const batch = needJudge.slice(0, MAX_SUMMARIZED_PAGES);
  const state = {
    task: "Select the article lede from cleaned candidate paragraphs. Code copies the chosen span. Do not write a new sentence.",
    pages: batch.map((page, i) => ({
      id: `s${i}`,
      title: page.title,
      url: page.url,
      paragraphs: articleParagraphs(`${page.title}\n\n${page.markdown || page.excerpt}`, MAX_SUMMARY_PARAS),
    })),
  };

  try {
    const result = await port.systemOne({
      state,
      questions: scrapeSummaryQuestions(state.pages),
      model: TYPESAFE_MODEL,
    });
    const judged = applyScrapeSummaries(batch, result.answers);
    const byUrl = new Map(judged.map((page) => [page.url, page.summary]));
    return withFallback.map((page) => ({ ...page, summary: byUrl.get(page.url) ?? page.summary }));
  } catch {
    return withFallback;
  }
}
