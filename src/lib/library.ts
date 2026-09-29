import { KEY_PATTERN, SONG_KEYS } from "./chords/keys";

// Helpers for the song library: reading the search/filter/sort options from the
// page address, building links, and sorting. Pure functions, easy to test.

export type SortMode = "title" | "newest" | "recent";

export const SORT_LABELS: Record<SortMode, string> = {
  title: "Title (A–Z)",
  newest: "Newest first",
  recent: "Recently used",
};

export type LibraryParams = {
  q: string; // search text (title, artist, lyrics)
  tag: string;
  key: string;
  artist: string;
  sort: SortMode;
};

/**
 * The search text goes into a PostgREST "or" filter, where , ( ) " \ have
 * special meaning. Replace them (and LIKE wildcards) so a search can't break or
 * change the filter, and squash extra spaces (the stored lyrics are single-spaced).
 */
export function cleanSearch(q: string): string {
  return q.replace(/[,()"\\%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads ?q=&tag=&key=&artist=&sort= from the page address, ignoring anything invalid. */
export function parseLibraryParams(raw: Record<string, string | string[] | undefined>): LibraryParams {
  const sort = first(raw.sort);
  const key = first(raw.key).trim();
  return {
    q: cleanSearch(first(raw.q)),
    // Quotes and braces have special meaning in array filters; tags never need them.
    tag: first(raw.tag).replace(/["{}\\]/g, "").trim().slice(0, 60),
    key: KEY_PATTERN.test(key) ? key : "",
    artist: first(raw.artist).trim().slice(0, 200),
    sort: sort === "newest" || sort === "recent" ? sort : "title",
  };
}

/** A link to the library with these options; options left at their default are omitted. */
export function libraryHref(params: Partial<LibraryParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.key) search.set("key", params.key);
  if (params.artist) search.set("artist", params.artist);
  if (params.sort && params.sort !== "title") search.set("sort", params.sort);
  const query = search.toString();
  return query ? `/songs?${query}` : "/songs";
}

/**
 * The part of the lyrics around the first match, split so the match can be
 * highlighted. Null if the text isn't in the lyrics.
 */
export function lyricSnippet(
  lyrics: string | null,
  q: string,
  radius = 45,
): { before: string; match: string; after: string } | null {
  if (!lyrics || !q) return null;
  const at = lyrics.toLowerCase().indexOf(q.toLowerCase());
  if (at === -1) return null;

  const start = Math.max(0, at - radius);
  const end = Math.min(lyrics.length, at + q.length + radius);
  return {
    before: (start > 0 ? "…" : "") + lyrics.slice(start, at),
    match: lyrics.slice(at, at + q.length),
    after: lyrics.slice(at + q.length, end) + (end < lyrics.length ? "…" : ""),
  };
}

export type Facets = { tags: string[]; keys: string[]; artists: string[] };

/** What to offer in the filter dropdowns: only values that actually exist. */
export function buildFacets(
  rows: { tags: string[] | null; original_key: string | null; artist: string | null }[],
): Facets {
  const tags = new Map<string, string>(); // lower-case -> as first written
  const keys = new Set<string>();
  const artists = new Set<string>();

  for (const row of rows) {
    for (const tag of row.tags ?? []) if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
    if (row.original_key) keys.add(row.original_key);
    if (row.artist) artists.add(row.artist);
  }

  return {
    tags: [...tags.values()].sort((a, b) => a.localeCompare(b)),
    // Musical order (C, C#, Db, D ... then minors), not alphabetical.
    keys: SONG_KEYS.filter((k) => keys.has(k)),
    artists: [...artists].sort((a, b) => a.localeCompare(b)),
  };
}

type Sortable = { title: string; created_at: string; last_used: string | null };

/** Sorts a copy of the songs. "recent" = latest service first; never-used songs go last. */
export function sortSongs<T extends Sortable>(songs: T[], sort: SortMode): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  const copy = [...songs];

  if (sort === "newest") return copy.sort((a, b) => b.created_at.localeCompare(a.created_at) || byTitle(a, b));
  if (sort === "recent") {
    return copy.sort((a, b) => {
      if (a.last_used && b.last_used) return b.last_used.localeCompare(a.last_used) || byTitle(a, b);
      if (a.last_used) return -1;
      if (b.last_used) return 1;
      return byTitle(a, b);
    });
  }
  return copy.sort(byTitle);
}
