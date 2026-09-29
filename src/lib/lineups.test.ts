import { describe, expect, it } from "vitest";
import {
  formatServiceDate,
  formatServiceTime,
  isValidDate,
  parseLineupForm,
  splitUpcomingPast,
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
