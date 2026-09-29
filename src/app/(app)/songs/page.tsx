import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Song library" };

// The search value goes into a PostgREST "or" filter, where , ( ) " \ have
// special meaning. Replace them (and LIKE wildcards) so a query can't break
// or change the filter.
function cleanSearch(q: string): string {
  return q.replace(/[,()"\\%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-red-600"
      role="img"
      aria-label="Has video"
      fill="currentColor"
    >
      <title>Has video</title>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

export default async function SongLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const search = cleanSearch(q);

  const supabase = await createClient();
  let query = supabase
    .from("songs")
    .select("id, title, artist, original_key, youtube_video_id")
    .is("archived_at", null)
    .order("title", { ascending: true });

  if (search) query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);

  const { data: songs, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Song library</h1>
        <Link href="/songs/new" className="btn-primary">
          Add song
        </Link>
      </div>

      {/* Plain GET form: works without JavaScript and keeps the search in the URL. */}
      <form action="/songs" role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search by title or artist
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search title or artist"
          className="input"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error && <p className="form-error">Couldn&apos;t load songs. Please refresh.</p>}

      {songs && songs.length === 0 && (
        <p className="card text-stone-600">
          {search ? `No songs match “${search}”.` : "No songs yet. Add the first one!"}
        </p>
      )}

      {songs && songs.length > 0 && (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/songs/${song.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-stone-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{song.title}</p>
                  {song.artist && <p className="truncate text-sm text-stone-600">{song.artist}</p>}
                </div>
                {song.youtube_video_id && <VideoIcon />}
                {song.original_key && (
                  <span className="w-12 shrink-0 rounded-md bg-accent-50 py-1 text-center text-sm font-bold text-accent-700">
                    {song.original_key}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
