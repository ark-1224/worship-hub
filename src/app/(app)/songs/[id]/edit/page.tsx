import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongForm } from "@/components/songs/SongForm";
import { youtubeWatchUrl } from "@/lib/links";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit song" };

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit song</h1>
      <SongForm
        initial={{
          id: song.id,
          title: song.title,
          artist: song.artist ?? "",
          originalKey: song.original_key ?? "",
          bpm: song.bpm?.toString() ?? "",
          tags: (song.tags ?? []).join(", "),
          // Only the video ID is stored; rebuild a normal link for the form.
          youtube: song.youtube_video_id ? youtubeWatchUrl(song.youtube_video_id) : "",
          spotify: song.spotify_url ?? "",
          notes: song.notes ?? "",
          chordText: song.chord_text ?? "",
        }}
      />
    </div>
  );
}
