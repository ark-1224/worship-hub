// Pure helpers for the song display tools and stage mode: font sizes,
// auto-scroll pacing and swipe detection. No React in here, so they're easy to test.

// ---------------------------------------------------------------------------
// Font size
// ---------------------------------------------------------------------------

/** Font sizes in pixels. Members move up or down one step at a time (A− / A+). */
export const FONT_STEPS = [13, 15, 17, 19, 22, 26, 30, 36, 44] as const;
export const MAX_FONT_STEP = FONT_STEPS.length - 1;

export const DEFAULT_SONG_FONT_STEP = 2; // 17px, comfortable on a phone
export const DEFAULT_STAGE_FONT_STEP = 6; // 30px, readable at arm's length on a stand

/** Keeps a step inside the available range (and whole). */
export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return DEFAULT_SONG_FONT_STEP;
  return Math.min(MAX_FONT_STEP, Math.max(0, Math.round(step)));
}

export const fontSizePx = (step: number): number => FONT_STEPS[clampStep(step)];

// ---------------------------------------------------------------------------
// Auto-scroll
// ---------------------------------------------------------------------------

/** Scroll speeds in pixels per second, for speed levels 1 to 10. */
export const SCROLL_SPEEDS = [8, 12, 18, 25, 34, 45, 60, 80, 105, 140] as const;
export const MAX_SCROLL_LEVEL = SCROLL_SPEEDS.length;
export const DEFAULT_SCROLL_LEVEL = 4;

export function scrollSpeed(level: number): number {
  const i = Math.min(MAX_SCROLL_LEVEL, Math.max(1, Math.round(level))) - 1;
  return SCROLL_SPEEDS[i];
}

// If the phone was asleep or the tab was hidden, one "frame" can be seconds
// long. Never scroll more than this much time's worth in one go.
const MAX_FRAME_MS = 100;

/**
 * How far to scroll for one animation frame. Browsers scroll in whole pixels,
 * so a slow speed (8 px/s = 0.13 px per frame) would never move if we rounded
 * each frame. Instead the leftover fraction is carried to the next frame.
 */
export function scrollStep(
  remainder: number,
  pixelsPerSecond: number,
  elapsedMs: number,
): { pixels: number; remainder: number } {
  const elapsed = Math.min(Math.max(elapsedMs, 0), MAX_FRAME_MS);
  const total = remainder + (pixelsPerSecond * elapsed) / 1000;
  const pixels = Math.floor(total);
  return { pixels, remainder: total - pixels };
}

/** True when the page or panel is scrolled to (within a couple of pixels of) the end. */
export function atBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 2): boolean {
  return scrollTop + clientHeight >= scrollHeight - slack;
}

// ---------------------------------------------------------------------------
// Swipe
// ---------------------------------------------------------------------------

const SWIPE_MIN_DISTANCE = 60; // px sideways
const SWIPE_MAX_MS = 800;
const SWIPE_DIRECTION_RATIO = 1.5; // must be clearly more sideways than up/down

/**
 * Turns a finger movement into "go to the next/previous song", or null if it
 * wasn't a deliberate sideways swipe (a slow drag, a short flick, or mostly
 * vertical movement, which is just scrolling the lyrics).
 * Swiping left (negative dx) means "next", like turning a page.
 */
export function swipeDirection(dx: number, dy: number, elapsedMs: number): "next" | "prev" | null {
  if (elapsedMs > SWIPE_MAX_MS) return null;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return null;
  return dx < 0 ? "next" : "prev";
}
