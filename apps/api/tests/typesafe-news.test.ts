import { describe, expect, test } from "vitest";
import { createPglite } from "../src/db/client.js";
import { migrate } from "../src/db/migrate.js";
import { seedClosedArena } from "../src/seed.js";
import { createApp, type Documents } from "../src/app.js";
import { MemoryDedupe } from "../src/ports/dedupe.js";
import { createFirecrawlPort, type NewsHit } from "../src/ports/firecrawl.js";
import {
  applyNewsJudgments,
  composeNewsDesk,
  composeNewsJudgment,
  isSocialPost,
  MAX_JUDGED_HITS,
  newsJudgeQuestions,
  newsJudgeState,
  selectSocialStories,
  socialPostCopy,
} from "../src/ports/news-judge.js";
import { createTypeSafePort, type SystemOneResult } from "../src/ports/typesafe.js";
import type { SqlClient } from "../src/db/types.js";

const docs: Documents = {
  agentsMd: "# AGENTS\n",
  llmsTxt: "Sanggunian",
  charterEn: "# Charter\n",
  charterFil: "# Kartilya\n",
  skillMd: "# skill\n",
  operatorsMd: "# ops\n",
  curatorMd: "# Curators agenda_date\n",
  curatorSkillMd: "# scan_news\n",
};

const INVITE = "closed-arena-dev-token";
const CURATOR = "curator-dev-token";

const SENATE: NewsHit = {
  url: "https://www.inquirer.net/news/senate-flood-hearing",
  title: "Senate reopens flood-control hearing",
  snippet: "Senators ask DPWH for a unique-site list under the 2026 GAA process.",
  source: "news",
  query: "Philippines news",
};

const COMELEC: NewsHit = {
  url: "https://www.rappler.com/philippines/comelec-calendar",
  title: "Comelec says November barangay polls still possible",
  snippet: "RA 12232 calendar vs SB 2387.",
  source: "news",
  query: "Philippines news",
};

const GOSSIP: NewsHit = {
  url: "https://www.example.com/celebrity-gala",
  title: "Stars pack a charity gala in Taguig",
  snippet: "Red-carpet looks and after-parties, no bill on the floor.",
  source: "web",
  query: "Philippines news",
};

