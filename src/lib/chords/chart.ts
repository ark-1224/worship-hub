import { parseChordPro, type SongLine } from "./chordpro";
import {
  chordTransposer,
  guessKey,
  keyName,
  parseKey,
  semitonesToKey,
  type AccidentalSetting,
} from "./transpose";

// Gets a song ready to show or print in a particular key. Used by the print
// pages, where there's no device setting to consult and no controls to change it.

export type PreparedChart = {
  lines: SongLine[];
  transpose: (chord: string) => string;
  /** The key the chords are shown in, e.g. "A", or null if the song has no readable key. */
  shownKey: string | null;
  /** The song's saved key (or a guess from its first chord). */
  savedKey: string | null;
};

/**
 * `targetKey` is the key to print in ("A", "Bb", "F#m"); null or unreadable
 * means "as saved". Chords are spelled with sharps or flats to suit that key.
 * The name is kept as given, so asking for "A#" prints sharps.
 */
export function prepareChart(
  chordText: string,
  originalKey: string | null,
  targetKey: string | null,
  setting: AccidentalSetting = "auto",
): PreparedChart {
  const savedKey = originalKey ?? guessKey(chordText);
  const base = savedKey ? parseKey(savedKey) : null;
  const target = targetKey ? parseKey(targetKey) : null;

  const semitones = base && target ? semitonesToKey(savedKey, targetKey) : 0;
  const shownKey = base ? (target && targetKey ? targetKey : keyName(base.pitch, base.minor, setting)) : null;

  return {
    lines: parseChordPro(chordText),
    transpose: chordTransposer(setting, semitones, shownKey),
    shownKey: base ? shownKey : null,
    savedKey,
  };
}
