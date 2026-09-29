"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSongForm, type SongFieldErrors } from "@/lib/songs";

export type SaveSongState = { error?: string; fieldErrors?: SongFieldErrors } | undefined;

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
