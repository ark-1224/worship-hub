import { describe, expect, it } from "vitest";
import { isChordSymbol } from "./chordSymbol";
import { convertToChordPro } from "./chordsOverWords";

// Builds a chord line with each chord starting at an exact column, so the
// tests don't depend on counting spaces by eye.
//   chordLine({ 0: "G", 8: "C" })  ->  "G       C"
function chordLine(chords: Record<number, string>): string {
  let line = "";
  for (const [column, chord] of Object.entries(chords)) {
    line = line.padEnd(Number(column), " ") + chord;
  }
  return line;
}

describe("isChordSymbol", () => {
  it.each(["C", "G", "Bb", "F#", "Am", "Em7", "Cmaj7", "Dsus4", "Cadd9", "Bdim", "Gaug", "D/F#", "Am7/G", "C#m7b5", "Ebmaj7", "G6", "Asus2", "E7#9"])(
    "accepts %s",
    (chord) => expect(isChordSymbol(chord)).toBe(true),
  );

  // Ordinary words that merely START with a chord letter must not count.
  it.each(["Amen", "Bad", "Dad", "Grace", "Feel", "Add9", "Dim", "Gone", "hello", "H", "x2", ""])(
    "rejects %s",
    (word) => expect(isChordSymbol(word)).toBe(false),
  );
});

describe("convertToChordPro: chords above lyrics", () => {
  it("song 1: uneven spacing; a chord over a gap moves to the next word", () => {
    // Columns: "grace," starts at 8, the space at 14 belongs to "how" (15).
    const input = [
      chordLine({ 0: "G", 8: "C", 14: "G" }),
      "Amazing grace, how sweet",
      chordLine({ 0: "Em", 11: "D" }),
      "That saved a wretch like me",
    ].join("\n");

    expect(convertToChordPro(input)).toBe(
      ["[G]Amazing [C]grace, [G]how sweet", "[Em]That saved [D]a wretch like me"].join("\n"),
    );
  });

  it("song 2: intro on a heading line, sections, slash and extended chords, chords past the end", () => {
    const input = [
      "Intro: D G D/F#",
      "",
      "Verse 1",
      chordLine({ 0: "D", 5: "Gmaj7" }),
      "Holy holy",
      chordLine({ 18: "A7sus4", 29: "D" }), // both far past the end of the lyric
      "Lord God almighty",
    ].join("\n");

    expect(convertToChordPro(input)).toBe(
      [
        "{comment: Intro}",
        "[D] [G] [D/F#]",
        "",
        "{comment: Verse 1}",
        "[D]Holy [Gmaj7]holy",
        "Lord God almighty[A7sus4][D]",
      ].join("\n"),
    );
  });

  it("song 3: bracket headings, plain lyric lines, bar lines and repeats, blank lines, existing ChordPro", () => {
    const input = [
      "[Chorus]",
      chordLine({ 0: "C", 4: "G", 10: "Am", 13: "F" }),
      "How great is our God",
      "Sing with me",
      "| C | G | x2",
      "",
      "{comment: Bridge}",
      "[Am]Already [F]chordpro",
    ].join("\n");

    expect(convertToChordPro(input)).toBe(
      [
        "{comment: Chorus}",
        "[C]How [G]great [Am]is [F]our God",
        "Sing with me",
        "[C] [G] x2",
        "",
        "{comment: Bridge}",
        "[Am]Already [F]chordpro",
      ].join("\n"),
    );
  });

  it("keeps several blank lines and trims trailing spaces", () => {
    expect(convertToChordPro("Hello   \n\n\nWorld")).toBe("Hello\n\n\nWorld");
  });

  it("handles Windows line endings and tabs", () => {
    // The tab after G expands to column 4, over the gap before "grace".
    expect(convertToChordPro("G\tC\r\nAmen grace")).toBe("[G]Amen [C]grace");
  });

  it("puts a chord in the middle of a word when it sits over that letter", () => {
    expect(convertToChordPro(chordLine({ 3: "D" }) + "\nAmazing")).toBe("Ama[D]zing");
  });

  it("does not treat lyric words that look like chords as chords", () => {
    expect(convertToChordPro("Amen\nBad Dad\nGrace")).toBe("Amen\nBad Dad\nGrace");
  });

  it("keeps a chord line on its own if a heading follows (no lyric to attach to)", () => {
    expect(convertToChordPro("Am F\nVerse 2\nHello")).toBe("[Am] [F]\n{comment: Verse 2}\nHello");
  });
});

describe("convertToChordPro: ChordPro input", () => {
  it("passes inline ChordPro through unchanged", () => {
    const chordpro = "{title: Test}\n[G]Amazing [C]grace\n\n[D/F#]Hello [Bbmaj7]there";
    expect(convertToChordPro(chordpro)).toBe(chordpro);
  });

  it("is idempotent: converting twice gives the same result", () => {
    const sheet = [
      "Intro: D G",
      "Verse 1",
      chordLine({ 0: "D", 5: "Gmaj7" }),
      "Holy holy",
      "| Am | F |",
      "",
      "[Chorus]",
      chordLine({ 0: "C", 4: "G" }),
      "Sing",
    ].join("\n");
    const once = convertToChordPro(sheet);
    expect(convertToChordPro(once)).toBe(once);
  });

  it("handles a mix of both styles line by line", () => {
    const mixed = ["[G]Amazing [C]grace", "D", "how sweet"].join("\n");
    expect(convertToChordPro(mixed)).toBe("[G]Amazing [C]grace\n[D]how sweet");
  });

  it("returns an empty string for empty input", () => {
    expect(convertToChordPro("")).toBe("");
  });
});
