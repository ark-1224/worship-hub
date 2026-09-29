import { describe, expect, it } from "vitest";
import {
  buildFacets,
  cleanSearch,
  libraryHref,
  lyricSnippet,
  parseLibraryParams,
  sortSongs,
} from "./library";

describe("cleanSearch", () => {
  it("removes characters that could change the database filter", () => {
    expect(cleanSearch('grace, (sweet) "sound" 100% a_b *')).toBe("grace sweet sound 100 a b");
    expect(cleanSearch("  lots   of   space ")).toBe("lots of space");
  });
  it("limits the length", () => {
    expect(cleanSearch("x".repeat(500))).toHaveLength(100);
  });
});

describe("parseLibraryParams", () => {
  it("reads good values", () => {
    expect(parseLibraryParams({ q: "grace", tag: "Slow", key: "Bb", artist: "John Newton", sort: "recent" })).toEqual({
      q: "grace",
      tag: "Slow",
      key: "Bb",
      artist: "John Newton",
      sort: "recent",
    });
  });
  it("falls back to safe defaults for junk", () => {
    expect(parseLibraryParams({ sort: "hack", key: "H#", tag: '"}; drop', q: undefined })).toEqual({
      q: "",
      tag: "; drop",
      key: "",
      artist: "",
      sort: "title",
    });
    expect(parseLibraryParams({})).toEqual({ q: "", tag: "", key: "", artist: "", sort: "title" });
  });
  it("uses the first value when a parameter is repeated", () => {
    expect(parseLibraryParams({ q: ["one", "two"] }).q).toBe("one");
  });
});

describe("libraryHref", () => {
  it("leaves out empty options and the default sort", () => {
    expect(libraryHref({})).toBe("/songs");
    expect(libraryHref({ q: "", sort: "title" })).toBe("/songs");
    expect(libraryHref({ tag: "slow", sort: "newest" })).toBe("/songs?tag=slow&sort=newest");
  });
  it("encodes special characters", () => {
    expect(libraryHref({ q: "how great & good", artist: "Hillsong / United" })).toBe(
      "/songs?q=how+great+%26+good&artist=Hillsong+%2F+United",
    );
  });
});

describe("lyricSnippet", () => {
  const lyrics = "Amazing grace, how sweet the sound, that saved a wretch like me";

  it("returns the match with some text around it", () => {
    expect(lyricSnippet(lyrics, "SWEET", 10)).toEqual({
      before: "…race, how ", // 10 characters before the match, so the word "grace" is cut
      match: "sweet",
      after: " the sound…",
    });
  });
  it("adds no ellipsis when the match is at the edge", () => {
    expect(lyricSnippet(lyrics, "amazing", 5)).toEqual({ before: "", match: "Amazing", after: " grac…" });
  });
  it("is null when there is no match or no text", () => {
    expect(lyricSnippet(lyrics, "hallelujah")).toBeNull();
    expect(lyricSnippet(null, "grace")).toBeNull();
    expect(lyricSnippet(lyrics, "")).toBeNull();
  });
});

describe("buildFacets", () => {
  it("collects unique tags (case-insensitive), keys in musical order, and artists", () => {
    const facets = buildFacets([
      { tags: ["hymn", "Slow"], original_key: "G", artist: "John Newton" },
      { tags: ["Hymn", "fast"], original_key: "Bb", artist: "Charlotte Elliott" },
      { tags: null, original_key: "C", artist: null },
      { tags: [], original_key: "G", artist: "John Newton" },
    ]);
    expect(facets.tags).toEqual(["fast", "hymn", "Slow"]);
    expect(facets.keys).toEqual(["C", "G", "Bb"]);
    expect(facets.artists).toEqual(["Charlotte Elliott", "John Newton"]);
  });
  it("copes with an empty library", () => {
    expect(buildFacets([])).toEqual({ tags: [], keys: [], artists: [] });
  });
});

describe("sortSongs", () => {
  const songs = [
    { title: "beta", created_at: "2026-01-02", last_used: null },
    { title: "Alpha", created_at: "2026-03-01", last_used: "2026-09-27" },
    { title: "Gamma", created_at: "2026-02-01", last_used: "2026-10-04" },
    { title: "delta", created_at: "2026-03-01", last_used: null },
  ];
  const titles = (list: typeof songs) => list.map((s) => s.title);

  it("sorts by title, ignoring case", () => {
    expect(titles(sortSongs(songs, "title"))).toEqual(["Alpha", "beta", "delta", "Gamma"]);
  });
  it("sorts newest first, then by title", () => {
    expect(titles(sortSongs(songs, "newest"))).toEqual(["Alpha", "delta", "Gamma", "beta"]);
  });
  it("sorts by latest use, with never-used songs last (by title)", () => {
    expect(titles(sortSongs(songs, "recent"))).toEqual(["Gamma", "Alpha", "beta", "delta"]);
  });
  it("does not change the original list", () => {
    const before = titles(songs);
    sortSongs(songs, "recent");
    expect(titles(songs)).toEqual(before);
  });
});
