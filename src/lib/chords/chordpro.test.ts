import { describe, expect, it } from "vitest";
import { parseChordPro, parseChordProLine, tokenizeLine } from "./chordpro";

describe("parseChordProLine", () => {
  it("splits inline chords into segments", () => {
    expect(parseChordProLine("[G]Amazing [C]grace")).toEqual({
      kind: "lyrics",
      segments: [
        { chord: "G", text: "Amazing " },
        { chord: "C", text: "grace" },
      ],
    });
  });

  it("keeps lyrics that come before the first chord", () => {
    expect(parseChordProLine("Oh [G]Lord")).toEqual({
      kind: "lyrics",
      segments: [
        { chord: null, text: "Oh " },
        { chord: "G", text: "Lord" },
      ],
    });
  });

  it("keeps a chord with no lyric after it", () => {
    expect(parseChordProLine("[Am] [G]")).toEqual({
      kind: "lyrics",
      segments: [
        { chord: "Am", text: " " },
        { chord: "G", text: "" },
      ],
    });
  });

  it("does not throw on half-typed input; an unfinished bracket stays as text", () => {
    expect(parseChordProLine("[G]Amazing [C")).toEqual({
      kind: "lyrics",
      segments: [{ chord: "G", text: "Amazing [C" }],
    });
    expect(() => parseChordPro("[G]Amazing [C\n{comment: Ver\n[]\n]][[")).not.toThrow();
  });

  it("reads {comment: ...} and section directives as headings", () => {
    expect(parseChordProLine("{comment: Verse 1}")).toEqual({ kind: "comment", text: "Verse 1" });
    expect(parseChordProLine("{c: Chorus}")).toEqual({ kind: "comment", text: "Chorus" });
    expect(parseChordProLine("{start_of_chorus}")).toEqual({ kind: "comment", text: "Chorus" });
  });

  it("does not draw metadata directives", () => {
    expect(parseChordProLine("{title: Amazing Grace}")).toEqual({ kind: "blank" });
    expect(parseChordProLine("{key: G}")).toEqual({ kind: "blank" });
  });

  it("treats empty lines as blank", () => {
    expect(parseChordProLine("   ")).toEqual({ kind: "blank" });
  });
});

describe("parseChordPro", () => {
  it("skips # comment lines and handles CRLF", () => {
    const lines = parseChordPro("# private note\r\n[G]Hi\r\n\r\n[C]there");
    expect(lines.map((l) => l.kind)).toEqual(["lyrics", "blank", "lyrics"]);
  });
});

describe("tokenizeLine (wrapping units)", () => {
  const tokens = (line: string) => {
    const parsed = parseChordProLine(line);
    if (parsed.kind !== "lyrics") throw new Error("expected lyrics");
    return tokenizeLine(parsed.segments);
  };

  it("keeps a chord in the middle of a word inside that word", () => {
    expect(tokens("gra[C]ce how")).toEqual([
      {
        type: "word",
        parts: [
          { chord: null, text: "gra" },
          { chord: "C", text: "ce" },
        ],
      },
      { type: "space", text: " " },
      { type: "word", parts: [{ chord: null, text: "how" }] },
    ]);
  });

  it("puts a chord followed by a space with the word it ends", () => {
    expect(tokens("sweet[D] sound")).toEqual([
      {
        type: "word",
        parts: [
          { chord: null, text: "sweet" },
          { chord: "D", text: "" },
        ],
      },
      { type: "space", text: " " },
      { type: "word", parts: [{ chord: null, text: "sound" }] },
    ]);
  });

  it("handles chord-only lines", () => {
    expect(tokens("[Am] [G]")).toEqual([
      { type: "word", parts: [{ chord: "Am", text: "" }] },
      { type: "space", text: " " },
      { type: "word", parts: [{ chord: "G", text: "" }] },
    ]);
  });
});
