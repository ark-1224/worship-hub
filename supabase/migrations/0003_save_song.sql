-- 0003_save_song.sql
-- One function that saves a song AND writes its history row in a single
-- transaction, so a song can never be saved without a song_versions entry.
--
-- SECURITY INVOKER (the default): it runs as the logged-in user, so the RLS
-- policies from 0002 still apply. author fields are stamped by triggers.
--
-- Pass p_id = NULL to create a song, or an existing id to update it.
-- Returns the song's id.

create function public.save_song(
  p_id               uuid,
  p_title            text,
  p_artist           text,
  p_original_key     text,
  p_bpm              integer,
  p_tags             text[],
  p_youtube_video_id text,
  p_spotify_url      text,
  p_notes            text,
  p_chord_text       text,
  p_edit_note        text
)
returns uuid
language plpgsql
as $$
declare
  v_id   uuid;
  v_note text := nullif(btrim(coalesce(p_edit_note, '')), '');
begin
  if p_id is null then
    insert into public.songs (
      title, artist, original_key, bpm, tags,
      youtube_video_id, spotify_url, notes, chord_text
    )
    values (
      btrim(p_title), nullif(btrim(p_artist), ''), nullif(btrim(p_original_key), ''),
      p_bpm, coalesce(p_tags, '{}'),
      nullif(btrim(p_youtube_video_id), ''), nullif(btrim(p_spotify_url), ''),
      nullif(btrim(p_notes), ''), coalesce(p_chord_text, '')
    )
    returning id into v_id;

    v_note := coalesce(v_note, 'Song created');
  else
    update public.songs set
      title            = btrim(p_title),
      artist           = nullif(btrim(p_artist), ''),
      original_key     = nullif(btrim(p_original_key), ''),
      bpm              = p_bpm,
      tags             = coalesce(p_tags, '{}'),
      youtube_video_id = nullif(btrim(p_youtube_video_id), ''),
      spotify_url      = nullif(btrim(p_spotify_url), ''),
      notes            = nullif(btrim(p_notes), ''),
      chord_text       = coalesce(p_chord_text, '')
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Song not found or you are not allowed to edit it.';
    end if;
  end if;

  insert into public.song_versions (song_id, chord_text, title, edited_by, edit_note)
  values (v_id, coalesce(p_chord_text, ''), btrim(p_title), auth.uid(), v_note);

  return v_id;
end;
$$;

revoke execute on function public.save_song(
  uuid, text, text, text, integer, text[], text, text, text, text, text
) from public, anon;
grant execute on function public.save_song(
  uuid, text, text, text, integer, text[], text, text, text, text, text
) to authenticated;
