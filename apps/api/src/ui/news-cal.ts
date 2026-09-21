import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { isAgendaDate, isYearMonth, shiftYearMonth } from "../lib/manila.js";
import { NEWS_TAGS, NEWS_TOPICS, isNewsTag, isNewsTopic, type NewsTag, type NewsTopic } from "../ports/news-judge.js";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export type NewsKind = "all" | "headlines" | "scrapes";

export type DayCount = { date: string; stories: number; scrapes: number };

export type WireHrefOpts = {
  day?: string;
  month?: string;
  q?: string;
  kind?: NewsKind;
  topic?: NewsTopic | "all";
  tags?: NewsTag[];
  notable?: boolean;
  social?: boolean;
  council?: boolean;
};

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

export function parseNewsTags(values: string[] | undefined): NewsTag[] {
  if (!values?.length) return [];
  const out: NewsTag[] = [];
  for (const value of values) {
    for (const part of value.split(/[+,]/)) {
      const token = part.trim().toLowerCase();
      if (isNewsTag(token) && !out.includes(token)) out.push(token);
    }
  }
  return out;
}

export function parseNotable(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "notable";
}

export function toggleTag(current: NewsTag[], tag: NewsTag): NewsTag[] {
  return current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
}

function wireHref(path: string, opts: WireHrefOpts): string {
  const params = new URLSearchParams();
  if (opts.month) params.set("month", opts.month);
  if (opts.day) params.set("day", opts.day);
  if (opts.q) params.set("q", opts.q);
  if (opts.kind && opts.kind !== "all") params.set("kind", opts.kind);
  if (opts.topic && opts.topic !== "all") params.set("topic", opts.topic);
  for (const tag of opts.tags ?? []) params.append("tag", tag);
  if (opts.notable) params.set("notable", "1");
  if (opts.social) params.set("social", "1");
  if (opts.council) params.set("council", "1");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function newsHref(opts: WireHrefOpts = {}): string {
  return wireHref("/news", opts);
}

export function socialsHref(opts: WireHrefOpts = {}): string {
  return wireHref("/socials", opts);
}

export function newsJsonHref(opts: WireHrefOpts = {}): string {
  return wireHref("/news.json", opts);
}

export function socialsJsonHref(opts: WireHrefOpts = {}): string {
  return wireHref("/socials.json", opts);
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
  href: (opts: { day?: string; month?: string }) => string;
  label?: string;
}): Html {
  const dates = [...opts.counts.keys()];
  const months = monthsWithCounts(dates);
  const prev = shiftYearMonth(opts.month, -1);
  const next = shiftYearMonth(opts.month, 1);
  const weeks = calendarWeeks(opts.month);
  const aria = opts.label ?? "Scan calendar";

  const navLink = (target: string, label: string, navAria: string, enabled: boolean) => {
    if (!enabled) return html`<span class="cal-nav-btn is-off" aria-disabled="true">${label}</span>`;
    const day = dayInMonth(target, opts.selected, dates);
    return html`<a class="cal-nav-btn" href="${opts.href({ month: target, day })}" aria-label="${navAria}">${label}</a>`;
  };

  return html`<nav class="wire-cal" aria-label="${aria}">
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
              const classes = ["cal-cell", selected ? "is-selected" : "", count > 0 ? "has-hits" : "is-empty"]
                .filter(Boolean)
                .join(" ");
              if (count > 0) {
                return html`<td>
                  <a class="${classes}" href="${opts.href({ day: ymd, month: opts.month })}">
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

export function tagTabs(): { id: NewsTag; label: string }[] {
  return NEWS_TAGS.map((id) => ({ id, label: id }));
}
