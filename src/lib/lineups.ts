// Helpers for lineups: dates in the team's time zone, upcoming-vs-past
// grouping, and checking the lineup form. Pure functions, easy to test.

// Vercel's servers run in UTC. Without a fixed time zone, "today" would be
// wrong for a few hours each day and a Sunday lineup could look like it's
// already in the past. Change it with the APP_TIMEZONE environment variable.
export const DEFAULT_TIMEZONE = "Asia/Manila";

export function appTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

/** Today's date as "YYYY-MM-DD" in the given time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // The "en-CA" locale happens to format dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** True for real calendar dates like "2026-10-04" (not "2026-02-31"). */
export function isValidDate(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** "2026-10-04" -> "Sun, Oct 4, 2026". A date has no time zone, so it's formatted as UTC. */
export function formatServiceDate(date: string | null): string {
  if (!date || !isValidDate(date)) return "No date";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "09:30:00" or "09:30" -> "9:30 AM". Empty for no time. */
export function formatServiceTime(time: string | null): string {
  const m = time ? TIME_PATTERN.exec(time) : null;
  if (!m) return "";
  const hour = Number(m[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m[2]} ${suffix}`;
}

type Dated = { service_date: string | null; service_time: string | null };

const sortKey = (l: Dated) => `${l.service_date ?? "9999-99-99"} ${l.service_time ?? "99:99"}`;

/**
 * Splits lineups into upcoming (today or later, soonest first; undated last)
 * and past (most recent first). "Today" is passed in so it can be tested.
 */
export function splitUpcomingPast<T extends Dated>(
  lineups: T[],
  today: string,
): { upcoming: T[]; past: T[] } {
  const isPast = (l: T) => l.service_date !== null && l.service_date < today;
  const upcoming = lineups.filter((l) => !isPast(l)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = lineups.filter(isPast).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return { upcoming, past };
}

// ---------------------------------------------------------------------------
// Lineup form
// ---------------------------------------------------------------------------

export type LineupInput = {
  id: string | null; // null = new lineup
  title: string;
  serviceDate: string;
  serviceTime: string | null; // "HH:MM"
  serviceType: string;
  notes: string;
};

export type LineupFieldErrors = Partial<Record<"title" | "date" | "time" | "type", string>>;

export type LineupFormValues = {
  id: string | null;
  title: string;
  serviceDate: string;
  serviceTime: string;
  serviceType: string;
  notes: string;
};

export const emptyLineupValues: LineupFormValues = {
  id: null,
  title: "",
  serviceDate: "",
  serviceTime: "",
  serviceType: "",
  notes: "",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export function parseLineupForm(
  formData: FormData,
): { ok: true; value: LineupInput } | { ok: false; errors: LineupFieldErrors } {
  const errors: LineupFieldErrors = {};

  const title = field(formData, "title").trim();
  if (!title) errors.title = "Give the lineup a title.";
  else if (title.length > 200) errors.title = "Title is too long (200 characters max).";

  const serviceDate = field(formData, "serviceDate").trim();
  if (!isValidDate(serviceDate)) errors.date = "Pick the service date.";

  const timeRaw = field(formData, "serviceTime").trim();
  const timeMatch = timeRaw ? TIME_PATTERN.exec(timeRaw) : null;
  if (timeRaw && !timeMatch) errors.time = "Enter a valid time.";

  const serviceType = field(formData, "serviceType").trim();
  if (serviceType.length > 100) errors.type = "Service type is too long (100 characters max).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const id = field(formData, "id").trim();
  return {
    ok: true,
    value: {
      id: UUID.test(id) ? id : null,
      title,
      serviceDate,
      serviceTime: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null,
      serviceType,
      notes: field(formData, "notes").trim(),
    },
  };
}
