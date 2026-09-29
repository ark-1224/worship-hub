import { describe, expect, it } from "vitest";
import { diffDetails, diffLines, hasChanges, type SongDetails } from "./diff";

const types = (lines: ReturnType<typeof diffLines>) => lines.map((l) => `${l.type[0]}:${l.text}`);

// Rebuilds each side from the diff; both must give back the original texts.
function rebuild(lines: ReturnType<typeof diffLines>) {
  return {
    from: lines.filter((l) => l.type !== "added").map((l) => l.text).join("\n"),
    to: lines.filter((l) => l.type !== "removed").map((l) => l.text).join("\n"),
  };
}

describe("diffLines", () => {
  it("marks identical text as all 'same'", () => {
    const d = diffLines("a\nb\nc", "a\nb\nc");
    expect(types(d)).toEqual(["s:a", "s:b", "s:c"]);
    expect(hasChanges(d)).toBe(false);
  });

  it("finds a changed line (removed then added)", () => {
    const d = diffLines("[G]Amazing [C]grace\nsecond", "[G]Amazing [D]grace\nsecond");
    expect(types(d)).toEqual(["r:[G]Amazing [C]grace", "a:[G]Amazing [D]grace", "s:second"]);
  });

  it("finds inserted and deleted lines", () => {
    expect(types(diffLines("a\nc", "a\nb\nc"))).toEqual(["s:a", "a:b", "s:c"]);
    expect(types(diffLines("a\nb\nc", "a\nc"))).toEqual(["s:a", "r:b", "s:c"]);
  });

  it("handles adding to, and clearing, an empty song", () => {
    expect(types(diffLines("", "a\nb"))).toEqual(["r:", "a:a", "a:b"]);
    expect(rebuild(diffLines("", "a\nb"))).toEqual({ from: "", to: "a\nb" });
    expect(rebuild(diffLines("a\nb", ""))).toEqual({ from: "a\nb", to: "" });
  });

  it("treats Windows and Unix line endings the same", () => {
    expect(hasChanges(diffLines("a\r\nb", "a\nb"))).toBe(false);
  });

  it("copes with a moved block", () => {
    const d = diffLines("v1\nv2\nc1\nc2", "c1\nc2\nv1\nv2");
    const { from, to } = rebuild(d);
    expect(from).toBe("v1\nv2\nc1\nc2");
    expect(to).toBe("c1\nc2\nv1\nv2");
  });

  it("gives back both original texts for lots of random edits", () => {
    // A small fixed pseudo-random generator so the test is repeatable.
    let seed = 12345;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const words = ["[G]la", "[C]la", "verse", "chorus", "", "amen", "[D]oh"];
    for (let round = 0; round < 200; round++) {
      const make = () => Array.from({ length: rand(12) }, () => words[rand(words.length)]).join("\n");
      const from = make();
      const to = make();
      expect(rebuild(diffLines(from, to))).toEqual({ from, to });
    }
  });

  it("falls back gracefully on very large inputs", () => {
    const big = (tag: string) => Array.from({ length: 2000 }, (_, i) => `${tag}${i}`).join("\n");
    const d = diffLines(big("a"), big("b"));
    expect(d.filter((l) => l.type === "removed")).toHaveLength(2000);
    expect(d.filter((l) => l.type === "added")).toHaveLength(2000);
  });
});

describe("diffDetails", () => {
  const base: SongDetails = {
    title: "Amazing Grace",
    artist: "John Newton",
    originalKey: "G",
    bpm: 72,
    tags: ["hymn", "grace"],
    youtubeVideoId: null,
    spotifyUrl: null,
    notes: null,
  };

  it("reports nothing when nothing changed", () => {
    expect(diffDetails(base, { ...base })).toEqual([]);
  });

  it("reports each changed field with (none) for empty values", () => {
    const changes = diffDetails(base, {
      ...base,
      originalKey: "A",
      bpm: null,
      tags: ["hymn"],
      youtubeVideoId: "dQw4w9WgXcQ",
    });
    expect(changes).toEqual([
      { label: "Key", from: "G", to: "A" },
      { label: "BPM", from: "72", to: "(none)" },
      { label: "Tags", from: "hymn, grace", to: "hymn" },
      { label: "YouTube", from: "(none)", to: "dQw4w9WgXcQ" },
    ]);
  });
});
