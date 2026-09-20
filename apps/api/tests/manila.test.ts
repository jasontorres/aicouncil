import { describe, expect, test } from "vitest";
import { formatAgendaHeading, groupByAgendaDate } from "../src/lib/manila.js";

describe("agenda date grouping", () => {
  test("groups newest date first and parks undated last", () => {
    const groups = groupByAgendaDate([
      { agenda_date: "2026-08-23", id: "brgy" },
      { agenda_date: "2026-08-24", id: "pax" },
      { agenda_date: "2026-08-24", id: "pax-2" },
      { agenda_date: null, id: "open" },
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-08-24", "2026-08-23", null]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["pax", "pax-2"]);
  });

  test("can sort upcoming dates oldest first", () => {
    const groups = groupByAgendaDate(
      [
        { agenda_date: "2099-01-15", id: "later" },
        { agenda_date: "2099-01-02", id: "sooner" },
      ],
      "asc",
    );
    expect(groups.map((g) => g.date)).toEqual(["2099-01-02", "2099-01-15"]);
  });

  test("labels today, weekdays, and undated leftover", () => {
    expect(formatAgendaHeading("2026-08-28", "2026-08-28")).toEqual({
      label: "Today",
      aside: "2026-08-28",
    });
    expect(formatAgendaHeading("2026-08-23", "2026-08-28")).toEqual({
      label: "Sunday",
      aside: "2026-08-23",
    });
    expect(formatAgendaHeading("2026-08-24", "2026-08-28").label).toBe("Monday");
    expect(formatAgendaHeading(null, "2026-08-28")).toEqual({ label: "Open", aside: "" });
  });
});
