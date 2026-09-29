// "Loop a section": repeat part of a video (say, the bridge) while practising.
// A loop is a start time and an end time in seconds. Pure helpers, no video code.

export type Loop = { start: number | null; end: number | null };

export const EMPTY_LOOP: Loop = { start: null, end: null };

/** A loop shorter than this isn't useful (and would stutter). */
export const MIN_LOOP_SECONDS = 1;

/** How close to the end (seconds) counts as "reached it". Covers the polling gap. */
const END_TOLERANCE = 0.25;

const round = (seconds: number) => Math.max(0, Math.round(seconds * 10) / 10);

/** "65.3" -> "1:05". */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** True when both ends are set and the section is long enough to loop. */
export function isLoopReady(loop: Loop): loop is { start: number; end: number } {
  return loop.start !== null && loop.end !== null && loop.end - loop.start >= MIN_LOOP_SECONDS;
}

type Result = { loop: Loop; error?: string };

/** Sets the start at `time`. A start that lands at or after the end clears the end. */
export function setLoopStart(loop: Loop, time: number): Result {
  const start = round(time);
  if (loop.end !== null && start > loop.end - MIN_LOOP_SECONDS) {
    return { loop: { start, end: null } };
  }
  return { loop: { start, end: loop.end } };
}

/** Sets the end at `time`; it must come after the start (or after 0:00 if there's no start yet). */
export function setLoopEnd(loop: Loop, time: number): Result {
  const end = round(time);
  if (end < (loop.start ?? 0) + MIN_LOOP_SECONDS) {
    return { loop, error: "The end has to come after the start. Move the video forward and try again." };
  }
  return { loop: { start: loop.start, end } };
}

/** Moves the start or the end by `delta` seconds (for fine adjustment), keeping the loop valid. */
export function nudgeLoop(loop: Loop, which: "start" | "end", delta: number): Result {
  const current = loop[which];
  if (current === null) return { loop };
  const next = round(current + delta);
  if (which === "start") {
    if (loop.end !== null && next > loop.end - MIN_LOOP_SECONDS) return { loop };
    return { loop: { ...loop, start: next } };
  }
  if (next < (loop.start ?? 0) + MIN_LOOP_SECONDS) return { loop };
  return { loop: { ...loop, end: next } };
}

/** Should playback jump back to the start of the loop right now? */
export function shouldLoopBack(currentTime: number, loop: Loop): boolean {
  return isLoopReady(loop) && currentTime >= loop.end - END_TOLERANCE;
}
