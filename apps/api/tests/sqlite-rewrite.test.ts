import { describe, expect, test } from "vitest";
import { rewritePgToSqlite, SQLITE_NOW } from "../src/db/sqlite-rewrite.js";
import { normalizeJurisdiction } from "../src/services/issues.js";

describe("rewritePgToSqlite", () => {
  test("repeats numbered placeholders in appearance order", () => {
    const out = rewritePgToSqlite("SELECT * FROM issues WHERE id::text = $1 OR slug = $1", ["abc"]);
    expect(out.sql).toBe("SELECT * FROM issues WHERE id = ? OR slug = ?");
    expect(out.params).toEqual(["abc", "abc"]);
  });

  test("stores string_to_array params as JSON text", () => {
    const out = rewritePgToSqlite(
      "INSERT INTO issues (jurisdiction) VALUES (string_to_array($1, ','))",
      ["PH-NCR,PH-national"],
    );
    expect(out.sql).toBe("INSERT INTO issues (jurisdiction) VALUES (?)");
    expect(out.params).toEqual([JSON.stringify(["PH-NCR", "PH-national"])]);
  });

  test("expands ANY(array) into IN placeholders", () => {
    const out = rewritePgToSqlite("UPDATE issues SET listed = false WHERE slug = ANY($1::text[])", [
      ["waste", "flood"],
    ]);
    expect(out.sql).toBe("UPDATE issues SET listed = false WHERE slug IN (?, ?)");
    expect(out.params).toEqual(["waste", "flood"]);
  });

  test("rewrites now() and strips jsonb casts", () => {
    const out = rewritePgToSqlite(
      "INSERT INTO agents (id, charter_accepted_at, pack) VALUES ($1, now(), $2::jsonb)",
      ["id-1", '{"a":1}'],
    );
    expect(out.sql).toContain(SQLITE_NOW);
    expect(out.sql).not.toMatch(/now\(\)/);
    expect(out.sql).not.toMatch(/::jsonb/);
    expect(out.params).toEqual(["id-1", '{"a":1}']);
  });

  test("COUNT(*)::text becomes COUNT(*)", () => {
    const out = rewritePgToSqlite("SELECT COUNT(*)::text AS n FROM agents WHERE operator_id = $1", ["op"]);
    expect(out.sql).toBe("SELECT COUNT(*) AS n FROM agents WHERE operator_id = ?");
    expect(out.params).toEqual(["op"]);
  });
});

describe("normalizeJurisdiction", () => {
  test("accepts arrays, JSON text, and postgres text[]", () => {
    expect(normalizeJurisdiction(["ncr", "national"])).toEqual(["ncr", "national"]);
    expect(normalizeJurisdiction('["ncr","national"]')).toEqual(["ncr", "national"]);
    expect(normalizeJurisdiction("{ncr,national}")).toEqual(["ncr", "national"]);
  });
});
