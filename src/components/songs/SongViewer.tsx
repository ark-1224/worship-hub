"use client";

import { useMemo, useState } from "react";
import { parseChordPro } from "@/lib/chords/chordpro";
import {
  chordTransposer,
  guessKey,
  keyName,
  parseKey,
  semitonesToKey,
  type AccidentalSetting,
} from "@/lib/chords/transpose";
import {
  DEFAULT_SCROLL_LEVEL,
  DEFAULT_SONG_FONT_STEP,
  MAX_FONT_STEP,
  MAX_SCROLL_LEVEL,
  fontSizePx,
  scrollSpeed,
} from "@/lib/display";
import { useAccidentalSetting } from "@/lib/useAccidentalSetting";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { useLocalNumber, useLocalSetting } from "@/lib/useLocalSetting";
import { ChordSheet } from "./ChordSheet";
import { DisplayControls } from "./DisplayControls";

const SETTINGS: { value: AccidentalSetting; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Sharps or flats to suit the key" },
  { value: "sharps", label: "♯", hint: "Always sharps" },
  { value: "flats", label: "♭", hint: "Always flats" },
];

// Chords + the transpose controls. Transposing is VIEW ONLY: it lives in this
// component's state, so it resets on reload and never changes the saved song
// or its original key.
export function SongViewer({
  chordText,
  originalKey,
  initialKey = null,
}: {
  chordText: string;
  originalKey: string | null;
  /** Open in this key (e.g. the key chosen in a lineup). Still view-only. */
  initialKey?: string | null;
}) {
  // No saved key? Guess from the first chord so the controls still work.
  const guessed = originalKey ? null : guessKey(chordText);
  const startSemitones = semitonesToKey(originalKey ?? guessed, initialKey);

  const [semitones, setSemitones] = useState(startSemitones); // 0..11 above the original key
  const [setting, setSetting] = useAccidentalSetting();

  // Display choices, remembered on this device: text size, chords on/off, scroll speed.
  const [fontStep, setFontStep] = useLocalNumber("worship-hub:font-step", DEFAULT_SONG_FONT_STEP, 0, MAX_FONT_STEP);
  const [chordsSetting, setChordsSetting] = useLocalSetting("worship-hub:chords", "on", ["on", "off"] as const);
  const [scrollLevel, setScrollLevel] = useLocalNumber("worship-hub:scroll-level", DEFAULT_SCROLL_LEVEL, 1, MAX_SCROLL_LEVEL);
  const autoScroll = useAutoScroll(scrollSpeed(scrollLevel));

  const lines = useMemo(() => parseChordPro(chordText), [chordText]);

  const baseKey = parseKey(originalKey ?? guessed ?? "");

  const currentPitch = baseKey ? (baseKey.pitch + semitones) % 12 : 0;
  const currentKeyName = baseKey ? keyName(currentPitch, baseKey.minor, setting) : null;

  // Shifts each chord and picks sharps or flats (see chordTransposer).
  const transpose = chordTransposer(setting, semitones, currentKeyName);

  const step = (delta: number) => setSemitones((s) => (s + delta + 12) % 12);
  const chooseKey = (pitch: number) => baseKey && setSemitones((pitch - baseKey.pitch + 12) % 12);

  // The dropdown always lists the 12 keys (in the song's major/minor mode).
  const keyOptions = baseKey
    ? Array.from({ length: 12 }, (_, pitch) => ({ pitch, name: keyName(pitch, baseKey.minor, setting) }))
    : [];

  const shownShift = semitones > 6 ? semitones - 12 : semitones; // "+2" or "-3", never "+10"

  return (
    <div className="space-y-4">
      <section aria-label="Transpose" className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="label">Transpose</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Down one semitone"
                className="btn-secondary w-12 px-0! text-xl"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Up one semitone"
                className="btn-secondary w-12 px-0! text-xl"
              >
                +
              </button>
            </div>
          </div>

          {baseKey && (
            <div className="min-w-28 flex-1 sm:flex-none">
              <label htmlFor="key" className="label">
                Key{guessed ? " (guessed)" : ""}
              </label>
              <select
                id="key"
                value={currentPitch}
                onChange={(e) => chooseKey(Number(e.target.value))}
                className="input font-semibold"
              >
                {keyOptions.map((o) => (
                  <option key={o.pitch} value={o.pitch}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {semitones !== 0 && (
            <button type="button" onClick={() => setSemitones(0)} className="btn-secondary">
              Reset{baseKey ? ` to ${keyName(baseKey.pitch, baseKey.minor, setting)}` : ""}
            </button>
          )}
        </div>

        <div>
          <span className="label" id="accidentals-label">
            Sharps / flats
          </span>
          <div role="radiogroup" aria-labelledby="accidentals-label" className="inline-flex overflow-hidden rounded-lg border border-stone-300">
            {SETTINGS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={setting === s.value}
                title={s.hint}
                onClick={() => setSetting(s.value)}
                className={`min-h-11 min-w-14 px-4 text-base font-semibold ${
                  setting === s.value ? "bg-accent-600 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-stone-600" aria-live="polite">
          {initialKey && startSemitones !== 0 && semitones === startSemitones
            ? `Showing the key chosen for this service (${initialKey}). The saved song isn't changed.`
            : semitones === 0
              ? "Showing the original chords."
              : `Transposed ${shownShift > 0 ? "+" : "−"}${Math.abs(shownShift)} for this view only. The saved song isn't changed.`}
        </p>
      </section>

      <div className="card overflow-x-auto">
        <ChordSheet
          lines={lines}
          transposeChord={transpose}
          fontSizePx={fontSizePx(fontStep)}
          showChords={chordsSetting === "on"}
        />
      </div>

      {/* Sticks to the bottom of the screen while you read, so text size, chords
          and auto-scroll are always within reach. */}
      <div className="sticky bottom-3 z-10 rounded-xl border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        <DisplayControls
          fontStep={fontStep}
          onFontStep={setFontStep}
          showChords={chordsSetting === "on"}
          onShowChords={(show) => setChordsSetting(show ? "on" : "off")}
          scrolling={autoScroll.running}
          onToggleScroll={autoScroll.toggle}
          scrollLevel={scrollLevel}
          onScrollLevel={setScrollLevel}
        />
      </div>
    </div>
  );
}
