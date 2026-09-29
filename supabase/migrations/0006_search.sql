-- 0006_search.sql  (Phase 3, step b: library search and sorting)
-- Run once, after 0005.

-- ---------------------------------------------------------------------------
-- 1. Searchable lyrics
-- ---------------------------------------------------------------------------
-- Songs are stored as ChordPro, with chords inside the words:
--     [G]Amazing [C]grace, how [G]sweet the [D]sound
-- Searching that text for "amazing grace" would find nothing, because "[C]" sits
-- between the words. `lyrics_text` is the same text with the [chords] and
-- {directives} removed and line breaks turned into single spaces:
--     Amazing grace, how sweet the sound
-- The database keeps it up to date by itself (a "generated column"), so the app
-- never has to. It is only read, never written.
alter table public.songs
  add column lyrics_text text
  generated always as (
    btrim(
      regexp_replace(
        regexp_replace(chord_text, '\[[^\]]*\]|\{[^}]*\}', '', 'g'),
        '\s+', ' ', 'g'
      )
    )
  ) stored;

-- ---------------------------------------------------------------------------
-- 2. "Recently used": the latest service each song appears in
-- ---------------------------------------------------------------------------
-- security_invoker = the view runs as the logged-in member, so RLS on
-- lineups / lineup_items applies exactly as if they queried those tables.
-- Archived lineups don't count.
create view public.song_last_used
with (security_invoker = true)
as
select li.song_id, max(l.service_date) as last_used
from public.lineup_items li
join public.lineups l on l.id = li.lineup_id
where l.archived_at is null
  and l.service_date is not null
group by li.song_id;

revoke all on public.song_last_used from anon, authenticated;
grant select on public.song_last_used to authenticated;
