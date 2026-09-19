/** Strip page-chrome markdown so /news shows article text, not logos and blob: images. */

const IMAGE_AS_LINK = /\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g;
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MD_LINK = /\[([^\]]+)\]\([^)]*\)/g;
const DANGLING_LINK = /\]\([^)]*\)/g;
const BLOB_URL = /blob:https?:\/\/\S+/gi;
const HTML_TAG = /<\/?[^>]+>/g;

const CHROME_LINE =
  /^(follow us:?|subscribe(?: to our daily newsletter)?|your subscription (could not be saved|has been successful)\.?|please try again\.?|by providing an email address\.?|i agree(?: to the)?|terms of use|privacy policy|privacy notice|submit|find out more|i agree|we use cookies\b.*|cookie(s)? policy|advertise|newsletter|latest news stories|headlines|open accessibility tools|accessibility tools|npc seal|what's new|whats new)$/i;

const NAV_LABELS = new Set([
  "news",
  "global nation",
  "business",
  "lifestyle",
  "entertainment",
  "technology",
  "sports",
  "opinion",
  "headlines",
  "metro",
  "regions",
  "nation",
  "world",
  "cdn",
  "cdn digital",
  "newsletter",
  "bandera",
  "preen",
  "videos",
  "advertise",
  "usa & canada",
  "scout ph",
  "noli soli",
  "pop",
  "f&b",
  "esports",
  "multisport",
  "mobility",
  "project rebound",
  "usa",
  "canada",
]);

export type CleanedNewsText = {
  title: string;
  lede: string;
  body: string;
  paragraphs: string[];
};

export function looksLikeChrome(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/!\[[^\]]*\]\(/.test(trimmed)) return true;
  if (/blob:https?:\/\//i.test(trimmed)) return true;
  if (/\]\([^)]+\)/.test(trimmed)) return true;
  if (/^!\[/.test(trimmed) || /^\]\(/.test(trimmed)) return true;
  return false;
}

export function cleanNewsMarkdown(raw: string): CleanedNewsText {
  let text = raw.replace(/\r/g, "");
  text = text.replace(IMAGE_AS_LINK, "\n");
  text = text.replace(IMAGE, "\n");
  text = text.replace(MD_LINK, "$1");
  text = text.replace(DANGLING_LINK, " ");
  text = text.replace(BLOB_URL, " ");
  text = text.replace(HTML_TAG, " ");
  text = text.replace(/https?:\/\/\S*(scorecardresearch|facebook\.com\/tr|googletagmanager)\S*/gi, " ");
  text = text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\s*#{1,6}\s+/g, "\n");
  text = text.replace(/\|[ \t-]*\|[ \t-|]*/g, "\n");
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\*+\s*/, "").replace(/\*+/g, "").trim())
    .filter(Boolean)
    .filter((line) => !CHROME_LINE.test(line))
    .filter((line) => !isNavDump(line))
    .filter((line) => !isDateOnly(line));

  const paragraphs = collapseShortLines(lines)
    .flatMap(splitBylineParagraph)
    .filter((p) => p.length >= 12);
  const title = pickTitle(paragraphs);
  const withoutTitle = paragraphs.filter((p) => p !== title && splitHeadline(p) !== title);
  const lede = pickLede(withoutTitle, title);
  const body = [title, ...withoutTitle].filter(Boolean).join("\n\n");
  return { title, lede, body, paragraphs: withoutTitle.length ? withoutTitle : paragraphs };
}

export function articleParagraphs(text: string, max = 6): string[] {
  const cleaned = cleanNewsMarkdown(text);
  const pool = cleaned.paragraphs.filter((p) => p.length >= 40 && p.length <= 600);
  if (pool.length) return pool.slice(0, max);
  if (cleaned.lede) return [cleaned.lede];
  return [];
}

export function presentNewsText(title: string, excerpt: string, summary?: string | null): {
  title: string;
  summary: string;
  excerpt: string;
} {
  const source = looksLikeChrome(excerpt) || looksLikeChrome(title) ? `${title}\n\n${excerpt}` : excerpt;
  const cleaned = cleanNewsMarkdown(source || excerpt || title);
  const resolvedTitle =
    (!looksLikeChrome(title) && title.trim().length > 8 ? title.trim() : "") || cleaned.title || title.trim();
  const resolvedSummary =
    (summary && !looksLikeChrome(summary) && !/^by:?\s/i.test(summary.trim()) ? summary.trim() : "") ||
    (cleaned.lede && !/^by:?\s/i.test(cleaned.lede) ? cleaned.lede : "");
  let resolvedExcerpt = cleaned.body || cleaned.lede || "";
  if (resolvedTitle && resolvedExcerpt.startsWith(resolvedTitle)) {
    resolvedExcerpt = resolvedExcerpt.slice(resolvedTitle.length).replace(/^\s+/, "").trim();
  }
  return {
    title: resolvedTitle.slice(0, 300),
    summary: resolvedSummary.slice(0, 500),
    excerpt: resolvedExcerpt.slice(0, 8000),
  };
}

function pickTitle(paragraphs: string[]): string {
  for (const p of paragraphs) {
    const headline = splitHeadline(p);
    if (headline.length < 12 || headline.length > 180) continue;
    if (/[.!?]{1}[\s"]/.test(headline) && headline.length > 90) continue;
    if (/^by:?\s/i.test(headline)) continue;
    return headline;
  }
  return splitHeadline(paragraphs[0] ?? "").slice(0, 180);
}

function splitHeadline(text: string): string {
  return (text.split(/\s+By:\s+/i)[0] ?? text).trim();
}

function pickLede(paragraphs: string[], title: string): string {
  for (const p of paragraphs) {
    if (p === title || splitHeadline(p) === title) continue;
    if (p.length < 20) continue;
    return p.length > 500 ? `${p.slice(0, 497)}...` : p;
  }
  return "";
}

function splitBylineParagraph(p: string): string[] {
  const m = p.match(/^(.*?)(?:\s+By:\s+)(.+)$/i);
  if (!m?.[1] || !m[2] || m[1].trim().length < 12) return [p];
  return [m[1].trim(), `By: ${m[2].trim()}`];
}

function isNavDump(line: string): boolean {
  const parts = line
    .toLowerCase()
    .split(/[/,·|]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 4 && parts.filter((p) => NAV_LABELS.has(p)).length >= 4) return true;
  const words = line.toLowerCase().split(/\s+/);
  if (words.length >= 8) {
    const hits = words.filter((w, i) => {
      const bigram = `${w} ${words[i + 1] ?? ""}`.trim();
      return NAV_LABELS.has(w) || NAV_LABELS.has(bigram);
    }).length;
    if (hits >= 6) return true;
  }
  return false;
}

function isDateOnly(line: string): boolean {
  return /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$/i.test(
    line,
  );
}

function collapseShortLines(lines: string[]): string[] {
  const out: string[] = [];
  let buf = "";
  const flush = () => {
    const trimmed = buf.replace(/\s+/g, " ").trim();
    if (trimmed) out.push(trimmed);
    buf = "";
  };
  for (const line of lines) {
    if (line.length >= 80) {
      flush();
      out.push(line);
      continue;
    }
    const kicker = line.length < 60 && !/[.!?]"?$/.test(line) && !/^by:?\s/i.test(line);
    if (kicker) {
      flush();
      out.push(line);
      continue;
    }
    if (buf && buf.length + line.length < 160) buf = `${buf} ${line}`;
    else {
      flush();
      buf = line;
    }
  }
  flush();
  return out;
}
