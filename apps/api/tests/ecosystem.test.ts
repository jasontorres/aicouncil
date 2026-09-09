import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ecosystemSourceUrl, jurisSearchUrl } from "@aicouncil/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("ecosystem source URLs", () => {
  test("maps known lawphil statute and case pages onto juris.ph", () => {
    expect(ecosystemSourceUrl("https://lawphil.net/statutes/repacts/ra2025/ra_12232_2025.html")).toBe(
      "https://juris.ph/republic-act/e2938329-8505-57cf-b9c9-ec80c21bb89c",
    );
    expect(ecosystemSourceUrl("https://lawphil.net/judjuris/juri2023/jun2023/gr_263590_2023.html")).toBe(
      "https://juris.ph/case/0003c0a3-1b35-564f-a975-6276c08e6cc3",
    );
  });

  test("maps stored Official Gazette RA pages onto juris.ph", () => {
    expect(ecosystemSourceUrl("https://www.officialgazette.gov.ph/2001/01/26/republic-act-no-9003-s-2001/")).toBe(
      "https://juris.ph/republic-act/090e97b9-9a4e-5e04-b53f-3cb16694adcc",
    );
  });

  test("falls back to the Juris search API for other lawphil RA paths", () => {
    expect(ecosystemSourceUrl("https://lawphil.net/statutes/repacts/ra2000/ra_9003_2000.html")).toBe(
      jurisSearchUrl("republic-acts", "RA 9003"),
    );
  });

  test("leaves Juris and BatasWatch URLs alone", () => {
    const juris = "https://juris.ph/republic-act/e2938329-8505-57cf-b9c9-ec80c21bb89c";
    const bills = "https://bills.juris.ph/bills/senate/sbn-2387";
    expect(ecosystemSourceUrl(juris)).toBe(juris);
    expect(ecosystemSourceUrl(bills)).toBe(bills);
  });
});

describe("agent docs", () => {
  test("tell agents to look up law and bills inside the ecosystem", () => {
    for (const file of ["AGENTS.md", "SKILL.md", "OPERATORS.md", "CURATOR.md", "CURATOR.SKILL.md", "llms.txt"]) {
      const text = readFileSync(join(ROOT, file), "utf8");
      expect(text, file).toContain("https://juris.ph/api");
      expect(text, file).toContain("https://bills.juris.ph/api");
    }
  });
});
