import { describe, expect, it } from "vitest";
import {
  chordTransposer,
  guessKey,
  keyName,
  noteName,
  parseKey,
  preferredAccidental,
  semitonesBetween,
  semitonesToKey,
  transposeChord,
  type Accidental,
} from "./transpose";

// The 12 pitches with both spellings, written out independently of the code under test.
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const PITCH: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};
const ROOTS = Object.keys(PITCH);
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const spell = (pitch: number, acc: Accidental) => (acc === "#" ? SHARPS : FLATS)[mod12(pitch)];

describe("transposeChord: the basics", () => {
  it("moves a plain chord up and down", () => {
    expect(transposeChord("G", 2, "#")).toBe("A");
    expect(transposeChord("G", -2, "#")).toBe("F");
    expect(transposeChord("C", 7, "#")).toBe("G");
  });

  it("leaves a chord alone at 0 semitones when it has no accidental", () => {
    expect(transposeChord("G", 0, "#")).toBe("G");
    expect(transposeChord("Am7", 0, "b")).toBe("Am7");
  });

  it("wraps around the octave", () => {
    expect(transposeChord("B", 1, "#")).toBe("C");
    expect(transposeChord("C", -1, "#")).toBe("B");
    expect(transposeChord("A", 12, "#")).toBe("A");
    expect(transposeChord("A", 26, "#")).toBe("B");
    expect(transposeChord("A", -26, "#")).toBe("G");
  });

  it("does not touch things that are not chords", () => {
    expect(transposeChord("N.C.", 3, "#")).toBe("N.C.");
    expect(transposeChord("Amen", 3, "#")).toBe("Amen");
  });
});

describe("transposeChord: sharps vs flats", () => {
  it("shows the same pitch with the chosen accidental", () => {
    expect(transposeChord("G", 1, "#")).toBe("G#");
    expect(transposeChord("G", 1, "b")).toBe("Ab");
    expect(transposeChord("A", 1, "#")).toBe("A#");
    expect(transposeChord("A", 1, "b")).toBe("Bb");
  });

  it("respells chords that already have an accidental, even at 0 semitones", () => {
    expect(transposeChord("Bb", 0, "#")).toBe("A#");
    expect(transposeChord("F#m", 0, "b")).toBe("Gbm");
  });

  it("never produces B#, E#, Cb or Fb", () => {
    expect(transposeChord("Bb", 2, "#")).toBe("C"); // the ChordSheetJS bug gave "B#"
    expect(transposeChord("C", 0, "#")).toBe("C");
    expect(transposeChord("Eb", 1, "#")).toBe("E");
    expect(transposeChord("Gb", 6, "b")).toBe("C");
    expect(transposeChord("C", -1, "b")).toBe("B");
    expect(transposeChord("E", 5, "b")).toBe("A");
  });
});

describe("transposeChord: slash chords", () => {
  it("moves both the chord and its bass note", () => {
    expect(transposeChord("D/F#", 2, "#")).toBe("E/G#");
    expect(transposeChord("D/F#", 3, "b")).toBe("F/A");
    expect(transposeChord("C/E", 2, "#")).toBe("D/F#");
    expect(transposeChord("Am7/G", -2, "b")).toBe("Gm7/F");
  });

  it("keeps a natural bass natural when respelling", () => {
    expect(transposeChord("Bb/D", 0, "#")).toBe("A#/D");
    expect(transposeChord("C/Bb", 0, "#")).toBe("C/A#");
  });
});

describe("transposeChord: chord qualities are kept", () => {
  const qualities = ["m", "7", "maj7", "m7", "sus4", "sus2", "add9", "dim", "dim7", "aug", "6", "9", "m9", "5", "7sus4", "m7b5", "maj9", "2", "4", "7#9"];

  it.each(qualities)("keeps '%s' when moving G up 2 (to A)", (q) => {
    expect(transposeChord(`G${q}`, 2, "#")).toBe(`A${q}`);
  });

  it.each(qualities)("keeps '%s' on a flat root (Bb up 3 to Db with flats)", (q) => {
    expect(transposeChord(`Bb${q}`, 3, "b")).toBe(`Db${q}`);
  });

  it("handles the classics", () => {
    expect(transposeChord("Cmaj7", 5, "#")).toBe("Fmaj7");
    expect(transposeChord("Dsus4", 2, "#")).toBe("Esus4");
    expect(transposeChord("Cadd9", 2, "#")).toBe("Dadd9");
    expect(transposeChord("Bdim", 1, "#")).toBe("Cdim");
    expect(transposeChord("Em7", 3, "#")).toBe("Gm7");
  });
});

