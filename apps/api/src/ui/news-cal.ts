import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { isAgendaDate, parseYmdUtc, shiftYearMonth } from "../lib/manila.js";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export type NewsKind = "all" | "headlines" | "scrapes";

export type DayCount = { date: string; stories: number; scrapes: number };

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function parseNewsKind(value: string | undefined): NewsKind {
  if (value === "headlines" || value === "scrapes") return value;
  return "all";
}

export function newsHref(opts: { day?: string; month?: string; q?: string; kind?: NewsKind }): string {
  const params = new URLSearchParams();
  if (opts.month) params.set("month", opts.month);
  if (opts.day) params.set("day", opts.day);
  if (opts.q) params.set("q", opts.q);
  if (opts.kind && opts.kind !== "all") params.set("kind", opts.kind);
  const qs = params.toString();
  return qs ? `/news?${qs}` : "/news";
}

export function monthLabel(ym: string): string {
  const parsed = parseYmdUtc(`${ym}-01`);
  if (!parsed) return ym;
  return parsed.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function countForKind(row: DayCount | undefined, kind: NewsKind): number {
  if (!row) return 0;
  if (kind === "headlines") return row.stories;
  if (kind === "scrapes") return row.scrapes;
  return row.stories + row.scrapes;
}

export function calendarMonth(opts: {
  month: string;
  selected: string;
  counts: Map<string, DayCount>;
  kind: NewsKind;
  q: string;
}): Html {
  const year = Number(opts.month.slice(0, 4));
  const month = Number(opts.month.slice(5, 7));
  const first = new Date(Date.UTC(year, month - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Html[] = [];
  for (let i = 0; i < pad; i += 1) cells.push(html`<span class="cal-pad"></span>`);
  for (let day = 1; day <= lastDate; day += 1) {
    const ymd = `${opts.month}-${String(day).padStart(2, "0")}`;
    const row = opts.counts.get(ymd);
    const count = countForKind(row, opts.kind);
    const selected = ymd === opts.selected;
    const classes = [
      "cal-cell",
      selected ? "is-selected" : "",
      count > 0 ? "has-hits" : "is-empty",
    ]
      .filter(Boolean)
      .join(" ");
    if (count > 0) {
      cells.push(html`<a class="${classes}" href="${newsHref({ day: ymd, month: opts.month, q: opts.q, kind: opts.kind })}">
        <span class="cal-num">${day}</span>
        <span class="cal-count">${count}</span>
      </a>`);
    } else {
      cells.push(html`<span class="${classes}">
        <span class="cal-num">${day}</span>
      </span>`);
    }
  }

  const prev = shiftYearMonth(opts.month, -1);
  const next = shiftYearMonth(opts.month, 1);
  const selectedInMonth = opts.selected.startsWith(opts.month) ? opts.selected : undefined;

  return html`<nav class="wire-cal" aria-label="Scan calendar">
    <div class="cal-nav">
      <a href="${newsHref({ month: prev, day: selectedInMonth, q: opts.q, kind: opts.kind })}" aria-label="Previous month">‹</a>
      <span class="cal-label">${monthLabel(opts.month)}</span>
      <a href="${newsHref({ month: next, day: selectedInMonth, q: opts.q, kind: opts.kind })}" aria-label="Next month">›</a>
    </div>
    <div class="cal-grid">
      ${DOW.map((d) => html`<span class="cal-dow">${d}</span>`)}
      ${cells}
    </div>
  </nav>`;
}

export function pickSelectedDay(dayParam: string | undefined, counts: DayCount[], today: string): string {
  if (isAgendaDate(dayParam)) return dayParam;
  return counts[0]?.date ?? today;
}

export function pickMonth(monthParam: string | undefined, selected: string): string {
  if (typeof monthParam === "string" && /^\d{4}-\d{2}$/.test(monthParam)) return monthParam;
  return selected.slice(0, 7);
}
