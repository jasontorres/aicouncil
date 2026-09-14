import { describe, expect, test } from "vitest";
import { llmError } from "../src/lib/errors.js";
import { createFirecrawlPort } from "../src/ports/firecrawl.js";
import { fetchJurisMarkdown, jurisMarkdownUrl, shouldSkipFirecrawl } from "../src/ports/juris-assets.js";
import { createRetrievePort } from "../src/ports/retrieve.js";
import { isPdfUrl } from "../src/ports/scrape-page.js";
import { createTavilyPort } from "../src/ports/tavily.js";

const RA_PDF = "https://juris-assets.bettergov.ph/pdfs/ra/2001/9003.pdf";
const RA_MD = "https://juris-assets.bettergov.ph/markdowns/ra/2001/9003.md";
const CASE_PDF = "https://juris-assets.bettergov.ph/pdfs/juris/2023/263590.pdf";
const SENATE_PDF = "https://senate.gov.ph/legacy/lis_bills/4843944572!.pdf";
const NEWS = "https://www.inquirer.net/news/senate-flood-hearing";

function firecrawlSpy(): { port: ReturnType<typeof createFirecrawlPort>; scrapes: string[] } {
  const scrapes: string[] = [];
  const port = createFirecrawlPort({
    apiKey: "fc-test",
    fetchImpl: (async (input, init) => {
      const url = String(input);
      if (url.includes("/scrape")) {
        scrapes.push(String(JSON.parse(String(init?.body ?? "{}")).url));
        return new Response(JSON.stringify({ data: { markdown: "from firecrawl", metadata: { title: "FC" } } }), {
          status: 200,
        });
      }
      return new Response("no", { status: 404 });
    }) as typeof fetch,
  });
  return { port, scrapes };
}

describe("Juris markdown mapping", () => {
  test("swaps /pdfs/*.pdf for /markdowns/*.md", () => {
    expect(jurisMarkdownUrl(RA_PDF)).toBe(RA_MD);
    expect(jurisMarkdownUrl(CASE_PDF)).toBe(
      "https://juris-assets.bettergov.ph/markdowns/juris/2023/263590.md",
    );
    expect(jurisMarkdownUrl(RA_MD)).toBe(RA_MD);
    expect(jurisMarkdownUrl(SENATE_PDF)).toBeNull();
    expect(jurisMarkdownUrl(NEWS)).toBeNull();
  });

  test("treats PDFs and Juris asset PDFs as Firecrawl-skip", () => {
    expect(isPdfUrl(RA_PDF)).toBe(true);
    expect(isPdfUrl(SENATE_PDF)).toBe(true);
    expect(isPdfUrl(NEWS)).toBe(false);
    expect(shouldSkipFirecrawl(RA_PDF)).toBe(true);
    expect(shouldSkipFirecrawl(RA_MD)).toBe(true);
    expect(shouldSkipFirecrawl(NEWS)).toBe(false);
  });
});

