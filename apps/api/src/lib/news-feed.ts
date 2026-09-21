import { isAgendaDate, manilaDate } from "./manila.js";
import {
  NEWS_TAGS,
  NEWS_TOPICS,
  isNewsTag,
  isNewsTopic,
  isSocialPost,
  socialPostCopy,
  type NewsTag,
  type NewsTopic,
} from "../ports/news-judge.js";
import type { NewsWire, NewsWireStory } from "../services/curator.js";

export type QueryReader = {
  query(name: string): string | undefined;
  queries?(name: string): string[] | undefined;
};

export type NewsFeedFilter = {
  topics: NewsTopic[];
  categories: NewsTopic[];
  tags: NewsTag[];
  notable: boolean;
  social: boolean;
  council: boolean;
  day?: string;
  q: string;
};

export type PublicNewsStory = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  date?: string;
  seen_at: string;
  category: NewsTopic | null;
  topic: NewsTopic | null;
  tags: NewsTag[];
  notable: boolean;
  social: boolean;
  social_score: number | null;
  council: boolean;
  clip: string;
  headline: string;
  clip_source: string | null;
};

export type PublicSocialPost = Omit<PublicNewsStory, "snippet"> & {
  body: string;
};

function splitValues(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    for (const part of value.split(/[+,]/)) {
      const token = part.trim().toLowerCase();
      if (token) out.push(token);
    }
  }
  return [...new Set(out)];
}

export function queryValues(req: QueryReader, ...names: string[]): string[] {
  const raw: string[] = [];
  for (const name of names) {
    const many = req.queries?.(name) ?? [];
    raw.push(...many);
    const one = req.query(name);
    if (one && !many.includes(one)) raw.push(one);
  }
  return splitValues(raw);
}

export function parseFlag(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export function parseFeedFilter(req: QueryReader): NewsFeedFilter {
  const topics = queryValues(req, "topic", "topics").filter(isNewsTopic);
  const categories = queryValues(req, "category", "categories").filter(isNewsTopic);
  const tags = queryValues(req, "tag", "tags").filter(isNewsTag);
  const dayRaw = req.query("day");
  return {
    topics,
    categories,
    tags,
    notable: parseFlag(req.query("notable")),
    social: parseFlag(req.query("social")),
    council: parseFlag(req.query("council")),
    day: isAgendaDate(dayRaw) ? dayRaw : undefined,
    q: (req.query("q") ?? "").trim(),
  };
}

export function storyMatchesFeed(story: NewsWireStory, filter: NewsFeedFilter): boolean {
  const desk = story.desk;
  const topic = desk?.topic;
  const tags = desk?.tags ?? [];
  if (filter.categories.length && (!topic || !filter.categories.includes(topic))) return false;
  if (filter.topics.length) {
    const hit = (topic && filter.topics.includes(topic)) || tags.some((tag) => filter.topics.includes(tag));
    if (!hit) return false;
  }
  if (filter.tags.length && !filter.tags.every((tag) => tags.includes(tag))) return false;
  if (filter.notable && !desk?.notable) return false;
  if (filter.social && !isSocialPost(desk)) return false;
  if (filter.council && !story.judgment?.recommend) return false;
  if (filter.day && manilaDate(story.seen_at) !== filter.day) return false;
  if (filter.q) {
    const hay = `${story.title} ${story.snippet} ${story.domain} ${desk?.clip ?? ""}`.toLowerCase();
    if (!hay.includes(filter.q.toLowerCase())) return false;
  }
  return true;
}

export function publicNewsStory(story: NewsWireStory): PublicNewsStory {
  return {
    url: story.url,
    title: story.title,
    snippet: story.snippet,
    domain: story.domain,
    date: story.date,
    seen_at: story.seen_at,
    category: story.desk?.topic ?? null,
    topic: story.desk?.topic ?? null,
    tags: story.desk?.tags ?? [],
    notable: story.desk?.notable ?? false,
    social: isSocialPost(story.desk),
    social_score: story.desk?.social_score ?? null,
    council: story.judgment?.recommend ?? false,
    clip: story.desk?.clip || story.title,
    headline: story.desk?.clip || story.title,
    clip_source: story.desk?.clip_source ?? null,
  };
}

export function publicSocialPost(story: NewsWireStory): PublicSocialPost {
  const base = publicNewsStory(story);
  return {
    url: base.url,
    title: base.title,
    domain: base.domain,
    date: base.date,
    seen_at: base.seen_at,
    category: base.category,
    topic: base.topic,
    tags: base.tags,
    notable: base.notable,
    social: true,
    social_score: base.social_score,
    council: base.council,
    clip: base.clip,
    headline: base.headline,
    clip_source: base.clip_source,
    body: socialPostCopy(story),
  };
}

function dayCountsFor(stories: NewsWireStory[]): { date: string; stories: number }[] {
  const counts = new Map<string, number>();
  for (const story of stories) {
    const date = manilaDate(story.seen_at);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([date, n]) => ({ date, stories: n }));
}

export function newsJsonBody(wire: NewsWire, filter: NewsFeedFilter) {
  const stories = wire.stories.filter((story) => storyMatchesFeed(story, filter));
  return {
    timezone: wire.timezone,
    today: wire.today,
    filters: filter,
    topics: [...NEWS_TOPICS],
    tags: [...NEWS_TAGS],
    day_counts: dayCountsFor(stories),
    stories: stories.map(publicNewsStory),
    scrapes: wire.scrapes
      .filter((page) => !filter.day || manilaDate(page.retrieved_at) === filter.day)
      .map((page) => ({
        url: page.url,
        title: page.title,
        summary: page.summary || null,
        excerpt: page.excerpt,
        via: page.via,
        retrieved_at: page.retrieved_at,
      })),
    notice:
      "Classified scan hits for public clips and social posts, plus cleaned scrapes with a verbatim lede. Not Issues. Not a vote. Compound filters: ?topic=politics&tag=climate&notable=1&day=2026-09-20. Repeat or comma-separate topic/tag. Social posts: GET /socials.json.",
  };
}

export function socialsJsonBody(wire: NewsWire, filter: NewsFeedFilter) {
  const posts = wire.stories.filter((story) => isSocialPost(story.desk) && storyMatchesFeed(story, filter));
  return {
    timezone: wire.timezone,
    today: wire.today,
    filters: filter,
    topics: [...NEWS_TOPICS],
    tags: [...NEWS_TAGS],
    day_counts: dayCountsFor(posts),
    posts: posts.map(publicSocialPost),
    notice:
      "Jev-selected social posts from saved headlines. The body is a verbatim headline plus the source URL. Tags and category are on each post. Compound filters: ?topic=politics&tag=tech&day=2026-09-20. Not Issues. Not a vote.",
  };
}
