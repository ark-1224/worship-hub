import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreSongVersion } from "@/app/(app)/songs/actions";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { ChordSheet } from "@/components/songs/ChordSheet";
import { DiffView } from "@/components/songs/DiffView";
import { parseChordPro } from "@/lib/chords/chordpro";
import { diffDetails, diffLines, hasChanges, type SongDetails } from "@/lib/diff";
import { appTimezone, formatTimestamp, timeAgo } from "@/lib/lineups";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Song history" };

type VersionRow = {
  id: string;
  created_at: string;
  edit_note: string | null;
  title: string;
  has_details: boolean;
  editor: { name: string } | null;
};

export default async function SongHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [songResult, versionsResult] = await Promise.all([
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    // `profiles!edited_by` = the member who saved that version.
    supabase
      .from("song_versions")
      .select("id, created_at, edit_note, title, has_details, editor:profiles!edited_by(name)")
      .eq("song_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const song = songResult.data;
  if (!song) notFound();
  const versions = (versionsResult.data ?? []) as unknown as VersionRow[];
  const tz = appTimezone();

  // ---- One version, compared with the song as it is now -------------------
  if (v && isUuid(v)) {
    const { data: version } = await supabase
      .from("song_versions")
      .select("*, editor:profiles!edited_by(name)")
      .eq("id", v)
      .eq("song_id", id)
      .maybeSingle();
    if (!version) notFound();

    const now: SongDetails = {
      title: song.title,
      artist: song.artist,
      originalKey: song.original_key,
      bpm: song.bpm,
      tags: song.tags ?? [],
      youtubeVideoId: song.youtube_video_id,
      spotifyUrl: song.spotify_url,
      notes: song.notes,
    };
    // Older versions only saved the title and chords: everything else stays as it is now.
    const then: SongDetails = version.has_details
      ? {
          title: version.title,
          artist: version.artist,
          originalKey: version.original_key,
          bpm: version.bpm,
          tags: version.tags ?? [],
          youtubeVideoId: version.youtube_video_id,
          spotifyUrl: version.spotify_url,
          notes: version.notes,
        }
      : { ...now, title: version.title };

    // Read as "what happens if I restore": red lines go away, green lines come back.
    const lines = diffLines(song.chord_text ?? "", version.chord_text ?? "");
    const fields = diffDetails(now, then);
    const identical = !hasChanges(lines) && fields.length === 0;

    return (
      <div className="space-y-5">
        <Link href={`/songs/${id}/history`} className="text-sm font-medium text-accent-700 hover:underline">
          ← All versions
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{song.title}</h1>
          <p className="text-stone-600">
            Version from {formatTimestamp(version.created_at, tz)}
            {version.editor?.name ? ` by ${version.editor.name}` : ""}
          </p>
          {version.edit_note && <p className="text-stone-700">“{version.edit_note}”</p>}
        </header>

        {!version.has_details && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This is an older version, saved before history started keeping every detail. Restoring it brings back only
            the title and the chords; the key, BPM, tags and links stay as they are now.
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">If you restore this version</h2>
          <p className="text-sm text-stone-600">
            <span className="font-semibold text-emerald-800">Green (+)</span> lines come back;{" "}
            <span className="font-semibold text-red-800">red (−)</span> lines go away.
          </p>
          <DiffView lines={lines} fields={fields} />
        </section>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Preview this version</summary>
          <div className="mt-3 overflow-x-auto">
            <ChordSheet lines={parseChordPro(version.chord_text ?? "")} />
          </div>
        </details>

        {identical ? (
          <p className="text-stone-600">This version matches the song as it is now, so there is nothing to restore.</p>
        ) : (
          <ConfirmActionButton
            action={restoreSongVersion.bind(null, version.id)}
            label="Restore this version"
            pendingLabel="Restoring…"
            confirmMessage="Restore this version? The song will go back to it. The current version stays in the history, so you can undo this."
          />
        )}
      </div>
    );
  }

  // ---- The list of versions -----------------------------------------------
  return (
    <div className="space-y-5">
      <Link href={`/songs/${id}`} className="text-sm font-medium text-accent-700 hover:underline">
        ← Back to the song
      </Link>
      <header>
        <h1 className="text-2xl font-bold">History: {song.title}</h1>
        <p className="text-stone-600">Every save is kept. Open a version to compare it and restore it.</p>
      </header>

      {versions.length === 0 ? (
        <p className="card text-stone-600">
          No versions yet. History is saved each time the song is added or edited.
        </p>
      ) : (
        <ol className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {versions.map((version, index) => (
            <li key={version.id}>
              <Link href={`/songs/${id}/history?v=${version.id}`} className="block px-4 py-3 hover:bg-stone-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    {formatTimestamp(version.created_at, tz)}
                    <span className="ml-2 text-sm font-normal text-stone-500">{timeAgo(version.created_at)}</span>
                  </p>
                  {index === 0 && (
                    <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-600">
                  {version.editor?.name ? `by ${version.editor.name}` : "by someone"}
                  {version.edit_note ? ` · “${version.edit_note}”` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