describe("retrieve: PDFs never hit Firecrawl", () => {
  test("reads Juris markdown instead of scraping the PDF", async () => {
    const { port, scrapes } = firecrawlSpy();
    const retrieve = createRetrievePort({
      firecrawl: port,
      tavily: createTavilyPort({}),
      fetchImpl: (async (input) => {
        const url = String(input);
        expect(url).toBe(RA_MD);
        return new Response("# Republic Act 9003\n\nSolid waste management program.", {
          status: 200,
          headers: { "content-type": "text/markdown" },
        });
      }) as typeof fetch,
    });
    const page = await retrieve.scrape(RA_PDF);
    expect(scrapes).toEqual([]);
    expect(page.url).toBe(RA_PDF);
    expect(page.excerpt).toMatch(/Solid waste management/i);
    expect(page.markdown).toMatch(/Republic Act 9003/);
  });

  test("falls back to Tavily when Juris markdown is missing", async () => {
    const { port, scrapes } = firecrawlSpy();
    let tavilyCalls = 0;
    const retrieve = createRetrievePort({
      firecrawl: port,
      tavily: createTavilyPort({
        apiKey: "tvly-test",
        fetchImpl: (async (input) => {
          expect(String(input)).toContain("api.tavily.com/extract");
          tavilyCalls += 1;
          return new Response(
            JSON.stringify({
              results: [{ url: RA_PDF, raw_content: "# RA 9003\n\nFrom Tavily backup." }],
            }),
            { status: 200 },
          );
        }) as typeof fetch,
      }),
      fetchImpl: (async () => new Response("not found", { status: 404 })) as typeof fetch,
    });
    const page = await retrieve.scrape(RA_PDF);
    expect(scrapes).toEqual([]);
    expect(tavilyCalls).toBe(1);
    expect(page.excerpt).toMatch(/From Tavily backup/);
  });

  test("falls back to Tavily extract for a Senate PDF", async () => {
    const { port, scrapes } = firecrawlSpy();
    let tavilyCalls = 0;
    const retrieve = createRetrievePort({
      firecrawl: port,
      tavily: createTavilyPort({
        apiKey: "tvly-test",
        fetchImpl: (async (input) => {
          expect(String(input)).toContain("api.tavily.com/extract");
          tavilyCalls += 1;
          return new Response(
            JSON.stringify({
              results: [{ url: SENATE_PDF, raw_content: "# CADENA Act\n\nDigital budget portal." }],
            }),
            { status: 200 },
          );
        }) as typeof fetch,
      }),
    });
    const page = await retrieve.scrape(SENATE_PDF);
    expect(scrapes).toEqual([]);
    expect(tavilyCalls).toBe(1);
    expect(page.excerpt).toMatch(/Digital budget portal/);
  });

  test("does not call Firecrawl when a PDF has no markdown and no Tavily", async () => {
    const { port, scrapes } = firecrawlSpy();
    const retrieve = createRetrievePort({
      firecrawl: port,
      tavily: createTavilyPort({}),
    });
    await expect(retrieve.scrape(SENATE_PDF)).rejects.toMatchObject({ code: "pdf_skipped" });
    expect(scrapes).toEqual([]);
  });

  test("HTML pages still use Firecrawl", async () => {
    const { port, scrapes } = firecrawlSpy();
    const retrieve = createRetrievePort({
      firecrawl: port,
      tavily: createTavilyPort({}),
    });
    const page = await retrieve.scrape(NEWS);
    expect(scrapes).toEqual([NEWS]);
    expect(page.excerpt).toContain("from firecrawl");
  });

  test("HTML Firecrawl failure falls back to Tavily", async () => {
    const firecrawl = createFirecrawlPort({
      apiKey: "fc-test",
      fetchImpl: (async () => new Response("nope", { status: 500 })) as typeof fetch,
    });
    const retrieve = createRetrievePort({
      firecrawl,
      tavily: createTavilyPort({
        apiKey: "tvly-test",
        fetchImpl: (async () =>
          new Response(JSON.stringify({ results: [{ url: NEWS, raw_content: "Tavily news body." }] }), {
            status: 200,
          })) as typeof fetch,
      }),
    });
    const page = await retrieve.scrape(NEWS);
    expect(page.excerpt).toContain("Tavily news body");
  });
});

describe("Firecrawl port PDF guard", () => {
  test("refuses PDFs before calling the API", async () => {
    let called = false;
    const port = createFirecrawlPort({
      apiKey: "fc-test",
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    await expect(port.scrape(RA_PDF)).rejects.toMatchObject({ code: "pdf_skipped" });
    expect(called).toBe(false);
  });
});

describe("juris-assets fetch", () => {
  test("returns null on HTML 404 pages", async () => {
    const page = await fetchJurisMarkdown(RA_PDF, {
      fetchImpl: (async () =>
        new Response("<!doctype html><title>Not Found</title>", {
          status: 404,
          headers: { "content-type": "text/html" },
        })) as typeof fetch,
    });
    expect(page).toBeNull();
  });
});

describe("llmError shape", () => {
  test("pdf_skipped is a 422", () => {
    const err = llmError(422, "pdf_skipped", "x");
    expect(err.status).toBe(422);
  });
});
