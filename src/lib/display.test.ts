import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCROLL_LEVEL,
  FONT_STEPS,
  MAX_FONT_STEP,
  SCROLL_SPEEDS,
  atBottom,
  clampStep,
  fontSizePx,
  scrollSpeed,
  scrollStep,
  swipeDirection,
} from "./display";

describe("font size steps", () => {
  it("increase steadily so every A+ visibly grows the text", () => {
    for (let i = 1; i < FONT_STEPS.length; i++) expect(FONT_STEPS[i]).toBeGreaterThan(FONT_STEPS[i - 1]);
  });
  it("clamps to the available range", () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(99)).toBe(MAX_FONT_STEP);
    expect(clampStep(2.6)).toBe(3);
    expect(clampStep(Number.NaN)).toBe(2);
  });
  it("maps a step to pixels, even for out-of-range steps", () => {
    expect(fontSizePx(0)).toBe(FONT_STEPS[0]);
    expect(fontSizePx(1000)).toBe(FONT_STEPS[MAX_FONT_STEP]);
  });
});

describe("scroll speed", () => {
  it("gets faster with each level", () => {
    for (let i = 1; i < SCROLL_SPEEDS.length; i++) expect(SCROLL_SPEEDS[i]).toBeGreaterThan(SCROLL_SPEEDS[i - 1]);
  });
  it("maps levels 1 to 10 and clamps the rest", () => {
    expect(scrollSpeed(1)).toBe(SCROLL_SPEEDS[0]);
    expect(scrollSpeed(10)).toBe(SCROLL_SPEEDS[9]);
    expect(scrollSpeed(0)).toBe(SCROLL_SPEEDS[0]);
    expect(scrollSpeed(50)).toBe(SCROLL_SPEEDS[9]);
    expect(scrollSpeed(DEFAULT_SCROLL_LEVEL)).toBe(25);
  });
});

describe("scrollStep", () => {
  it("carries fractions between frames so slow speeds still move", () => {
    // 8 px/second at 60 frames per second is 0.13 px per frame.
    let remainder = 0;
    let moved = 0;
    for (let frame = 0; frame < 60; frame++) {
      const step = scrollStep(remainder, 8, 1000 / 60);
      moved += step.pixels;
      remainder = step.remainder;
    }
    // One second's worth, none lost: what moved plus what is still carried over.
    expect(moved + remainder).toBeCloseTo(8, 6);
    expect(moved).toBeGreaterThanOrEqual(7);
  });

  it("scrolls the same distance however the time is sliced", () => {
    const run = (frames: number, ms: number) => {
      let remainder = 0;
      let moved = 0;
      for (let i = 0; i < frames; i++) {
        const step = scrollStep(remainder, 60, ms);
        moved += step.pixels;
        remainder = step.remainder;
      }
      return moved;
    };
    expect(run(60, 1000 / 60)).toBe(60);
    expect(run(30, 1000 / 30)).toBe(60);
    expect(run(10, 100)).toBe(60);
  });

  it("caps a huge gap (asleep phone, hidden tab) so the page doesn't jump", () => {
    expect(scrollStep(0, 100, 60_000).pixels).toBe(10); // 100 px/s x 0.1 s
  });

  it("ignores negative or zero time", () => {
    expect(scrollStep(0.5, 100, -50)).toEqual({ pixels: 0, remainder: 0.5 });
    expect(scrollStep(0, 100, 0)).toEqual({ pixels: 0, remainder: 0 });
  });
});

describe("atBottom", () => {
  it("is true at the end, with a little slack for rounding", () => {
    expect(atBottom(1000, 800, 1800)).toBe(true);
    expect(atBottom(999, 800, 1800)).toBe(true);
    expect(atBottom(500, 800, 1800)).toBe(false);
  });
  it("is true for a page too short to scroll", () => {
    expect(atBottom(0, 800, 600)).toBe(true);
  });
});

describe("swipeDirection", () => {
  it("swipe left = next song, swipe right = previous song", () => {
    expect(swipeDirection(-120, 10, 200)).toBe("next");
    expect(swipeDirection(120, -10, 200)).toBe("prev");
  });
  it("ignores short movements", () => {
    expect(swipeDirection(-40, 0, 100)).toBeNull();
  });
  it("ignores mostly-vertical movement (that's scrolling the lyrics)", () => {
    expect(swipeDirection(-80, 200, 200)).toBeNull();
    expect(swipeDirection(-100, 90, 200)).toBeNull();
  });
  it("ignores slow drags", () => {
    expect(swipeDirection(-200, 0, 1500)).toBeNull();
  });
});
