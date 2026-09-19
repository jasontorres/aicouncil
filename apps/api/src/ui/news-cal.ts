import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { isAgendaDate, isYearMonth, shiftYearMonth } from "../lib/manila.js";
import { NEWS_TOPICS, type NewsTopic, isNewsTopic } from "../ports/news-judge.js";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export type NewsKind = "all" | "headlines" | "scrapes";

export type DayCount = { date: string; stories: number; scrapes: number };

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseNewsKind(value: string | undefined): NewsKind {
  if (value === "headlines" || value === "scrapes") return value;
  return "all";
}

export function parseNewsTopic(value: string | undefined): NewsTopic | "all" {
  if (value === "notable") return "all";
  if (value && isNewsTopic(value)) return value;
  return "all";
}

export function parseNotable(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "notable";
}

export function newsHref(opts: {
  day?: string;
  month?: string;
  q?: string;
  kind?: NewsKind;
  topic?: NewsTopic | "all";
  notable?: boolean;
}): string {
  const params = new URLSearchParams();
  if (opts.month) params.set("month", opts.month);
  if (opts.day) params.set("day", opts.day);
  if (opts.q) params.set("q", opts.q);
  if (opts.kind && opts.kind !== "all") params.set("kind", opts.kind);
  if (opts.topic && opts.topic !== "all") params.set("topic", opts.topic);
  if (opts.notable) params.set("notable", "1");
  const qs = params.toString();
  return qs ? `/news?${qs}` : "/news";
}

export function monthLabel(ym: string): string {
  if (!isYearMonth(ym)) return ym;
  const month = Number(ym.slice(5, 7));
  return `${MONTHS[month - 1] ?? ym} ${ym.slice(0, 4)}`;
}

export function countForKind(row: DayCount | undefined, kind: NewsKind): number {
  if (!row) return 0;
  if (kind === "headlines") return row.stories;
  if (kind === "scrapes") return row.scrapes;
  return row.stories + row.scrapes;
}

export function monthsWithCounts(counts: Iterable<string>): string[] {
  return [...new Set([...counts].map((date) => date.slice(0, 7)))].sort();
}

/** Monday-first weeks. `null` is a leading/trailing pad. */
export function calendarWeeks(month: string): (number | null)[][] {
  if (!isYearMonth(month)) return [];
  const year = Number(month.slice(0, 4));
  const mo = Number(month.slice(5, 7));
  const pad = (new Date(Date.UTC(year, mo - 1, 1)).getUTCDay() + 6) % 7;
  const lastDate = new Date(Date.UTC(year, mo, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<number | null>(pad).fill(null)];
  for (let day = 1; day <= lastDate; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function dayInMonth(month: string, selected: string, dates: string[]): string {
  if (selected.startsWith(`${month}-`)) return selected;
  const inMonth = dates.filter((date) => date.startsWith(`${month}-`)).sort();
  if (inMonth.length === 0) return `${month}-01`;
  if (selected.slice(0, 7) < month) return inMonth[0]!;
  return inMonth[inMonth.length - 1]!;
}

export function calendarMonth(opts: {
  month: string;
  selected: string;
  counts: Map<string, DayCount>;
  kind: NewsKind;
  q: string;
  topic: NewsTopic | "all";
  notable: boolean;
}): Html {
  const dates = [...opts.counts.keys()];
  const months = monthsWithCounts(dates);
  const prev = shiftYearMonth(opts.month, -1);
  const next = shiftYearMonth(opts.month, 1);
  const weeks = calendarWeeks(opts.month);
  const hrefBase = { q: opts.q, kind: opts.kind, topic: opts.topic, notable: opts.notable };

  const navLink = (target: string, label: string, aria: string, enabled: boolean) => {
    if (!enabled) return html`<span class="cal-nav-btn is-off" aria-disabled="true">${label}</span>`;
    const day = dayInMonth(target, opts.selected, dates);
    return html`<a class="cal-nav-btn" href="${newsHref({ ...hrefBase, month: target, day })}" aria-label="${aria}">${label}</a>`;
  };

  return html`<nav class="wire-cal" aria-label="Scan calendar">
    <div class="cal-nav">
      ${navLink(prev, "‹", "Previous month", months.includes(prev))}
      <span class="cal-label">${monthLabel(opts.month)}</span>
      ${navLink(next, "›", "Next month", months.includes(next))}
    </div>
    <table class="cal-table">
      <thead>
        <tr>
          ${DOW.map((d) => html`<th>${d}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${weeks.map(
          (week) => html`<tr>
            ${week.map((day) => {
              if (day == null) return html`<td class="cal-pad"></td>`;
              const ymd = `${opts.month}-${String(day).padStart(2, "0")}`;
              const count = countForKind(opts.counts.get(ymd), opts.kind);
              const selected = ymd === opts.selected;
              const classes = [
                "cal-cell",
                selected ? "is-selected" : "",
                count > 0 ? "has-hits" : "is-empty",
              ]
                .filter(Boolean)
                .join(" ");
              if (count > 0) {
                return html`<td>
                  <a class="${classes}" href="${newsHref({ ...hrefBase, day: ymd, month: opts.month })}">
                    <span class="cal-num">${day}</span>
                    <span class="cal-count">${count}</span>
                  </a>
                </td>`;
              }
              return html`<td>
                <span class="${classes}">
                  <span class="cal-num">${day}</span>
                </span>
              </td>`;
            })}
          </tr>`,
        )}
      </tbody>
    </table>
  </nav>`;
}

export function pickSelectedDay(dayParam: string | undefined, counts: DayCount[], today: string): string {
  if (isAgendaDate(dayParam)) return dayParam;
  return counts[0]?.date ?? today;
}

export function pickMonth(monthParam: string | undefined, selected: string, counts: DayCount[] = []): string {
  const fallback = selected.slice(0, 7);
  if (!isYearMonth(monthParam)) return fallback;
  if (counts.length === 0) return monthParam;
  if (counts.some((row) => row.date.startsWith(`${monthParam}-`))) return monthParam;
  return fallback;
}

export function topicTabs(): { id: NewsTopic | "all"; label: string }[] {
  return [{ id: "all", label: "All desks" }, ...NEWS_TOPICS.map((id) => ({ id, label: id }))];
}
