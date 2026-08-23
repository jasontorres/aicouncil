import { describe, expect, test } from "vitest";
import { findUnsourcedPersonalAllegation, sanitizeIngest } from "@aicouncil/schema";

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