function jsonOf(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function mockFirecrawl(): typeof fetch {
  return (async (input) => {
    const url = String(input);
    if (url.includes("/search")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            news: [
              GOSSIP,
              SENATE,
              { ...COMELEC, date: "2026-08-23" },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/scrape")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown: "Senators asked DPWH to publish a unique-site list of flood-control projects.",
            metadata: { title: "Senate flood hearing", sourceURL: SENATE.url },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

function mockTypeSafe(handler: (body: Record<string, unknown>) => SystemOneResult | Response): typeof fetch {
  return (async (input, init) => {
    const url = String(input);
    if (!url.includes("/v1/systemone")) return new Response("not found", { status: 404 });
    const raw = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    const out = handler(raw as Record<string, unknown>);
    if (out instanceof Response) return out;
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

function deskAnswers(
  index: number,
  topic: string,
  notability: number,
  clip: "title" | "snippet_lead",
  tags: { politics?: number; tech?: number; economy?: number; climate?: number },
  social = 0.1,
): SystemOneResult["answers"] {
  return {
    [`s${index}_topic`]: {
      type: "choice",
      choice: topic,
      probabilities: { [topic]: 0.85, other: 0.15 },
      confidence: 0.8,
    },
    [`s${index}_notability`]: {
      type: "score",
      score: notability,
      legend: { "0": "skip", "1": "social", "2": "report" },
      probabilities: { "0": notability < 0.8 ? 0.8 : 0.05, "1": 0.15, "2": notability >= 1.5 ? 0.8 : 0.15 },
      confidence: 0.75,
    },
    [`s${index}_social`]: { type: "noul", noul: social },
    [`s${index}_clip`]: {
      type: "choice",
      choice: clip,
      probabilities: { title: clip === "title" ? 0.8 : 0.2, snippet_lead: clip === "snippet_lead" ? 0.8 : 0.2 },
      confidence: 0.7,
    },
    [`s${index}_tag_politics`]: { type: "noul", noul: tags.politics ?? 0.1 },
    [`s${index}_tag_tech`]: { type: "noul", noul: tags.tech ?? 0.1 },
    [`s${index}_tag_economy`]: { type: "noul", noul: tags.economy ?? 0.1 },
    [`s${index}_tag_climate`]: { type: "noul", noul: tags.climate ?? 0.1 },
  };
}

function rankedAnswers(): SystemOneResult {
  return {
    model: "jev-1.13.0",
    answers: {
      s0_worthy: { type: "noul", noul: 0.08 },
      s0_disposition: {
        type: "choice",
        choice: "skip_vibes",
        probabilities: {
          publish_candidate: 0.02,
          skip_no_instrument: 0.05,
          skip_not_ph_policy: 0.03,
          skip_vibes: 0.88,
          skip_crime_without_policy: 0.02,
        },
        confidence: 0.9,
      },
      s0_actionability: {
        type: "score",
        score: 0.1,
        legend: { "0": "none", "1": "guess", "2": "named" },
        probabilities: { "0": 0.9, "1": 0.08, "2": 0.02 },
        confidence: 0.85,
      },
      ...deskAnswers(0, "other", 0.1, "title", {}, 0.08),
      s1_worthy: { type: "noul", noul: 0.91 },
      s1_disposition: {
        type: "choice",
        choice: "publish_candidate",
        probabilities: {
          publish_candidate: 0.86,
          skip_no_instrument: 0.08,
          skip_not_ph_policy: 0.02,
          skip_vibes: 0.02,
          skip_crime_without_policy: 0.02,
        },
        confidence: 0.8,
      },
      s1_actionability: {
        type: "score",
        score: 1.7,
        legend: { "0": "none", "1": "guess", "2": "named" },
        probabilities: { "0": 0.05, "1": 0.2, "2": 0.75 },
        confidence: 0.7,
      },
      ...deskAnswers(1, "politics", 1.7, "snippet_lead", { politics: 0.9, climate: 0.8 }, 0.88),
      s2_worthy: { type: "noul", noul: 0.88 },
      s2_disposition: {
        type: "choice",
        choice: "publish_candidate",
        probabilities: {
          publish_candidate: 0.81,
          skip_no_instrument: 0.12,
          skip_not_ph_policy: 0.03,
          skip_vibes: 0.02,
          skip_crime_without_policy: 0.02,
        },
        confidence: 0.75,
      },
      s2_actionability: {
        type: "score",
        score: 1.9,
        legend: { "0": "none", "1": "guess", "2": "named" },
        probabilities: { "0": 0.02, "1": 0.08, "2": 0.9 },
        confidence: 0.82,
      },
      ...deskAnswers(2, "politics", 1.9, "title", { politics: 0.92 }, 0.91),
    },
  };
}

describe("TypeSafe news judgments", () => {
  test("one request asks council and public-desk questions per story", () => {
    const questions = newsJudgeQuestions(2);
    expect(questions.s0_worthy?.type).toBe("noul");
    expect(questions.s0_disposition?.type).toBe("choice");
    expect(questions.s0_actionability?.type).toBe("score");
    expect(questions.s0_topic?.type).toBe("choice");
    expect(questions.s0_notability?.type).toBe("score");
    expect(questions.s0_social?.type).toBe("noul");
    expect(questions.s0_clip?.type).toBe("choice");
    expect(questions.s0_tag_tech?.type).toBe("noul");
    expect(String(questions.s0_worthy?.instructions)).toContain("stories[0]");
    expect(questions.s0_clip && questions.s0_clip.type === "choice" ? questions.s0_clip.criteria.none : undefined).toMatch(
      /neither span/i,
    );
    expect(String(questions.s0_clip?.instructions)).not.toMatch(/Copy the title/);
    const state = newsJudgeState([GOSSIP, SENATE]);
    expect(state.stories[0]?.title).toBe(GOSSIP.title);
    expect(newsJudgeQuestions(MAX_JUDGED_HITS + 5)[`s${MAX_JUDGED_HITS}_worthy`]).toBeUndefined();
  });

  test("code combines answers: recommend only when disposition, noul, score, and confidence agree", () => {
    const weak = composeNewsJudgment(
      {
        s0_worthy: { type: "noul", noul: 0.6 },
        s0_disposition: {
          type: "choice",
          choice: "publish_candidate",
          probabilities: { publish_candidate: 0.4, skip_no_instrument: 0.6 },
          confidence: 0.2,
        },
        s0_actionability: {
          type: "score",
          score: 1.2,
          legend: { "0": "a", "1": "b", "2": "c" },
          probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
          confidence: 0.5,
        },
      },
      0,
    );
    expect(weak?.recommend).toBe(false);
    expect(weak?.uncertain).toBe(true);

    const strong = composeNewsJudgment(rankedAnswers().answers, 1);
    expect(strong?.recommend).toBe(true);
    expect(strong?.disposition).toBe("publish_candidate");
    expect(strong?.actionability_confidence).toBeGreaterThanOrEqual(0.5);
  });

  test("spread actionability Score confidence does not recommend a publish candidate", () => {
    const spread = composeNewsJudgment(
      {
        s0_worthy: { type: "noul", noul: 0.9 },
        s0_disposition: {
          type: "choice",
          choice: "publish_candidate",
          probabilities: { publish_candidate: 0.85, skip_no_instrument: 0.15 },
          confidence: 0.8,
        },
        s0_actionability: {
          type: "score",
          score: 1.4,
          legend: { "0": "a", "1": "b", "2": "c" },
          probabilities: { "0": 0.3, "1": 0.4, "2": 0.3 },
          confidence: 0.2,
        },
      },
      0,
    );
    expect(spread?.recommend).toBe(false);
    expect(spread?.uncertain).toBe(true);
    expect(spread?.actionability).toBe(1.4);
  });

  test("gossip drops below a named bill even if it arrived first", () => {
    const ordered = applyNewsJudgments([GOSSIP, SENATE, COMELEC], rankedAnswers().answers);
    expect(ordered.map((h) => h.url)).toEqual([COMELEC.url, SENATE.url, GOSSIP.url]);
    expect(ordered[0]?.judgment?.recommend).toBe(true);
    expect(ordered[2]?.judgment?.recommend).toBe(false);
    expect(ordered[2]?.judgment?.disposition).toBe("skip_vibes");
    expect(ordered[0]?.desk?.topic).toBe("politics");
    expect(ordered[0]?.desk?.notable).toBe(true);
    expect(ordered[2]?.desk?.notable).toBe(false);
  });

  test("public clip copies a verbatim span instead of generating copy", () => {
    const desk = composeNewsDesk(rankedAnswers().answers, 1, SENATE);
    expect(desk?.topic).toBe("politics");
    expect(desk?.tags).toEqual(expect.arrayContaining(["politics", "climate"]));
    expect(desk?.clip_source).toBe("snippet_lead");
    expect(desk?.clip).toBe("Senators ask DPWH for a unique-site list under the 2026 GAA process.");
    expect(desk?.social).toBe(true);
    expect(socialPostCopy({ title: SENATE.title, url: SENATE.url, desk })).toBe(
      `${desk?.clip}\n\n${SENATE.url}`,
    );
  });

  test("clip none falls back to the title instead of inventing a line", () => {
    const desk = composeNewsDesk(
      {
        ...rankedAnswers().answers,
        s1_clip: {
          type: "choice",
          choice: "none",
          probabilities: { title: 0.2, snippet_lead: 0.2, none: 0.6 },
          confidence: 0.5,
        },
      },
      1,
      SENATE,
    );
    expect(desk?.clip_source).toBe("title");
    expect(desk?.clip).toBe(SENATE.title);
  });

  test("gossip is not a social post; older notable desks still qualify", () => {
    const gossip = composeNewsDesk(rankedAnswers().answers, 0, GOSSIP);
    expect(gossip?.social).toBe(false);
    expect(isSocialPost(gossip)).toBe(false);
    expect(isSocialPost({ topic: "politics", topic_confidence: 0.8, tags: [], notability: 1.6, notable: true, clip_source: "title", clip: "Comelec calendar" })).toBe(
      true,
    );
    expect(selectSocialStories([{ title: "a", desk: gossip }, { title: "b", desk: composeNewsDesk(rankedAnswers().answers, 2, COMELEC) }]).map((s) => s.title)).toEqual([
      "b",
    ]);
  });
});

describe("curator scan + TypeSafe", () => {
  async function makeApp(typesafeFetch: typeof fetch) {
    const sql = await createPglite();
    await migrate(sql);
    await seedClosedArena(sql);
    const app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
      typesafe: createTypeSafePort({ apiKey: "ts-test-not-real", fetchImpl: typesafeFetch }),
    });
    return { sql, app };
  }

  test("scan ranks hits and lists recommend candidates", async () => {
    const { sql, app } = await makeApp(mockTypeSafe(() => rankedAnswers()));
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    const hits = body.hits as { url: string; judgment?: { recommend: boolean } }[];
    expect(hits[0]?.url).toBe(COMELEC.url);
    expect(hits[0]?.judgment?.recommend).toBe(true);
    expect(hits.at(-1)?.url).toBe(GOSSIP.url);
    const candidates = body.candidates as { url: string }[];
    expect(candidates.some((c) => c.url === SENATE.url)).toBe(true);
    expect(candidates.some((c) => c.url === GOSSIP.url)).toBe(false);
    expect((body.typesafe as { configured: boolean; judged: number }).configured).toBe(true);
    expect((body.typesafe as { judged: number }).judged).toBe(3);
    expect(String(body.notice)).toMatch(/TypeSafe/);
    const clips = body.clips as { url: string; topic: string }[];
    expect(clips.some((c) => c.topic === "politics")).toBe(true);
    expect(clips.some((c) => c.url.includes("celebrity"))).toBe(false);
    const socials = body.socials as { url: string; body: string }[];
    expect(socials.some((s) => s.url === COMELEC.url)).toBe(true);
    expect(socials.some((s) => s.body.includes(COMELEC.url))).toBe(true);
    expect(socials.some((s) => s.url.includes("celebrity"))).toBe(false);
    const health = await jsonOf(await app.request("/healthz"));
    expect(health.typesafe).toBe(true);

    const newsPage = await app.request("/news");
    expect(newsPage.status).toBe(200);
    const html = await newsPage.text();
    expect(html).toContain("What's in the news");
    expect(html).toContain("noindex");
    expect(html).toContain("Comelec");
    expect(html).toContain("politics");
    expect(html).toContain("clip");
    expect(html).toContain("Socials");

    const socialsPage = await app.request("/socials");
    expect(socialsPage.status).toBe(200);
    const socialHtml = await socialsPage.text();
    expect(socialHtml).toContain("noindex");
    expect(socialHtml).toContain("Comelec");
    expect(socialHtml).toContain("Copy post");
    expect(socialHtml).toContain(COMELEC.url);
    expect(socialHtml).not.toContain("charity gala");

    const socialFeed = await jsonOf(await app.request("/v1/socials"));
    const posts = socialFeed.posts as { url: string; body: string; social: boolean }[];
    expect(posts.every((p) => p.social)).toBe(true);
    expect(posts.some((p) => p.url === COMELEC.url)).toBe(true);
    expect(posts.some((p) => p.body.includes(COMELEC.url))).toBe(true);
    expect(posts.some((p) => p.url.includes("celebrity"))).toBe(false);

    const feed = await jsonOf(await app.request("/v1/news?topic=politics&notable=1"));
    const stories = feed.stories as { url: string; topic: string }[];
    expect(stories.every((s) => s.topic === "politics")).toBe(true);
    expect(stories.some((s) => s.url.includes("celebrity"))).toBe(false);

    const classified = await app.request("/v1/curator/news/classify", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: "{}",
    });
    expect(classified.status).toBe(200);
    const classifiedBody = await jsonOf(classified);
    expect(classifiedBody.classified).toBe(0);
    await sql.close();
  });

  test("TypeSafe failure leaves Firecrawl hits unranked instead of failing the scan", async () => {
    const { sql, app } = await makeApp(
      mockTypeSafe(() => new Response("nope", { status: 500 })),
    );
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    const hits = body.hits as { url: string; judgment?: unknown }[];
    expect(hits[0]?.url).toContain("celebrity");
    expect(hits[0]?.judgment).toBeUndefined();
    expect((body.typesafe as { error: string | null }).error).toMatch(/TypeSafe/);
    expect(String(body.notice)).not.toMatch(/ordered by TypeSafe/);
    await sql.close();
  });

  test("unconfigured TypeSafe still scans", async () => {
    const sql = await createPglite();
    await migrate(sql);
    const app = createApp({
      sql,
      inviteToken: INVITE,
      curatorApiKey: CURATOR,
      publicBaseUrl: "http://localhost:8787",
      dedupe: new MemoryDedupe(),
      documents: docs,
      firecrawl: createFirecrawlPort({ apiKey: "fc-test-not-real", fetchImpl: mockFirecrawl() }),
    });
    const scan = await app.request("/v1/curator/scan", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CURATOR}` },
      body: JSON.stringify({ queries: ["Philippines news"], limit: 5 }),
    });
    expect(scan.status).toBe(200);
    const body = await jsonOf(scan);
    expect((body.typesafe as { configured: boolean }).configured).toBe(false);
    expect((body.hits as unknown[]).length).toBeGreaterThan(0);
    const health = await jsonOf(await app.request("/healthz"));
    expect(health.typesafe).toBe(false);
    await sql.close();
  });

  test("HTTP port maps 401 without echoing the key", async () => {
    const port = createTypeSafePort({
      apiKey: "secret-should-not-leak",
      fetchImpl: mockTypeSafe(() => new Response("denied", { status: 401 })),
    });
    await expect(port.systemOne({ state: "x", questions: { q: { type: "noul", instructions: "yes?" } } })).rejects.toMatchObject({
      code: "typesafe_error",
    });
    try {
      await port.systemOne({ state: "x", questions: { q: { type: "noul", instructions: "yes?" } } });
    } catch (err) {
      expect(String(err)).not.toContain("secret-should-not-leak");
    }
  });
});
