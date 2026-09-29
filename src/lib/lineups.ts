// Helpers for lineups: dates in the team's time zone, upcoming-vs-past
// grouping, reordering songs, and checking the lineup forms. Pure functions,
// easy to test.

import { KEY_PATTERN, MAJOR_KEYS, MINOR_KEYS, SONG_KEYS } from "./chords/keys";

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

/** A moment in time in the team's time zone: "Oct 2, 2026, 3:41 PM". */
export function formatTimestamp(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * "Last edited ..." wording: "just now", "2 min ago", "3 hr ago", "yesterday",
 * "4 days ago", then a plain date. `now` is passed in so it can be tested.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000)); // a slightly-fast clock counts as "just now"

  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 2) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(then));
}

// ---------------------------------------------------------------------------
// Songs inside a lineup
// ---------------------------------------------------------------------------

/** A copy of the list with one item moved (used by drag-and-drop and the up/down buttons). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

/**
 * Keys offered for "key for this service": the song's own major or minor keys,
 * or all of them when the song has no saved key.
 */
export function keyChoices(originalKey: string | null): string[] {
  if (originalKey && KEY_PATTERN.test(originalKey)) {
    return originalKey.endsWith("m") ? [...MINOR_KEYS] : [...MAJOR_KEYS];
  }
  return [...SONG_KEYS];
}

const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What can be changed on one song in a lineup. Missing fields are left as they are. */
export type ItemPatch = { keyOverride?: string | null; leaderId?: string | null; note?: string };

/**
 * Checks an edit to a lineup song and returns the database columns to change.
 * Runs on the server; never trust what the browser sends.
 */
export function parseItemPatch(
  patch: ItemPatch,
): { ok: true; columns: Record<string, string | null> } | { ok: false; error: string } {
  const columns: Record<string, string | null> = {};

  if ("keyOverride" in patch) {
    const key = patch.keyOverride?.trim() || null; // "" means "use the song's own key"
    if (key !== null && !KEY_PATTERN.test(key)) return { ok: false, error: "That isn't a valid key." };
    columns.key_override = key;
  }

  if ("leaderId" in patch) {
    const leader = patch.leaderId?.trim() || null;
    if (leader !== null && !UUID_ANY.test(leader)) return { ok: false, error: "Pick a leader from the list." };
    columns.leader_id = leader;
  }

  if ("note" in patch) {
    const note = (patch.note ?? "").trim();
    if (note.length > 500) return { ok: false, error: "The note is too long (500 characters max)." };
    columns.note = note || null;
  }

  return { ok: true, columns };
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
