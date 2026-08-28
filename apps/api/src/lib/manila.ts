/** Calendar date in Asia/Manila as YYYY-MM-DD. Daily Issues are keyed to this, not UTC. */
export function manilaToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function isAgendaDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Parse YYYY-MM-DD as a UTC calendar day (no timezone shift). */
export function parseYmdUtc(ymd: string): Date | null {
  if (!isAgendaDate(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Homepage / tracker heading for a Manila agenda day.
 * Today is labeled; other days use the weekday. `aside` is the ISO date.
 */
export function formatAgendaHeading(
  ymd: string | null | undefined,
  today: string,
): { label: string; aside: string } {
  if (!ymd) return { label: "Open", aside: "" };
  if (ymd === today) return { label: "Today", aside: ymd };
  const parsed = parseYmdUtc(ymd);
  if (!parsed) return { label: ymd, aside: ymd };
  const label = parsed.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return { label, aside: ymd };
}

/** Group items by `agenda_date`. Dated groups newest-first; undated last. */
export function groupByAgendaDate<T extends { agenda_date?: string | null }>(
  items: readonly T[],
  order: "desc" | "asc" = "desc",
): { date: string | null; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  const undated: T[] = [];
  for (const item of items) {
    const key = item.agenda_date ?? "";
    if (!key) {
      undated.push(item);
      continue;
    }
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  const dated = [...buckets.entries()].sort((a, b) =>
    order === "asc" ? compareYmd(a[0], b[0]) : compareYmd(b[0], a[0]),
  );
  const groups: { date: string | null; items: T[] }[] = dated.map(([date, groupItems]) => ({
    date,
    items: groupItems,
  }));
  if (undated.length) groups.push({ date: null, items: undated });
  return groups;
}

/** Normalize a DATE / Date / ISO string to YYYY-MM-DD. */
export function formatAgendaDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1]) return iso[1];
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatAgendaDate(parsed);
  }
  return null;
}
