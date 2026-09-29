import { describe, expect, it } from "vitest";
import {
  EMPTY_LOOP,
  MIN_LOOP_SECONDS,
  formatTime,
  isLoopReady,
  nudgeLoop,
  setLoopEnd,
  setLoopStart,
  shouldLoopBack,
} from "./loop";

describe("formatTime", () => {
  it("shows minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(3599)).toBe("59:59");
  });
  it("shows a dash when unset and never goes negative", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(-5)).toBe("0:00");
  });
});

describe("setLoopStart / setLoopEnd", () => {
  it("sets a start, then an end after it", () => {
    const a = setLoopStart(EMPTY_LOOP, 30.26);
    expect(a.loop).toEqual({ start: 30.3, end: null });
    const b = setLoopEnd(a.loop, 45);
    expect(b).toEqual({ loop: { start: 30.3, end: 45 } });
    expect(isLoopReady(b.loop)).toBe(true);
  });

  it("refuses an end at or before the start, and keeps the loop as it was", () => {
    const loop = { start: 30, end: null };
    for (const time of [10, 30, 30.5]) {
      const result = setLoopEnd(loop, time);
      expect(result.error).toMatch(/end has to come after/i);
      expect(result.loop).toEqual(loop);
    }
  });

  it("allows an end when there is no start yet (loops from the beginning)", () => {
    expect(setLoopEnd(EMPTY_LOOP, 20)).toEqual({ loop: { start: null, end: 20 } });
    expect(setLoopEnd(EMPTY_LOOP, 0.5).error).toBeDefined();
  });

  it("clears the end if a new start lands on or after it", () => {
    expect(setLoopStart({ start: 10, end: 20 }, 25).loop).toEqual({ start: 25, end: null });
    expect(setLoopStart({ start: 10, end: 20 }, 19.5).loop).toEqual({ start: 19.5, end: null });
    expect(setLoopStart({ start: 10, end: 20 }, 15).loop).toEqual({ start: 15, end: 20 });
  });

  it("never allows negative times", () => {
    expect(setLoopStart(EMPTY_LOOP, -3).loop.start).toBe(0);
  });
});

describe("nudgeLoop", () => {
  const loop = { start: 30, end: 45 };
  it("moves the start and end by a second", () => {
    expect(nudgeLoop(loop, "start", -1).loop).toEqual({ start: 29, end: 45 });
    expect(nudgeLoop(loop, "end", 1).loop).toEqual({ start: 30, end: 46 });
  });
  it("won't cross the two markers or go below zero", () => {
    expect(nudgeLoop({ start: 30, end: 31 }, "start", 1).loop).toEqual({ start: 30, end: 31 });
    expect(nudgeLoop({ start: 30, end: 31 }, "end", -1).loop).toEqual({ start: 30, end: 31 });
    expect(nudgeLoop({ start: 0.4, end: 20 }, "start", -1).loop.start).toBe(0);
  });
  it("does nothing for a marker that isn't set", () => {
    expect(nudgeLoop(EMPTY_LOOP, "end", 1).loop).toEqual(EMPTY_LOOP);
  });
});

describe("isLoopReady / shouldLoopBack", () => {
  it("needs both ends and a long enough section", () => {
    expect(isLoopReady(EMPTY_LOOP)).toBe(false);
    expect(isLoopReady({ start: 5, end: null })).toBe(false);
    expect(isLoopReady({ start: 5, end: 5 + MIN_LOOP_SECONDS - 0.1 })).toBe(false);
    expect(isLoopReady({ start: 5, end: 5 + MIN_LOOP_SECONDS })).toBe(true);
  });

  it("jumps back when playback reaches (or has passed) the end", () => {
    const loop = { start: 30, end: 45 };
    expect(shouldLoopBack(20, loop)).toBe(false);
    expect(shouldLoopBack(44, loop)).toBe(false);
    expect(shouldLoopBack(44.8, loop)).toBe(true); // within the polling tolerance
    expect(shouldLoopBack(45, loop)).toBe(true);
    expect(shouldLoopBack(70, loop)).toBe(true); // the viewer skipped past the end
  });

  it("never jumps for an incomplete loop", () => {
    expect(shouldLoopBack(100, EMPTY_LOOP)).toBe(false);
    expect(shouldLoopBack(100, { start: 5, end: null })).toBe(false);
  });
});
