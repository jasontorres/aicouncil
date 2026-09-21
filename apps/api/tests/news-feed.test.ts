import { describe, expect, test } from "vitest";
import { parseFeedFilter, storyMatchesFeed, type QueryReader } from "../src/lib/news-feed.js";
import type { NewsWireStory } from "../src/services/curator.js";

function req(search: string): QueryReader {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    query: (name) => params.get(name) ?? undefined,
    queries: (name) => params.getAll(name),
  };
}

const senate: NewsWireStory = {
  url: "https://www.inquirer.net/news/senate-flood-hearing",
  title: "Senate reopens flood-control hearing",
  snippet: "Senators ask DPWH.",
  domain: "inquirer.net",
  source: "news",
  query: "Philippines news",
  seen_at: "2026-09-21T00:00:00.000Z",
  desk: {
    topic: "politics",
    topic_confidence: 0.8,
    tags: ["politics", "climate"],
    notability: 1.7,
    notable: true,
    social: true,
    social_score: 0.88,
    clip_source: "title",
    clip: "Senate reopens flood-control hearing",
  },
  judgment: {
    worthy: 0.9,
    disposition: "publish_candidate",
    disposition_confidence: 0.8,
    actionability: 1.7,
    actionability_confidence: 0.7,
    recommend: true,
    uncertain: false,
    rank: 1,
  },
};

const comelec: NewsWireStory = {
  ...senate,
  url: "https://www.rappler.com/philippines/comelec-calendar",
  title: "Comelec says November barangay polls still possible",
  seen_at: "2026-08-23T00:00:00.000Z",
  desk: {
    topic: "politics",
    topic_confidence: 0.8,
    tags: ["politics"],
    notability: 1.9,
    notable: true,
    social: true,
    social_score: 0.91,
    clip_source: "title",
    clip: "Comelec says November barangay polls still possible",
  },
};

describe("news feed filters", () => {
  test("parses repeated and comma-separated topic/tag values", () => {
    const filter = parseFeedFilter(req("topic=politics,tech&tag=climate&tag=tech&notable=1&day=2026-09-20"));
    expect(filter.topics).toEqual(["politics", "tech"]);
    expect(filter.tags).toEqual(["climate", "tech"]);
    expect(filter.notable).toBe(true);
    expect(filter.day).toBe("2026-09-20");
  });

  test("compounds desk topic, extra tag, and day", () => {
    const climatePolitics = parseFeedFilter(req("topic=politics&tag=climate"));
    expect(storyMatchesFeed(senate, climatePolitics)).toBe(true);
    expect(storyMatchesFeed(comelec, climatePolitics)).toBe(false);

    const august = parseFeedFilter(req("day=2026-08-23"));
    expect(storyMatchesFeed(comelec, august)).toBe(true);
    expect(storyMatchesFeed(senate, august)).toBe(false);

    const category = parseFeedFilter(req("category=politics&tag=climate"));
    expect(storyMatchesFeed(senate, category)).toBe(true);
    expect(storyMatchesFeed(comelec, category)).toBe(false);
  });
});
