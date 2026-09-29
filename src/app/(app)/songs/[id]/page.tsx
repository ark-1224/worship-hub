import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveSong } from "@/app/(app)/songs/actions";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { SongViewer } from "@/components/songs/SongViewer";
import { YouTubePlayer } from "@/components/songs/YouTubePlayer";
import { KEY_PATTERN } from "@/lib/chords/keys";
import { libraryHref } from "@/lib/library";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Song" };

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Lineups link here as /songs/<id>?key=A to open the song in that service's key.
  const { key } = await searchParams;
  const lineupKey = key && KEY_PATTERN.test(key) ? key : null;

  const supabase = await createClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) notFound();

  // How many (non-archived) lineups use this song, so the archive button can warn.
  const { data: usage } = await supabase
    .from("lineup_items")
    .select("lineup_id, lineups!inner(archived_at)")
    .eq("song_id", id)
    .is("lineups.archived_at", null);
  const usedInLineups = new Set((usage ?? []).map((row) => row.lineup_id)).size;

  return (
    <article className="space-y-5">
      {song.archived_at && (
        <p role="status" className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-700">
          This song is archived, so it no longer shows in the library or the lineup picker. An admin can restore it.
        </p>
      )}

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{song.title}</h1>
            {song.artist && <p className="text-stone-600">{song.artist}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/songs/${song.id}/history`} className="btn-secondary">
              History
            </Link>
            <Link href={`/songs/${song.id}/edit`} className="btn-secondary">
              Edit
            </Link>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
          {song.original_key && (
            <div>
              <dt className="inline text-stone-500">Key </dt>
              <dd className="inline font-semibold">{song.original_key}</dd>
            </div>
          )}
          {song.bpm && (
            <div>
              <dt className="inline text-stone-500">BPM </dt>
              <dd className="inline font-semibold">{song.bpm}</dd>
            </div>
          )}
        </dl>

        {song.tags?.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {song.tags.map((tag: string) => (
              <li key={tag}>
                {/* A tag opens the library filtered to that tag. */}
                <Link
                  href={libraryHref({ tag })}
                  className="inline-block rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700 hover:bg-accent-200"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {song.notes && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
          {song.notes}
        </p>
      )}

      {song.youtube_video_id && <YouTubePlayer videoId={song.youtube_video_id} />}

      {song.spotify_url && (
        <a
          href={song.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full sm:w-auto"
        >
          Open in Spotify
        </a>
      )}

      {/* key= restarts the viewer if you open the same song in a different key */}
      <SongViewer
        key={lineupKey ?? "original"}
        chordText={song.chord_text ?? ""}
        originalKey={song.original_key}
        initialKey={lineupKey}
      />

      {!song.archived_at && (
        <section className="space-y-2 border-t border-stone-200 pt-5">
          {usedInLineups > 0 && (
            <p className="text-sm text-stone-600">
              This song is used in {usedInLineups} {usedInLineups === 1 ? "lineup" : "lineups"}. Archiving it won&apos;t
              remove it from {usedInLineups === 1 ? "that lineup" : "those lineups"}.
            </p>
          )}
          <ConfirmActionButton
            action={archiveSong.bind(null, song.id)}
            label="Archive this song"
            pendingLabel="Archiving…"
            variant="danger"
            confirmMessage={`Archive “${song.title}”?${
              usedInLineups > 0
                ? ` It is used in ${usedInLineups} ${usedInLineups === 1 ? "lineup" : "lineups"} and will stay there.`
                : ""
            } It will disappear from the library, and only an admin can bring it back.`}
          />
        </section>
      )}
    </article>
  );
}
