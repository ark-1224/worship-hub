import { describe, expect, it } from "vitest";
import {
  addDays,
  copyTitle,
  formatServiceDate,
  formatServiceTime,
  formatTimestamp,
  isValidDate,
  keyChoices,
  moveItem,
  parseItemPatch,
  parseLineupForm,
  splitUpcomingPast,
  timeAgo,
  todayIn,
} from "./lineups";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("todayIn (team time zone, not the server's)", () => {
  it("is already the next day in Manila when it is late evening UTC", () => {
    // 17:00 UTC on Sep 30 is 01:00 on Oct 1 in Manila (UTC+8).
    const now = new Date("2026-09-30T17:00:00Z");
    expect(todayIn("Asia/Manila", now)).toBe("2026-10-01");
    expect(todayIn("UTC", now)).toBe("2026-09-30");
  });

  it("is still the previous day in New York at the same moment", () => {
    expect(todayIn("America/New_York", new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-30");
  });
});

describe("addDays", () => {
  it("adds a week, rolling over months and years", () => {
    expect(addDays("2026-10-04", 7)).toBe("2026-10-11");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-27", 7)).toBe("2027-01-03");
  });
  it("handles leap days", () => {
    expect(addDays("2028-02-25", 7)).toBe("2028-03-03"); // 2028 is a leap year
    expect(addDays("2026-02-25", 7)).toBe("2026-03-04");
    expect(addDays("2028-02-22", 7)).toBe("2028-02-29");
  });
  it("can go backwards, and keeps the same weekday after 7 days", () => {
    expect(addDays("2026-10-04", -4)).toBe("2026-09-30");
    const weekday = (d: string) => new Date(d + "T00:00:00Z").getUTCDay();
    expect(weekday(addDays("2026-10-04", 7))).toBe(weekday("2026-10-04"));
  });
  it("returns an invalid date unchanged instead of guessing", () => {
    expect(addDays("nope", 7)).toBe("nope");
    expect(addDays("2026-02-30", 7)).toBe("2026-02-30");
  });
});

describe("copyTitle", () => {
  it("adds (copy), then counts up", () => {
    expect(copyTitle("Sunday Service")).toBe("Sunday Service (copy)");
    expect(copyTitle("Sunday Service (copy)")).toBe("Sunday Service (copy 2)");
    expect(copyTitle("Sunday Service (copy 2)")).toBe("Sunday Service (copy 3)");
    expect(copyTitle("Sunday Service (copy 9)")).toBe("Sunday Service (copy 10)");
  });
  it("tidies spaces", () => {
    expect(copyTitle("  Youth Night  ")).toBe("Youth Night (copy)");
  });
  it("only counts a real '(copy)' at the end", () => {
    expect(copyTitle("Copy of the year (special)")).toBe("Copy of the year (special) (copy)");
    expect(copyTitle("(copy) Sunday")).toBe("(copy) Sunday (copy)");
  });
  it("never goes over the 200-character title limit", () => {
    const long = "x".repeat(200);
    const once = copyTitle(long);
    expect(once).toHaveLength(200);
    expect(once.endsWith(" (copy)")).toBe(true);
    expect(copyTitle(once).length).toBeLessThanOrEqual(200);
    expect(copyTitle(once).endsWith(" (copy 2)")).toBe(true);
  });
});

describe("date and time formatting", () => {
  it("formats a date without shifting the day", () => {
    expect(formatServiceDate("2026-10-04")).toBe("Sun, Oct 4, 2026");
    expect(formatServiceDate("2026-01-01")).toBe("Thu, Jan 1, 2026");
  });
  it("handles missing or bad dates", () => {
    expect(formatServiceDate(null)).toBe("No date");
    expect(formatServiceDate("nope")).toBe("No date");
  });
  it("formats 24-hour times as 12-hour", () => {
    expect(formatServiceTime("09:30:00")).toBe("9:30 AM");
    expect(formatServiceTime("09:30")).toBe("9:30 AM");
    expect(formatServiceTime("00:05:00")).toBe("12:05 AM");
    expect(formatServiceTime("12:00:00")).toBe("12:00 PM");
    expect(formatServiceTime("18:45:00")).toBe("6:45 PM");
    expect(formatServiceTime(null)).toBe("");
  });
  it("validates real calendar dates", () => {
    expect(isValidDate("2026-10-04")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("10/04/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("splitUpcomingPast", () => {
  const l = (id: string, service_date: string | null, service_time: string | null = null) => ({
    id,
    service_date,
    service_time,
  });

  it("puts today and later in 'upcoming' (soonest first) and earlier in 'past' (latest first)", () => {
    const lineups = [
      l("old", "2026-09-01"),
      l("later", "2026-10-18"),
      l("today-pm", "2026-10-04", "18:00:00"),
      l("last-week", "2026-09-27"),
      l("today-am", "2026-10-04", "09:00:00"),
      l("today-notime", "2026-10-04"),
    ];
    const { upcoming, past } = splitUpcomingPast(lineups, "2026-10-04");
    expect(upcoming.map((x) => x.id)).toEqual(["today-am", "today-pm", "today-notime", "later"]);
    expect(past.map((x) => x.id)).toEqual(["last-week", "old"]);
  });

  it("keeps undated lineups in 'upcoming', after dated ones", () => {
    const { upcoming, past } = splitUpcomingPast([l("none", null), l("dated", "2026-11-01")], "2026-10-04");
    expect(upcoming.map((x) => x.id)).toEqual(["dated", "none"]);
    expect(past).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(splitUpcomingPast([], "2026-10-04")).toEqual({ upcoming: [], past: [] });
  });
});

describe("formatTimestamp", () => {
  it("shows the time in the given time zone", () => {
    expect(formatTimestamp("2026-10-02T07:41:00Z", "Asia/Manila")).toBe("Oct 2, 2026, 3:41 PM");
    expect(formatTimestamp("2026-10-02T07:41:00Z", "UTC")).toBe("Oct 2, 2026, 7:41 AM");
    expect(formatTimestamp("nope", "UTC")).toBe("");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-04T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

  it("says 'just now' for the last few seconds, and for a clock that runs slightly fast", () => {
    expect(timeAgo(ago(5 * SEC), now)).toBe("just now");
    expect(timeAgo(ago(40 * SEC), now)).toBe("just now");
    expect(timeAgo(ago(-10 * SEC), now)).toBe("just now");
  });
  it("counts minutes, hours and days", () => {
    expect(timeAgo(ago(2 * MIN), now)).toBe("2 min ago");
    expect(timeAgo(ago(59 * MIN), now)).toBe("59 min ago");
    expect(timeAgo(ago(3 * HOUR), now)).toBe("3 hr ago");
    expect(timeAgo(ago(30 * HOUR), now)).toBe("yesterday");
    expect(timeAgo(ago(4 * DAY), now)).toBe("4 days ago");
  });
  it("switches to a plain date after a week", () => {
    expect(timeAgo(ago(10 * DAY), now)).toBe("Sep 24, 2026");
  });
  it("returns an empty string for a bad date", () => {
    expect(timeAgo("not a date", now)).toBe("");
  });
});

describe("moveItem (reordering)", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item down and up", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(list, 1, 0)).toEqual(["b", "a", "c", "d"]);
  });

  it("never changes the original list", () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("does nothing for the same spot or out-of-range spots", () => {
    expect(moveItem(list, 2, 2)).toEqual(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 0, 4)).toEqual(list);
    expect(moveItem([], 0, 0)).toEqual([]);
  });

  it("keeps every item exactly once", () => {
    for (let from = 0; from < list.length; from++) {
      for (let to = 0; to < list.length; to++) {
        expect([...moveItem(list, from, to)].sort()).toEqual(list);
      }
    }
  });
});

describe("keyChoices", () => {
  it("offers major keys for a major song and minor keys for a minor song", () => {
    expect(keyChoices("G")).toContain("Bb");
    expect(keyChoices("G").every((k) => !k.endsWith("m"))).toBe(true);
    expect(keyChoices("Am").every((k) => k.endsWith("m"))).toBe(true);
    expect(keyChoices("Am")).toContain("F#m");
  });
  it("offers all keys when the song has none", () => {
    expect(keyChoices(null)).toContain("G");
    expect(keyChoices(null)).toContain("Gm");
    expect(keyChoices("nonsense")).toContain("Gm");
  });
});

describe("parseItemPatch", () => {
  const leader = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a key, a leader and a note, and trims the note", () => {
    expect(parseItemPatch({ keyOverride: "Bb", leaderId: leader, note: "  slow  " })).toEqual({
      ok: true,
      columns: { key_override: "Bb", leader_id: leader, note: "slow" },
    });
  });

  it("turns empty values into null (back to the song's own key, no leader, no note)", () => {
    expect(parseItemPatch({ keyOverride: "", leaderId: "", note: "   " })).toEqual({
      ok: true,
      columns: { key_override: null, leader_id: null, note: null },
    });
    expect(parseItemPatch({ keyOverride: null, leaderId: null })).toEqual({
      ok: true,
      columns: { key_override: null, leader_id: null },
    });
  });

  it("only changes the fields that were sent", () => {
    expect(parseItemPatch({ note: "hi" })).toEqual({ ok: true, columns: { note: "hi" } });
    expect(parseItemPatch({})).toEqual({ ok: true, columns: {} });
  });

  it("rejects a bad key, a bad leader id and a long note", () => {
    expect(parseItemPatch({ keyOverride: "H#" }).ok).toBe(false);
    expect(parseItemPatch({ keyOverride: "G; drop table" }).ok).toBe(false);
    expect(parseItemPatch({ leaderId: "not-a-uuid" }).ok).toBe(false);
    expect(parseItemPatch({ note: "x".repeat(501) }).ok).toBe(false);
  });
});

describe("parseLineupForm", () => {
  it("accepts a good form and trims the time to HH:MM", () => {
    const result = parseLineupForm(
      form({ title: " Sunday Service ", serviceDate: "2026-10-04", serviceTime: "09:30:00", serviceType: "Sunday", notes: " Closing song slow " }),
    );
    expect(result).toEqual({
      ok: true,
      value: { id: null, title: "Sunday Service", serviceDate: "2026-10-04", serviceTime: "09:30", serviceType: "Sunday", notes: "Closing song slow" },
    });
  });

  it("makes the time optional", () => {
    const result = parseLineupForm(form({ title: "X", serviceDate: "2026-10-04" }));
    expect(result.ok && result.value.serviceTime).toBe(null);
  });

  it("reports every problem at once", () => {
    const result = parseLineupForm(form({ title: "", serviceDate: "2026-02-30", serviceTime: "25:99" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["date", "time", "title"]);
  });

  it("keeps a valid UUID id and ignores a bad one", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseLineupForm(form({ title: "X", serviceDate: "2026-10-04", id }))).toMatchObject({ ok: true, value: { id } });
    expect(parseLineupForm(form({ title: "X", serviceDate: "2026-10-04", id: "1; drop table" }))).toMatchObject({ ok: true, value: { id: null } });
  });
});