describe("transposeChord: every root, quality, distance and accidental", () => {
  // 14 roots x 10 qualities x 25 distances (-12..12) x 2 accidentals = 7000 checks.
  const suffixes = ["", "m", "7", "maj7", "m7", "sus4", "add9", "dim", "aug", "m7b5"];

  it("matches an independent table for all of them, with slash bass notes", () => {
    const failures: string[] = [];
    for (const root of ROOTS) {
      for (const suffix of suffixes) {
        for (let n = -12; n <= 12; n++) {
          for (const acc of ["#", "b"] as const) {
            const chord = root + suffix;
            const expected = spell(PITCH[root] + n, acc) + suffix;
            const actual = transposeChord(chord, n, acc);
            if (actual !== expected) failures.push(`${chord} ${n} ${acc}: got ${actual}, expected ${expected}`);

            const slash = `${chord}/${root}`;
            const expectedSlash = `${expected}/${spell(PITCH[root] + n, acc)}`;
            const actualSlash = transposeChord(slash, n, acc);
            if (actualSlash !== expectedSlash) failures.push(`${slash} ${n} ${acc}: got ${actualSlash}, expected ${expectedSlash}`);
          }
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it("all 12 keys up by 1 and down by 1 give the neighbouring key", () => {
    for (let p = 0; p < 12; p++) {
      expect(transposeChord(SHARPS[p], 1, "#")).toBe(SHARPS[mod12(p + 1)]);
      expect(transposeChord(SHARPS[p], -1, "#")).toBe(SHARPS[mod12(p - 1)]);
      expect(transposeChord(FLATS[p], 1, "b")).toBe(FLATS[mod12(p + 1)]);
      expect(transposeChord(FLATS[p], -1, "b")).toBe(FLATS[mod12(p - 1)]);
    }
  });

  it("going up n and back down n returns to the same pitch (12 in a row is a full circle)", () => {
    for (const root of ROOTS) {
      for (let n = 1; n <= 12; n++) {
        const up = transposeChord(`${root}m7`, n, "#");
        const back = transposeChord(up, -n, "#");
        expect(PITCH[back.replace("m7", "")]).toBe(PITCH[root]);
      }
      let chord = `${root}maj7`;
      for (let i = 0; i < 12; i++) chord = transposeChord(chord, 1, "#");
      expect(PITCH[chord.replace("maj7", "")]).toBe(PITCH[root]);
    }
  });
});

describe("chordTransposer", () => {
  it("shows chords exactly as saved at the original key with 'auto'", () => {
    const show = chordTransposer("auto", 0, "G");
    expect(show("A#")).toBe("A#"); // not respelled
    expect(show("Bb/D")).toBe("Bb/D");
  });

  it("follows the key being shown when 'auto' (flats in F, sharps in D)", () => {
    expect(chordTransposer("auto", 1, "Ab")("G")).toBe("Ab");
    expect(chordTransposer("auto", 3, "D")("Bb")).toBe("C#"); // Bb is pitch 10; +3 = pitch 1, spelled with sharps in D
    expect(chordTransposer("auto", 1, "F")("E")).toBe("F");
  });

  it("forces sharps or flats when asked, even at 0 semitones", () => {
    expect(chordTransposer("sharps", 0, "G")("Bb")).toBe("A#");
    expect(chordTransposer("flats", 0, "G")("F#m")).toBe("Gbm");
  });

  it("handles a missing key", () => {
    expect(chordTransposer("auto", 2, null)("G")).toBe("A");
  });
});

describe("keys", () => {
  it("parses key names", () => {
    expect(parseKey("G")).toEqual({ pitch: 7, minor: false });
    expect(parseKey("Bb")).toEqual({ pitch: 10, minor: false });
    expect(parseKey("F#m")).toEqual({ pitch: 6, minor: true });
    expect(parseKey("H")).toBeNull();
    expect(parseKey("")).toBeNull();
  });

  it("names keys the way musicians do, or with forced sharps/flats", () => {
    expect(keyName(10, false, "auto")).toBe("Bb");
    expect(keyName(6, false, "auto")).toBe("F#");
    expect(keyName(1, true, "auto")).toBe("C#m");
    expect(keyName(3, true, "auto")).toBe("Ebm");
    expect(keyName(10, false, "sharps")).toBe("A#");
    expect(keyName(1, false, "flats")).toBe("Db");
    expect(keyName(9, true, "flats")).toBe("Am");
  });

  it("noteName spells a pitch either way", () => {
    expect(noteName(1, "#")).toBe("C#");
    expect(noteName(1, "b")).toBe("Db");
    expect(noteName(13, "b")).toBe("Db");
    expect(noteName(-2, "#")).toBe("A#");
  });

  it("picks sharps or flats to suit the key (auto setting)", () => {
    for (const k of ["G", "D", "A", "E", "B", "F#", "C#", "Em", "Bm", "F#m", "C#m", "G#m", "C", "Am"]) {
      expect(preferredAccidental(k), k).toBe("#");
    }
    for (const k of ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]) {
      expect(preferredAccidental(k), k).toBe("b");
    }
  });

  it("finds the distance between two keys (always upward, 0 to 11)", () => {
    const g = parseKey("G")!;
    expect(semitonesBetween(g, parseKey("A")!)).toBe(2);
    expect(semitonesBetween(g, parseKey("F")!)).toBe(10);
    expect(semitonesBetween(g, g)).toBe(0);
    expect(semitonesBetween(parseKey("B")!, parseKey("C")!)).toBe(1);
  });

  it("works out the shift needed to show a song in a lineup's key", () => {
    expect(semitonesToKey("G", "A")).toBe(2);
    expect(semitonesToKey("G", "F")).toBe(10);
    expect(semitonesToKey("G", "G")).toBe(0);
    expect(semitonesToKey("Am", "Bm")).toBe(2);
    expect(semitonesToKey("D", "Bb")).toBe(8);
    expect(semitonesToKey(null, "A")).toBe(0);
    expect(semitonesToKey("G", null)).toBe(0);
    expect(semitonesToKey("G", "nope")).toBe(0);
  });

  it("guesses the key from the first chord", () => {
    expect(guessKey("[G]Amazing [C]grace")).toBe("G");
    expect(guessKey("{comment: Verse}\n[Am7]Hello [F]there")).toBe("Am");
    expect(guessKey("[Bbmaj7]Hi")).toBe("Bb");
    expect(guessKey("[F#m]Hi")).toBe("F#m");
    expect(guessKey("[N.C.]Stop [D]go")).toBe("D");
    expect(guessKey("no chords here")).toBeNull();
  });
});
