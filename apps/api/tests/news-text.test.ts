import { describe, expect, test } from "vitest";
import { articleParagraphs, cleanNewsMarkdown, looksLikeChrome, presentNewsText } from "../src/lib/news-text.js";
import { applyScrapeSummaries } from "../src/ports/news-summarize.js";
import { pageFromMarkdown } from "../src/ports/firecrawl.js";
import type { TypeSafeAnswer } from "../src/ports/typesafe.js";

const INQUIRER_CHROME = `[![Image 2: tiktok](blob:http://localhost/a7738210d3944ec6b273043b6b31e8b6)](https://newsinfo.inquirer.net/2306610/under-24-hour-hospital-stay-covered-philhealth) July 10, 2022 [![Image 4: logo](blob:http://localhost/026e63c74f220686a328e3e4156682e9)](https://www.inquirer.net/) [News](https://newsinfo.inquirer.net/) [Global Nation](https://globalnation.inquirer.net/) [Business](https://business.inquirer.net/) [Lifestyle](https://lifestyle.inquirer.net/) [Entertainment](https://entertainment.inquirer.net/) FOLLOW US: Subscribe to our daily newsletter Your subscription could not be saved. Please try again. # Under 24-hour hospital stay covered – PhilHealth By: [Chelsy Perez](https://newsinfo.inquirer.net/byline/chelsy-perez) [Philippine Daily Inquirer](https://newsinfo.inquirer.net/source/philippine-daily-inquirer) / 05:42 AM S`;

describe("cleanNewsMarkdown", () => {
  test("strips Inquirer blob images and recovers the headline", () => {
    const cleaned = cleanNewsMarkdown(INQUIRER_CHROME);
    expect(cleaned.title).toBe("Under 24-hour hospital stay covered – PhilHealth");
    expect(cleaned.body).not.toMatch(/blob:http/);
    expect(cleaned.body).not.toMatch(/!\[/);
    expect(cleaned.body).toMatch(/Chelsy Perez/);
    const shown = presentNewsText(INQUIRER_CHROME.slice(0, 80), INQUIRER_CHROME);
    expect(shown.title).toBe("Under 24-hour hospital stay covered – PhilHealth");
    expect(shown.excerpt).not.toMatch(/Image 2: tiktok/);
  });

  test("truncated markdown titles are treated as chrome", () => {
    expect(looksLikeChrome("GMA Brandtalk + [GMA Public Affairs](https://www.gmanetwork.com/news/publicaf")).toBe(
      true,
    );
    expect(looksLikeChrome("| --- | --- |")).toBe(true);
  });

  test("keeps a real article lede after a heading", () => {
    const cleaned = cleanNewsMarkdown(
      "# Senate reopens flood-control hearing\n\nSenators asked DPWH to publish a unique-site list of flood-control projects under the 2026 GAA process.",
    );
    expect(cleaned.title).toBe("Senate reopens flood-control hearing");
    expect(cleaned.lede).toMatch(/unique-site/);
  });

  test("pageFromMarkdown stores the cleaned body, not the chrome", () => {
    const page = pageFromMarkdown(
      "https://newsinfo.inquirer.net/2306610/under-24-hour-hospital-stay-covered-philhealth",
      INQUIRER_CHROME.slice(0, 80),
      INQUIRER_CHROME,
      "tavily",
    );
    expect(page.title).toBe("Under 24-hour hospital stay covered – PhilHealth");
    expect(page.excerpt).not.toMatch(/blob:http/);
    expect(looksLikeChrome(page.title)).toBe(false);
  });
});

describe("Jev lede pick", () => {
  test("copies the chosen paragraph verbatim", () => {
    const page = pageFromMarkdown(
      "https://www.inquirer.net/news/senate-flood-hearing",
      "Senate flood hearing",
      "# Senate flood hearing\n\nCookie wall please accept.\n\nSenators asked DPWH to publish a unique-site list of flood-control projects.\n\nSubscribe to our daily newsletter",
      "tavily",
    );
    const paras = articleParagraphs(`${page.title}\n\n${page.markdown || page.excerpt}`);
    expect(paras.length).toBeGreaterThan(0);
    const answers: Record<string, TypeSafeAnswer> = {
      s0_lede: {
        type: "choice",
        choice: "p0",
        probabilities: { p0: 0.9, none: 0.1 },
        confidence: 0.9,
      },
    };
    const [out] = applyScrapeSummaries([page], answers);
    expect(out?.summary).toBeTruthy();
    expect(out?.summary).not.toMatch(/!\[/);
    expect(paras).toContain(out?.summary);
  });
});
