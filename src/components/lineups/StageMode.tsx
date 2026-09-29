"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseChordPro } from "@/lib/chords/chordpro";
import { chordTransposer, guessKey, keyName, parseKey, semitonesToKey } from "@/lib/chords/transpose";
import {
  DEFAULT_SCROLL_LEVEL,
  DEFAULT_STAGE_FONT_STEP,
  MAX_FONT_STEP,
  MAX_SCROLL_LEVEL,
  fontSizePx,
  scrollSpeed,
  swipeDirection,
} from "@/lib/display";
import { useAccidentalSetting } from "@/lib/useAccidentalSetting";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { useLocalNumber, useLocalSetting } from "@/lib/useLocalSetting";
import { useWakeLock } from "@/lib/useWakeLock";
import { ChordSheet } from "@/components/songs/ChordSheet";
import { DisplayControls } from "@/components/songs/DisplayControls";

export type StageSong = {
  itemId: string;
  title: string;
  artist: string | null;
  chordText: string;
  originalKey: string | null;
  keyOverride: string | null; // the key chosen for this service
  leader: string | null;
  note: string | null;
};

// Full-screen "on stage" view of a lineup: big text on black, one song at a
// time. Move between songs by swiping, the Previous / Next buttons, or the
// arrow keys. Each song opens in the key chosen for this service. The screen
// stays awake. Covers the normal page header (fixed + z-50) rather than
// needing its own layout.
export function StageMode({
  lineupId,
  lineupTitle,
  songs,
  startIndex,
}: {
  lineupId: string;
  lineupTitle: string;
  songs: StageSong[];
  startIndex: number;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(songs.length - 1, 0)));
  const [barOpen, setBarOpen] = useState(true);

  const [setting] = useAccidentalSetting();
  const [fontStep, setFontStep] = useLocalNumber("worship-hub:stage-font-step", DEFAULT_STAGE_FONT_STEP, 0, MAX_FONT_STEP);
  const [chordsSetting, setChordsSetting] = useLocalSetting("worship-hub:stage-chords", "on", ["on", "off"] as const);
  const [scrollLevel, setScrollLevel] = useLocalNumber(
    "worship-hub:stage-scroll-level",
    DEFAULT_SCROLL_LEVEL,
    1,
    MAX_SCROLL_LEVEL,
  );

  const panel = useRef<HTMLDivElement>(null);
  const autoScroll = useAutoScroll(scrollSpeed(scrollLevel), panel);
  const awake = useWakeLock(true);

  const song = songs[index];
  const lines = useMemo(() => parseChordPro(song?.chordText ?? ""), [song?.chordText]);

  // The key for this service, worked out the same way as on the song page.
  const baseKey = song ? parseKey(song.originalKey ?? guessKey(song.chordText) ?? "") : null;
  const semitones = song ? semitonesToKey(song.originalKey ?? guessKey(song.chordText), song.keyOverride) : 0;
  const shownKey = baseKey ? keyName((baseKey.pitch + semitones) % 12, baseKey.minor, setting) : null;
  const transpose = chordTransposer(setting, semitones, shownKey);

  const go = (next: number) => {
    if (next < 0 || next >= songs.length || next === index) return;
    setIndex(next);
    autoScroll.stop();
    panel.current?.scrollTo({ top: 0 });
    // Keep the address in step, so a refresh stays on this song.
    window.history.replaceState(null, "", `/lineups/${lineupId}/stage?s=${next + 1}`);
  };

  // Arrow keys move between songs; Escape leaves stage mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Escape") router.push(`/lineups/${lineupId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Swipe: remember where a finger went down, and decide on release.
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const direction = swipeDirection(e.clientX - start.x, e.clientY - start.y, performance.now() - start.t);
    if (direction === "next") go(index + 1);
    else if (direction === "prev") go(index - 1);
  };

  const navButton =
    "inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-stone-600 bg-stone-800 px-4 text-lg font-bold text-white hover:bg-stone-700 disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-black text-white">
      <header className="flex items-center gap-3 border-b border-stone-800 px-3 py-2">
        <Link
          href={`/lineups/${lineupId}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-stone-600 px-3 text-sm font-semibold hover:bg-stone-800"
        >
          ✕ Exit
        </Link>
        <div className="min-w-0 flex-1 text-center">
          {song ? (
            <>
              <p className="truncate text-lg font-bold leading-tight">{song.title}</p>
              <p className="truncate text-sm text-stone-400">
                {shownKey && <span className="font-semibold text-amber-300">Key {shownKey}</span>}
                {song.keyOverride && song.originalKey && song.keyOverride !== song.originalKey && (
                  <span> (original {song.originalKey})</span>
                )}
                {song.leader && <span> · Lead: {song.leader}</span>}
                {song.note && <span> · {song.note}</span>}
              </p>
            </>
          ) : (
            <p className="truncate font-bold">{lineupTitle}</p>
          )}
        </div>
        <div className="text-right text-sm font-semibold text-stone-300">
          {songs.length > 0 && (
            <p aria-live="polite">
              {index + 1} / {songs.length}
            </p>
          )}
          <p className="text-xs text-stone-500" title={awake ? "The screen will stay on" : "Screen may dim"}>
            {awake ? "☀ awake" : ""}
          </p>
        </div>
      </header>

      {/* The lyrics. touch-pan-y: up/down still scrolls; sideways swipes reach our handler. */}
      <div
        ref={panel}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-4 select-none"
      >
        {song ? (
          <>
            <ChordSheet
              lines={lines}
              transposeChord={transpose}
              fontSizePx={fontSizePx(fontStep)}
              showChords={chordsSetting === "on"}
              variant="dark"
            />
            {/* Room at the end so the last lines can scroll up into view. */}
            <div className="h-[40dvh]" aria-hidden />
          </>
        ) : (
          <div className="mx-auto max-w-md space-y-3 pt-16 text-center">
            <p className="text-xl font-bold">This lineup has no songs yet.</p>
            <Link href={`/lineups/${lineupId}`} className="inline-block text-amber-300 underline">
              Back to the lineup to add some
            </Link>
          </div>
        )}
      </div>

      {barOpen ? (
        <footer className="space-y-2 border-t border-stone-800 bg-black px-3 py-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={navButton}>
              ◀ Previous
            </button>
            <button type="button" onClick={() => go(index + 1)} disabled={index >= songs.length - 1} className={navButton}>
              Next ▶
            </button>
          </div>
          <DisplayControls
            dark
            fontStep={fontStep}
            onFontStep={setFontStep}
            showChords={chordsSetting === "on"}
            onShowChords={(show) => setChordsSetting(show ? "on" : "off")}
            scrolling={autoScroll.running}
            onToggleScroll={autoScroll.toggle}
            scrollLevel={scrollLevel}
            onScrollLevel={setScrollLevel}
          />
          <button
            type="button"
            data-autoscroll-ignore
            onClick={() => setBarOpen(false)}
            className="min-h-10 w-full text-center text-sm text-stone-500 hover:text-stone-300"
          >
            ▾ Hide controls
          </button>
        </footer>
      ) : (
        <button
          type="button"
          data-autoscroll-ignore
          onClick={() => setBarOpen(true)}
          className="absolute right-3 bottom-3 inline-flex min-h-11 items-center rounded-full border border-stone-600 bg-stone-900/90 px-4 text-sm font-semibold text-white"
        >
          ▴ Controls
        </button>
      )}
    </div>
  );
}
