-- 0004_lineups.sql  (Phase 2: lineups)
-- The lineups / lineup_items tables and their RLS policies already exist from
-- 0001 and 0002. This adds what the lineup screens need. Run it once, after 0003.

-- ---------------------------------------------------------------------------
-- 1. Small schema additions
-- ---------------------------------------------------------------------------
-- "Service type" is on the lineup page in PLAN.md but wasn't in the schema.
alter table public.lineups
  add column service_type text check (char_length(service_type) <= 100);

alter table public.lineup_items
  add constraint lineup_items_note_length check (char_length(note) <= 500);

-- ---------------------------------------------------------------------------
-- 2. "Last edited by ..." covers song-list changes too
-- ---------------------------------------------------------------------------
-- Any change to a lineup's songs touches the lineup row. The existing
-- stamp_author / touch_updated_at triggers on `lineups` then set updated_at and
-- updated_by (the logged-in member). Runs as the caller, so RLS still applies.
create function public.touch_lineup_from_item()
returns trigger
language plpgsql
as $$
begin
  update public.lineups
  set updated_at = now()
  where id = coalesce(new.lineup_id, old.lineup_id);
  return null; -- AFTER trigger: return value is ignored
end;
$$;

create trigger lineup_items_touch_lineup
  after insert or update or delete on public.lineup_items
  for each row execute function public.touch_lineup_from_item();

-- ---------------------------------------------------------------------------
-- 3. Adding and reordering songs
-- ---------------------------------------------------------------------------
-- Everything runs as the logged-in member (SECURITY INVOKER), so RLS applies.

-- Adds a song at the END of the lineup. The position is worked out inside the
-- database so two people adding a song at once can't both pick the same slot.
create function public.add_lineup_item(p_lineup_id uuid, p_song_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.lineup_items (lineup_id, song_id, position)
  select p_lineup_id, p_song_id, coalesce(max(position), -1) + 1
  from public.lineup_items
  where lineup_id = p_lineup_id
  returning id into v_id;

  return v_id;
end;
$$;

-- Reordering just rewrites the position numbers: the array lists the item ids
-- in their new order (first id = position 0). Done in one statement, so the
-- order changes all at once and other viewers never see a half-moved list.
create function public.reorder_lineup_items(p_lineup_id uuid, p_item_ids uuid[])
returns void
language sql
as $$
  update public.lineup_items li
  set position = o.new_position - 1
  from unnest(p_item_ids) with ordinality as o(item_id, new_position)
  where li.id = o.item_id
    and li.lineup_id = p_lineup_id;
$$;

revoke execute on function public.touch_lineup_from_item() from public, anon, authenticated;
revoke execute on function public.add_lineup_item(uuid, uuid) from public, anon;
revoke execute on function public.reorder_lineup_items(uuid, uuid[]) from public, anon;
grant execute on function public.add_lineup_item(uuid, uuid) to authenticated;
grant execute on function public.reorder_lineup_items(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Realtime: let the browser hear about changes to lineups
-- ---------------------------------------------------------------------------
-- Supabase Realtime only broadcasts tables that are in this "publication".
-- It respects RLS, so only logged-in members receive the events.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lineups'
  ) then
    alter publication supabase_realtime add table public.lineups;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lineup_items'
  ) then
    alter publication supabase_realtime add table public.lineup_items;
  end if;
end;
$$;
