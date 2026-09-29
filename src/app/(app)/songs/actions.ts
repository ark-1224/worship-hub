"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, parseSongForm, type SongFieldErrors } from "@/lib/songs";

export type SaveSongState = { error?: string; fieldErrors?: SongFieldErrors } | undefined;
export type SimpleState = { error?: string } | undefined;

// Saves a new or edited song. Everything is checked again here on the server
// (never trust the browser), then handed to the save_song() database function,
// which also writes the song_versions history row in the same transaction.
export async function saveSong(_prev: SaveSongState, formData: FormData): Promise<SaveSongState> {
  const parsed = parseSongForm(formData);
  if (!parsed.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.errors };
  }
  const song = parsed.value;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: songId, error } = await supabase.rpc("save_song", {
    p_id: song.id,
    p_title: song.title,
    p_artist: song.artist,
    p_original_key: song.originalKey,
    p_bpm: song.bpm,
    p_tags: song.tags,
    p_youtube_video_id: song.youtubeVideoId ?? "",
    p_spotify_url: song.spotifyUrl ?? "",
    p_notes: song.notes,
    p_chord_text: song.chordText,
    p_edit_note: song.editNote,
  });

  if (error || !songId) {
    // RLS / database errors end up here (e.g. not logged in, song missing).
    return { error: "Couldn't save the song. Please try again." };
  }

  redirect(`/songs/${songId}`);
}

// Puts an older version of a song back (the title, chords and, for versions
// saved since Phase 3, the key, BPM, tags, links and notes). The database
// function also records the restore as a new history entry, so it can be undone.
export async function restoreSongVersion(
  versionId: string,
  _prev: SimpleState,
  _formData: FormData,
): Promise<SimpleState> {
  void _formData;
  if (!isUuid(versionId)) return { error: "Something went wrong. Please try again." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: songId, error } = await supabase.rpc("restore_song_version", { p_version_id: versionId });
  if (error || !songId) return { error: "Couldn't restore that version. Please try again." };

  redirect(`/songs/${songId}`);
}

// Moves a song to the archive (a "soft delete": nothing is erased). Any member
// can archive it; only an admin can restore it (enforced in the database).
export async function archiveSong(
  songId: string,
  _prev: SimpleState,
  _formData: FormData,
): Promise<SimpleState> {
  void _formData;
  if (!isUuid(songId)) return { error: "Something went wrong. Please try again." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data, error } = await supabase
    .from("songs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", songId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't archive the song. Please try again." };

  redirect("/songs");
}
