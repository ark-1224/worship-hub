import type { Metadata } from "next";
import Link from "next/link";
import { formatServiceDate } from "@/lib/lineups";
import {
  SORT_LABELS,
  buildFacets,
  libraryHref,
  lyricSnippet,
  parseLibraryParams,
  sortSongs,
  type LibraryParams,
  type SortMode,
} from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Song library" };

const LIMIT = 500;

type SongRow = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  youtube_video_id: string | null;
  created_at: string;
  lyrics_text?: string | null; // only fetched while searching
};

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600" role="img" aria-label="Has video" fill="currentColor">
      <title>Has video</title>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

export default async function SongLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseLibraryParams(await searchParams);
  const supabase = await createClient();

  // While searching we also fetch the lyrics, to show where the words were found.
  let query = supabase
    .from("songs")
    .select(`id, title, artist, original_key, youtube_video_id, created_at${params.q ? ", lyrics_text" : ""}`)
    .is("archived_at", null)
    .order("title", { ascending: true })
    .limit(LIMIT);

  if (params.q) {
    // Title, artist, or the lyrics (lyrics_text has the [chords] stripped out; see 0006).
    query = query.or(`title.ilike.%${params.q}%,artist.ilike.%${params.q}%,lyrics_text.ilike.%${params.q}%`);
  }
  if (params.tag) query = query.contains("tags", [params.tag]);
  if (params.key) query = query.eq("original_key", params.key);
  if (params.artist) query = query.eq("artist", params.artist);

  const [songsResult, facetsResult, lastUsedResult] = await Promise.all([
    query,
    // Everything in the library (small), to fill the dropdowns with values that exist.
    supabase.from("songs").select("tags, original_key, artist").is("archived_at", null),
    // The latest service each song was in; only needed for "Recently used".
    params.sort === "recent"
      ? supabase.from("song_last_used").select("song_id, last_used")
      : Promise.resolve({ data: [] as { song_id: string; last_used: string }[] }),
  ]);

  const facets = buildFacets(facetsResult.data ?? []);
  const lastUsed = new Map((lastUsedResult.data ?? []).map((r) => [r.song_id, r.last_used]));
  const rows = (songsResult.data ?? []) as unknown as SongRow[];
  const songs = sortSongs(
    rows.map((s) => ({ ...s, last_used: lastUsed.get(s.id) ?? null })),
    params.sort,
  );

  const hasFilters = Boolean(params.tag || params.key || params.artist || params.sort !== "title");
  const chips: { label: string; href: string }[] = [
    params.q && { label: `“${params.q}”`, href: libraryHref({ ...params, q: "" }) },
    params.tag && { label: `Tag: ${params.tag}`, href: libraryHref({ ...params, tag: "" }) },
    params.key && { label: `Key: ${params.key}`, href: libraryHref({ ...params, key: "" }) },
    params.artist && { label: `Artist: ${params.artist}`, href: libraryHref({ ...params, artist: "" }) },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  const select = (name: keyof LibraryParams, label: string, value: string, options: { value: string; label: string }[], any?: string) => (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select id={name} name={name} defaultValue={value} className="input">
        {any && <option value="">{any}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Song library</h1>
        <Link href="/songs/new" className="btn-primary">
          Add song
        </Link>
      </div>

      {/* A plain GET form: works without JavaScript and keeps everything in the URL,
          so a search can be bookmarked or shared as a link. */}
      <form action="/songs" role="search" className="space-y-3">
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search title, artist or lyrics
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Search title, artist or lyrics"
            className="input"
          />
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </div>

        <details open={hasFilters} className="rounded-xl border border-stone-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 font-medium">
            Filters &amp; sort{hasFilters ? " (on)" : ""}
          </summary>
          <div className="space-y-3 border-t border-stone-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {select("tag", "Tag", params.tag, facets.tags.map((t) => ({ value: t, label: t })), "Any tag")}
              {select("key", "Key", params.key, facets.keys.map((k) => ({ value: k, label: k })), "Any key")}
              {select("artist", "Artist", params.artist, facets.artists.map((a) => ({ value: a, label: a })), "Any artist")}
              {select(
                "sort",
                "Sort by",
                params.sort,
                (Object.keys(SORT_LABELS) as SortMode[]).map((s) => ({ value: s, label: SORT_LABELS[s] })),
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Apply
              </button>
              <Link href="/songs" className="btn-secondary">
                Clear all
              </Link>
            </div>
          </div>
        </details>
      </form>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent-100 px-3 text-sm font-medium text-accent-700 hover:bg-accent-200"
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label} <span aria-hidden>×</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {songsResult.error && <p className="form-error">Couldn&apos;t load songs. Please refresh.</p>}

      {!songsResult.error && (
        <p className="text-sm text-stone-500" aria-live="polite">
          {songs.length} {songs.length === 1 ? "song" : "songs"}
          {songs.length >= LIMIT ? ` (showing the first ${LIMIT}; narrow the search to see others)` : ""}
        </p>
      )}

      {songs.length === 0 && !songsResult.error && (
        <p className="card text-stone-600">
          {chips.length > 0 ? (
            <>
              No songs match. <Link href="/songs" className="font-semibold text-accent-700 underline">Clear the search and filters</Link>.
            </>
          ) : (
            "No songs yet. Add the first one!"
          )}
        </p>
      )}

      {songs.length > 0 && (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {songs.map((song) => {
            // Show the matching lyric only when the words weren't already in the title or artist.
            const inHeading = `${song.title} ${song.artist ?? ""}`.toLowerCase().includes(params.q.toLowerCase());
            const snippet = params.q && !inHeading ? lyricSnippet(song.lyrics_text ?? null, params.q) : null;

            return (
              <li key={song.id}>
                <Link href={`/songs/${song.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{song.title}</p>
                    {song.artist && <p className="truncate text-sm text-stone-600">{song.artist}</p>}
                    {snippet && (
                      <p className="line-clamp-2 text-sm text-stone-500">
                        {snippet.before}
                        <mark className="rounded bg-amber-200 px-0.5 text-stone-900">{snippet.match}</mark>
                        {snippet.after}
                      </p>
                    )}
                    {params.sort === "recent" && song.last_used && (
                      <p className="text-xs text-stone-400">Last used {formatServiceDate(song.last_used)}</p>
                    )}
                  </div>
                  {song.youtube_video_id && <VideoIcon />}
                  {song.original_key && (
                    <span className="w-12 shrink-0 rounded-md bg-accent-50 py-1 text-center text-sm font-bold text-accent-700">
                      {song.original_key}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
