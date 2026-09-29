import { Chord } from "chordsheetjs";
import { isChordSymbol } from "./chordSymbol";

// Transposing = moving every chord up or down by some number of semitones.
// It only changes what's DISPLAYED. The stored ChordPro and the song's original
// key are never touched.
//
// We use ChordSheetJS for the chord maths (root, quality like m7/maj7/sus4, ...)
// with two workarounds for spelling bugs in the library: it can leave E#/B#/Cb/Fb
// behind after transposing, and its sharps/flats setting turns plain notes into
// those same spellings (C -> "B#"). See shiftPart() below. transpose.test.ts checks
// every root, quality, distance and accidental against an independent table.

export type Accidental = "#" | "b";
/** "auto" picks sharps or flats to suit the key being displayed. */
export type AccidentalSetting = "auto" | "sharps" | "flats";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// The names musicians actually use for each key (D# major would be Eb, and so on).
const CONVENTIONAL_MAJOR = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const CONVENTIONAL_MINOR = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

const NATURAL_PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Note name for a pitch (0 = C ... 11 = B) using sharps or flats. */
export function noteName(pitch: number, accidental: Accidental): string {
  return (accidental === "#" ? SHARP_NAMES : FLAT_NAMES)[mod12(pitch)];
}

// ---------------------------------------------------------------------------
// Chords
// ---------------------------------------------------------------------------

// 1. transpose: the library can leave odd spellings behind (E#, B#, Cb, Fb)
// 2. normalize: turns those into the plain note (E# -> F, B# -> C, Cb -> B, Fb -> E);
//    the suffix (m7, sus4...) is deliberately left exactly as written
// 3. only if the root NOW has a sharp or flat, respell it the chosen way
function shiftPart(part: string, semitones: number, accidental: Accidental): string {
  const parsed = Chord.parse(part);
  if (!parsed) return part; // something the library can't read: show it as typed
  let shifted = parsed.transpose(semitones).normalize(null, { normalizeSuffix: false });
  if (/^[A-G][#b]/.test(shifted.toString())) shifted = shifted.useAccidental(accidental);
  return shifted.toString();
}

/**
 * Transposes one chord symbol, e.g. transposeChord("D/F#", 2, "#") -> "E/G#".
 * Slash chords move both the chord and its bass note. Anything that isn't a
 * chord symbol (like "N.C.") is returned unchanged.
 */
export function transposeChord(chord: string, semitones: number, accidental: Accidental): string {
  if (!isChordSymbol(chord)) return chord;
  const slash = chord.indexOf("/");
  if (slash === -1) return shiftPart(chord, semitones, accidental);
  // Root part and bass note are shifted separately: the bass is a plain note name.
  return (
    shiftPart(chord.slice(0, slash), semitones, accidental) +
    "/" +
    shiftPart(chord.slice(slash + 1), semitones, accidental)
  );
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export type ParsedKey = { pitch: number; minor: boolean };

/** "Bb" -> { pitch: 10, minor: false }, "F#m" -> { pitch: 6, minor: true }. */
export function parseKey(key: string): ParsedKey | null {
  const m = /^([A-G])([#b]?)(m?)$/.exec(key.trim());
  if (!m) return null;
  const shift = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return { pitch: mod12(NATURAL_PITCH[m[1]] + shift), minor: m[3] === "m" };
}

/**
 * Name to show for a key. With "auto" the usual name is used (Bb, F#, C#m...);
 * with "sharps"/"flats" the spelling is forced (A#, Gb...).
 */
export function keyName(pitch: number, minor: boolean, setting: AccidentalSetting): string {
  const suffix = minor ? "m" : "";
  if (setting === "sharps") return noteName(pitch, "#") + suffix;
  if (setting === "flats") return noteName(pitch, "b") + suffix;
  return (minor ? CONVENTIONAL_MINOR : CONVENTIONAL_MAJOR)[mod12(pitch)] + suffix;
}

// Major keys with flats in the signature: F, Bb, Eb, Ab (by their pitch).
const FLAT_MAJOR_PITCHES = new Set([5, 10, 3, 8]);

/**
 * Sharps or flats for chords shown in this key ("auto" setting):
 *   G D A E B F# C#  and  Em Bm F#m C#m G#m  -> sharps
 *   F Bb Eb Ab Db Gb and  Dm Gm Cm Fm Bbm    -> flats
 *   C and Am -> sharps
 * A key written with a # or b follows its own symbol; plain-letter keys are
 * judged by their relative major (Dm shares F's flat, Em shares G's sharp).
 */
export function preferredAccidental(key: string): Accidental {
  if (key.includes("#")) return "#";
  if (key.includes("b")) return "b";
  const parsed = parseKey(key);
  if (!parsed) return "#";
  const relativeMajor = parsed.minor ? mod12(parsed.pitch + 3) : parsed.pitch;
  return FLAT_MAJOR_PITCHES.has(relativeMajor) ? "b" : "#";
}

/** Fewest semitones to go up from one key to another: 0 to 11. */
export function semitonesBetween(from: ParsedKey, to: ParsedKey): number {
  return mod12(to.pitch - from.pitch);
}

/**
 * Best guess at a song's key from its first chord (songs usually start on the
 * key chord). Used only when the song has no original key saved.
 */
export function guessKey(chordText: string): string | null {
  for (const m of chordText.matchAll(/\[([^\][]+)\]/g)) {
    const chord = m[1].trim();
    if (!isChordSymbol(chord)) continue;
    const root = /^[A-G][#b]?/.exec(chord)![0];
    const isMinor = /^m(?!aj)/.test(chord.slice(root.length)); // Am, Am7 yes; Amaj7 no
    return root + (isMinor ? "m" : "");
  }
  return null;
}
