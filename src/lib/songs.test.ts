import { describe, expect, it } from "vitest";
import { parseSongForm, parseTags } from "./songs";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseTags", () => {
  it("trims, drops blanks and removes case-insensitive duplicates", () => {
    expect(parseTags(" worship, Slow ,, worship,  SLOW , praise ")).toEqual(["worship", "Slow", "praise"]);
  });
  it("returns an empty list for empty input", () => {
    expect(parseTags("")).toEqual([]);
  });
});

describe("parseSongForm", () => {
  it("accepts a good form, extracts the YouTube ID and converts chords to ChordPro", () => {
    const result = parseSongForm(
      form({
        title: "  Amazing Grace ",
        originalKey: "G",
        bpm: "72",
        tags: "hymn, slow",
        youtube: "https://youtu.be/dQw4w9WgXcQ?si=abc",
        spotify: "",
        chordText: "G" + " ".repeat(7) + "C\nAmazing grace", // C sits over "grace" (column 8)
        editNote: "first version",
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: null,
      title: "Amazing Grace",
      originalKey: "G",
      bpm: 72,
      tags: ["hymn", "slow"],
      youtubeVideoId: "dQw4w9WgXcQ",
      spotifyUrl: null,
      chordText: "[G]Amazing [C]grace",
      editNote: "first version",
    });
  });

  it("reports every problem at once", () => {
    const result = parseSongForm(
      form({ title: "", originalKey: "H#", bpm: "5", youtube: "not a link", spotify: "https://evil.example/x" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["bpm", "originalKey", "spotify", "title", "youtube"]);
  });

  it("ignores an id that isn't a UUID", () => {
    const result = parseSongForm(form({ title: "X", id: "1; drop table songs" }));
    expect(result.ok && result.value.id).toBe(null);
  });

  it("keeps a valid UUID id (editing)", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const result = parseSongForm(form({ title: "X", id }));
    expect(result.ok && result.value.id).toBe(id);
  });
});
