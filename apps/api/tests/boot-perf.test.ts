import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";
import { migrateD1, type D1Binding } from "../src/db/d1.js";
import { createSqliteMemory } from "../src/db/sqlite-memory.js";
import { cacheablePath, cacheableResponse } from "../src/lib/edge-cache.js";
import { manilaToday } from "../src/lib/manila.js";
import { seedClosedArena, BARANGAY_SEED_ISSUE } from "../src/seed.js";
import { issuesService } from "../src/services/issues.js";

function sqliteAsD1(db: DatabaseSync): D1Binding & { runs: number } {
  const state = { runs: 0 };
  return {
    get runs() {
      return state.runs;
    },
    exec: async (sql) => {
      db.exec(sql);
    },
    prepare(sql: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async all() {
          const prepared = db.prepare(sql);
          const rows = bound.length > 0 ? prepared.all(...(bound as never[])) : prepared.all();
          return { results: rows as Record<string, unknown>[] };
        },
        async run() {
          state.runs += 1;
          const prepared = db.prepare(sql);
          if (bound.length > 0) prepared.run(...(bound as never[]));
          else prepared.run();
        },
      };
      return stmt;
    },
  };
}

describe("cold-start D1 skip paths", () => {
  test("migrateD1 is a no-op after 0001_init.sql is recorded", async () => {
    const db = new DatabaseSync(":memory:");
    const d1 = sqliteAsD1(db);
    await migrateD1(d1);
    expect(d1.runs).toBeGreaterThan(10);
    const afterFirst = d1.runs;
    await migrateD1(d1);
    expect(d1.runs).toBe(afterFirst);
  });

  test("seedClosedArena returns existing ids without rewriting archived Issues", async () => {
    const sql = createSqliteMemory();
    const first = await seedClosedArena(sql);
    const second = await seedClosedArena(sql);
    expect(second.issueId).toBe(first.issueId);
    expect(second.issues.pax.slug).toBe("pax-silica-ph");
    expect(second.issues.barangay.issueId).toBe(first.issues.barangay.issueId);
    const listed = await sql.query<{ slug: string; listed: number }>(
      "SELECT slug, listed FROM issues WHERE slug IN ($1, $2)",
      ["ncr-solid-waste-capacity-2026", "ph-flood-control-accountability-2026"],
    );
    expect(listed.every((row) => Number(row.listed) === 0)).toBe(true);
    await sql.close();
  });

  test("promoteDue is a no-op until a draft's Manila date arrives", async () => {
    const sql = createSqliteMemory();
    await seedClosedArena(sql);
    const svc = issuesService(sql);
    const today = manilaToday();
    await svc.promoteDue();
    await sql.exec(
      `UPDATE issues SET status = 'draft', listed = false, agenda_date = $1 WHERE slug = $2`,
      [today, BARANGAY_SEED_ISSUE.slug],
    );
    const before = await sql.query<{ status: string }>("SELECT status FROM issues WHERE slug = $1", [
      BARANGAY_SEED_ISSUE.slug,
    ]);
    expect(before[0]?.status).toBe("draft");
    await svc.promoteDue();
    const after = await sql.query<{ status: string; listed: number }>(
      "SELECT status, listed FROM issues WHERE slug = $1",
      [BARANGAY_SEED_ISSUE.slug],
    );
    expect(after[0]?.status).toBe("open");
    expect(Number(after[0]?.listed)).toBe(1);
    await sql.close();
  });
});

describe("edge cache allowlist", () => {
  test("caches public chrome, not threads or the API", () => {
    expect(cacheablePath("/")).toBe(true);
    expect(cacheablePath("/participate")).toBe(true);
    expect(cacheablePath("/charter")).toBe(true);
    expect(cacheablePath("/charter/fil")).toBe(true);
    expect(cacheablePath("/AGENTS.md")).toBe(true);
    expect(cacheablePath("/issues/brgy-term-sb-2387")).toBe(false);
    expect(cacheablePath("/v1/issues")).toBe(false);
    expect(cacheablePath("/mcp")).toBe(false);
    expect(
      cacheableResponse(
        new Response("ok", { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }),
      ),
    ).toBe(true);
    expect(
      cacheableResponse(new Response("ok", { headers: { "Cache-Control": "private, no-store" } })),
    ).toBe(false);
  });
});
