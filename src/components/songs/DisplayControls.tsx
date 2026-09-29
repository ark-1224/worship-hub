"use client";

import { MAX_FONT_STEP, MAX_SCROLL_LEVEL } from "@/lib/display";

// The row of display buttons shared by the song page and stage mode:
// text size, chords on/off, and auto-scroll with a speed control.
// Buttons are at least 44px tall so they're easy to hit on a phone.
// data-autoscroll-ignore keeps tapping them from stopping the auto-scroll.

const button =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-base font-semibold disabled:opacity-40";

export function DisplayControls({
  dark = false,
  fontStep,
  onFontStep,
  showChords,
  onShowChords,
  scrolling,
  onToggleScroll,
  scrollLevel,
  onScrollLevel,
}: {
  dark?: boolean;
  fontStep: number;
  onFontStep: (step: number) => void;
  showChords: boolean;
  onShowChords: (show: boolean) => void;
  scrolling: boolean;
  onToggleScroll: () => void;
  scrollLevel: number;
  onScrollLevel: (level: number) => void;
}) {
  const idle = dark
    ? "border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700"
    : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100";
  const on = dark ? "border-amber-300 bg-amber-300 text-black" : "border-accent-600 bg-accent-600 text-white";

  return (
    <div data-autoscroll-ignore className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1" role="group" aria-label="Text size">
        <button
          type="button"
          onClick={() => onFontStep(fontStep - 1)}
          disabled={fontStep <= 0}
          aria-label="Smaller text"
          className={`${button} ${idle} text-sm`}
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => onFontStep(fontStep + 1)}
          disabled={fontStep >= MAX_FONT_STEP}
          aria-label="Larger text"
          className={`${button} ${idle} text-lg`}
        >
          A+
        </button>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={showChords}
        onClick={() => onShowChords(!showChords)}
        className={`${button} ${showChords ? on : idle}`}
      >
        Chords {showChords ? "on" : "off"}
      </button>

      <div className="flex items-center gap-1" role="group" aria-label="Auto-scroll">
        <button
          type="button"
          onClick={onToggleScroll}
          aria-pressed={scrolling}
          className={`${button} ${scrolling ? on : idle} min-w-24`}
        >
          {scrolling ? "⏸ Pause" : "▶ Scroll"}
        </button>
        <button
          type="button"
          onClick={() => onScrollLevel(scrollLevel - 1)}
          disabled={scrollLevel <= 1}
          aria-label="Scroll slower"
          className={`${button} ${idle}`}
        >
          −
        </button>
        <span className={`min-w-10 text-center text-sm ${dark ? "text-stone-300" : "text-stone-600"}`} aria-live="polite">
          <span className="sr-only">Scroll speed </span>
          {scrollLevel}/{MAX_SCROLL_LEVEL}
        </span>
        <button
          type="button"
          onClick={() => onScrollLevel(scrollLevel + 1)}
          disabled={scrollLevel >= MAX_SCROLL_LEVEL}
          aria-label="Scroll faster"
          className={`${button} ${idle}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
