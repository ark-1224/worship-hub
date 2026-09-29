-- 0008_duplicate_lineup.sql  (Phase 4, step c: duplicate a lineup)
-- Run once, after 0007.

-- Copies a lineup and all of its songs (with each song's key for the service,
-- leader and note) into a NEW lineup, and returns the new lineup's id.
--
-- The app decides the new title and date (e.g. "Sunday Service (copy)", a week
-- later) and passes them in, so this function only has to copy.
--
-- SECURITY INVOKER (the default): it runs as the logged-in member, so the same
-- RLS rules apply as if they created the lineup and its items by hand. The new
-- lineup's created_by / updated_by are stamped by the existing triggers.
create function public.duplicate_lineup(
  p_lineup_id    uuid,
  p_title        text,
  p_service_date date
)
returns uuid
language plpgsql
as $$
declare
  v_new uuid;
begin
  insert into public.lineups (title, service_date, service_time, service_type, notes)
  select p_title, p_service_date, l.service_time, l.service_type, l.notes
  from public.lineups l
  where l.id = p_lineup_id
  returning id into v_new;

  if v_new is null then
    raise exception 'Lineup not found or you are not allowed to copy it.';
  end if;

  insert into public.lineup_items (lineup_id, song_id, position, key_override, leader_id, note)
  select v_new, i.song_id, i.position, i.key_override, i.leader_id, i.note
  from public.lineup_items i
  where i.lineup_id = p_lineup_id;

  return v_new;
end;
$$;

revoke execute on function public.duplicate_lineup(uuid, text, date) from public, anon;
grant execute on function public.duplicate_lineup(uuid, text, date) to authenticated;
