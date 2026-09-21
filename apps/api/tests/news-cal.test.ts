import { describe, expect, test } from "vitest";
import { calendarWeeks, dayInMonth, monthLabel, newsHref, pickMonth, socialsHref } from "../src/ui/news-cal.js";

describe("news calendar", () => {
  test("labels months without using the locale clock", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(monthLabel("2026-10")).toBe("October 2026");
  });

  test("September 2026 starts on Tuesday (one Monday pad)", () => {
    const weeks = calendarWeeks("2026-09");
    expect(weeks[0]).toEqual([null, 1, 2, 3, 4, 5, 6]);
    expect(weeks.at(-1)?.filter((d) => d != null).at(-1)).toBe(30);
  });

  test("October 2026 first week is Thu–Sun", () => {
    expect(calendarWeeks("2026-10")[0]).toEqual([null, null, null, 1, 2, 3, 4]);
  });

  test("snaps a month with no scans back to the selected day's month", () => {
    const counts = [{ date: "2026-09-14", stories: 75, scrapes: 0 }];
    expect(pickMonth("2026-10", "2026-09-14", counts)).toBe("2026-09");
  });

  test("picks a day that actually sits in the target month", () => {
    expect(dayInMonth("2026-09", "2026-09-14", ["2026-09-03", "2026-09-14"])).toBe("2026-09-14");
    expect(dayInMonth("2026-08", "2026-09-14", ["2026-08-20", "2026-09-14"])).toBe("2026-08-20");
  });

  test("keeps topic and clip filters on calendar links", () => {
    expect(newsHref({ day: "2026-09-14", month: "2026-09", topic: "tech", notable: true })).toBe(
      "/news?month=2026-09&day=2026-09-14&topic=tech&notable=1",
    );
    expect(socialsHref()).toBe("/socials");
    expect(socialsHref({ topic: "tech" })).toBe("/socials?topic=tech");
  });
});
