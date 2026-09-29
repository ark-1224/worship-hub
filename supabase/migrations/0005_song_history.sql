-- 0005_song_history.sql  (Phase 3, step a: song history and restore)
-- Run once, after 0004.
--
-- Until now each saved version stored only the title and the chords. From now on
-- every save also stores the key, BPM, artist, tags, links and notes, so
-- "Restore this version" can undo a change to any of them.
-- Versions saved BEFORE this migration only have title + chords; `has_details`
-- tells the two kinds apart (a NULL artist could mean "none" or "not saved").

-- ---------------------------------------------------------------------------
-- 1. Room for the full snapshot
-- ---------------------------------------------------------------------------
alter table public.song_versions
  add column artist           text,
  add column original_key     text,
  add column bpm              integer,
  add column tags             text[],
  add column youtube_video_id text,
  add column spotify_url      text,
  add column notes            text,
  add column has_details      boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. save_song() now writes the full snapshot
-- ---------------------------------------------------------------------------
-- Same signature as in 0003 (so the app and existing permissions are
-- unaffected); only the history row it writes is richer. The snapshot is read
-- back from the saved song, so it holds exactly what was stored.
create or replace function public.save_song(
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

  insert into public.song_versions (
    song_id, title, chord_text, edited_by, edit_note,
    artist, original_key, bpm, tags, youtube_video_id, spotify_url, notes, has_details
  )
  select s.id, s.title, s.chord_text, auth.uid(), v_note,
         s.artist, s.original_key, s.bpm, s.tags, s.youtube_video_id, s.spotify_url, s.notes, true
  from public.songs s
  where s.id = v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Restoring a version
-- ---------------------------------------------------------------------------
-- Puts a saved version back as the song's current state AND records that as a
-- new history entry, so nothing is lost and a restore can itself be undone.
-- SECURITY INVOKER: runs as the logged-in member, so RLS still applies.
create function public.restore_song_version(p_version_id uuid)
returns uuid
language plpgsql
as $$
declare
  v public.song_versions%rowtype;
begin
  select * into v from public.song_versions where id = p_version_id;
  if not found then
    raise exception 'That version no longer exists.';
  end if;

  if v.has_details then
    update public.songs set
      title            = v.title,
      chord_text       = v.chord_text,
      artist           = v.artist,
      original_key     = v.original_key,
      bpm              = v.bpm,
      tags             = coalesce(v.tags, '{}'),
      youtube_video_id = v.youtube_video_id,
      spotify_url      = v.spotify_url,
      notes            = v.notes
    where id = v.song_id;
  else
    -- An older version: only the title and chords were saved.
    update public.songs set title = v.title, chord_text = v.chord_text where id = v.song_id;
  end if;

  if not found then
    raise exception 'Song not found or you are not allowed to edit it.';
  end if;

  insert into public.song_versions (
    song_id, title, chord_text, edited_by, edit_note,
    artist, original_key, bpm, tags, youtube_video_id, spotify_url, notes, has_details
  )
  select s.id, s.title, s.chord_text, auth.uid(),
         'Restored the version from ' || to_char(v.created_at at time zone 'UTC', 'Mon FMDD, YYYY'),
         s.artist, s.original_key, s.bpm, s.tags, s.youtube_video_id, s.spotify_url, s.notes, true
  from public.songs s
  where s.id = v.song_id;

  return v.song_id;
end;
$$;

revoke execute on function public.restore_song_version(uuid) from public, anon;
grant execute on function public.restore_song_version(uuid) to authenticated;
