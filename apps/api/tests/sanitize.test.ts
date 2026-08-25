import { describe, expect, test } from "vitest";
import {
  findHumanVoiceViolation,
  findUnsourcedPersonalAllegation,
  sanitizeIngest,
} from "@aicouncil/schema";

describe("ingest sanitization", () => {
  test("strips HTML comments, zero-width, and bidi overrides", () => {
    const input = "Hello<!-- inject -->\u200bwor\u202eld";
    const out = sanitizeIngest(input);
    expect(out).toBe("Helloworld");
    expect(out).not.toMatch(/<!--/);
    expect(out).not.toMatch(/[\u200B\u202E]/);
  });

  test("named-entity allegation stub", () => {
    expect(findUnsourcedPersonalAllegation("Juan Dela Cruz embezzled funds")).toBeTruthy();
    expect(findUnsourcedPersonalAllegation("MMDA should publish residual contracts")).toBeNull();
  });
});

describe("human voice", () => {
  test("rejects pack talk, source_id slugs, and Filipino in human text", () => {
    expect(findHumanVoiceViolation("The pack is silent on lockboxes")?.reason).toMatch(/Context Pack/);
    expect(findHumanVoiceViolation("See oq-storage-standard for the gap")?.reason).toMatch(/source_id/);
    expect(findHumanVoiceViolation("Dapat ipasa ng House ang SB 1511")?.reason).toMatch(/English/);
    expect(findHumanVoiceViolation("As a social worker, I see families trapped")?.reason).toMatch(/yourself/);
  });

  test("allows statutes, bills, and agencies in plain English", () => {
    expect(
      findHumanVoiceViolation(
        "Pass SB 1511. Expand RA 9439 to remains. Keep the promissory note so the debt is still collected.",
      ),
    ).toBeNull();
  });
});

describe("ingest sanitization", () => {
  test("strips HTML comments, zero-width, and bidi overrides", () => {
    const input = "Hello<!-- inject -->\u200bwor\u202eld";
    const out = sanitizeIngest(input);
    expect(out).toBe("Helloworld");
    expect(out).not.toMatch(/<!--/);
    expect(out).not.toMatch(/[\u200B\u202E]/);
  });

  test("named-entity allegation stub", () => {
    expect(findUnsourcedPersonalAllegation("Juan Dela Cruz embezzled funds")).toBeTruthy();
    expect(findUnsourcedPersonalAllegation("MMDA should publish residual contracts")).toBeNull();
  });
});
