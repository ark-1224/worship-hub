-- 0002_auth_and_rls.sql
-- Permissions live HERE, in the database. The UI hides buttons for convenience,
-- but this file is what actually enforces who can do what.
--
-- Rules (from PLAN.md section 5):
--   * Only logged-in members can read or write anything.
--   * Only admins can manage invite_codes and change member roles.
--   * Nothing is ever hard-deleted from songs / lineups (archive instead).
--   * Nobody can register without an active invite code.

-- ---------------------------------------------------------------------------
-- 1. Helper functions used by the policies below
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER = runs with the function owner's rights, so these can read
-- `profiles` without triggering profiles' own RLS policy (which would loop
-- forever). `set search_path` stops anyone from hijacking the lookup.

create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Invite codes
-- ---------------------------------------------------------------------------
-- Friendly pre-check used by the /join page so a wrong code shows a clear
-- message. It is NOT the security boundary: the trigger in section 3 is.
-- Returns only true/false, never the list of codes.
create function public.check_invite_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invite_codes
    where active
      and lower(btrim(code)) = lower(btrim(coalesce(p_code, '')))
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Sign-up gate + profile creation
-- ---------------------------------------------------------------------------
-- Runs inside Supabase's auth.users INSERT, i.e. for EVERY way of creating an
-- account (our form, a direct call to the public signup API, OAuth...).
-- No active invite code in the user metadata -> exception -> the whole sign-up
-- is rolled back and no account exists.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := new.raw_user_meta_data ->> 'invite_code';
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
begin
  if not public.check_invite_code(v_code) then
    raise exception 'A valid team invite code is required to join.'
      using errcode = 'P0001';
  end if;

  if v_name = '' then
    v_name := split_part(coalesce(new.email, 'member'), '@', 1);
  end if;

  insert into public.profiles (id, name)
  values (new.id, left(v_name, 100));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Guard triggers (things RLS policies can't express: "old vs new value")
-- ---------------------------------------------------------------------------
-- auth.uid() is NULL when the SQL runs from the Supabase SQL editor or with the
-- service key. Those are trusted, which is how you make the first admin.

-- Members may edit their own name/instrument, but only admins may change `role`.
create function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change member roles.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Any member can archive a song/lineup, but only an admin can restore it
-- (set archived_at back to NULL).
create function public.guard_restore()
returns trigger
language plpgsql
as $$
begin
  if old.archived_at is not null
     and new.archived_at is null
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can restore archived items.';
  end if;
  return new;
end;
$$;

create trigger songs_guard_restore
  before update on public.songs
  for each row execute function public.guard_restore();

create trigger lineups_guard_restore
  before update on public.lineups
  for each row execute function public.guard_restore();

-- created_by / updated_by always come from the logged-in user, never from the
-- client, so nobody can fake "Last edited by Maria".
create function public.stamp_author()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger songs_stamp_author
  before insert or update on public.songs
  for each row execute function public.stamp_author();

create trigger lineups_stamp_author
  before insert or update on public.lineups
  for each row execute function public.stamp_author();

-- ---------------------------------------------------------------------------
-- 5. Table privileges (belt and braces, on top of RLS)
-- ---------------------------------------------------------------------------
-- Start from nothing, then grant only what each role needs.
-- The `anon` role (not logged in) gets no table access at all.
-- Note the missing DELETE grants on profiles / songs / song_versions / lineups:
-- even a buggy policy could not let members hard-delete them.

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;

grant select, update                 on public.profiles      to authenticated;
grant select, insert, update         on public.songs         to authenticated;
grant select, insert                 on public.song_versions to authenticated;
grant select, insert, update         on public.lineups       to authenticated;
grant select, insert, update, delete on public.lineup_items  to authenticated;
grant select, insert, update, delete on public.invite_codes  to authenticated; -- admin-only via RLS

-- Functions default to "anyone can execute". Tighten that.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_member()                 to authenticated;
grant execute on function public.is_admin()                  to authenticated;
grant execute on function public.check_invite_code(text)     to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security: turn it on for EVERY table
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.songs         enable row level security;
alter table public.song_versions enable row level security;
alter table public.lineups       enable row level security;
alter table public.lineup_items  enable row level security;
alter table public.invite_codes  enable row level security;

-- profiles: members see the team list; you edit only your own row
-- (admins can edit anyone's, e.g. to promote a member). No INSERT policy:
-- profiles are only created by the sign-up trigger above.
create policy "members read profiles"
  on public.profiles for select to authenticated
  using (public.is_member());

create policy "edit own profile or admin edits any"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- songs: any member can read / add / edit. No DELETE policy = no hard deletes.
-- Archived rows stay readable; the app filters them out (admins restore them).
create policy "members read songs"
  on public.songs for select to authenticated
  using (public.is_member());

create policy "members add songs"
  on public.songs for insert to authenticated
  with check (public.is_member());

create policy "members edit songs"
  on public.songs for update to authenticated
  using (public.is_member())
  with check (public.is_member());

-- song_versions: append-only history. No UPDATE / DELETE policy, so a version
-- can never be rewritten or erased. edited_by must be the caller.
create policy "members read song versions"
  on public.song_versions for select to authenticated
  using (public.is_member());

create policy "members add song versions"
  on public.song_versions for insert to authenticated
  with check (public.is_member() and edited_by = auth.uid());

-- lineups (used from Phase 2)
create policy "members read lineups"
  on public.lineups for select to authenticated
  using (public.is_member());

create policy "members add lineups"
  on public.lineups for insert to authenticated
  with check (public.is_member());

create policy "members edit lineups"
  on public.lineups for update to authenticated
  using (public.is_member())
  with check (public.is_member());

-- lineup_items: members manage the ordered song list freely
create policy "members read lineup items"
  on public.lineup_items for select to authenticated
  using (public.is_member());

create policy "members add lineup items"
  on public.lineup_items for insert to authenticated
  with check (public.is_member());

create policy "members edit lineup items"
  on public.lineup_items for update to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "members remove lineup items"
  on public.lineup_items for delete to authenticated
  using (public.is_member());

-- invite_codes: admins only, for everything. Regular members cannot even read
-- the codes (the join page only uses check_invite_code(), which returns true/false).
create policy "admins manage invite codes"
  on public.invite_codes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
