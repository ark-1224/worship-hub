-- 0007_team_admin.sql  (Phase 3, step c: team and admin tools)
-- Run once, after 0006.

-- ---------------------------------------------------------------------------
-- 1. Never leave the team without an admin
-- ---------------------------------------------------------------------------
-- Blocks a change that would demote the LAST remaining admin. (Promoting people
-- and demoting an admin while another admin exists are fine.) The role-change
-- rule from 0002 (only admins may change roles) still applies as well.
create function public.guard_last_admin()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and new.role <> 'admin'
     and not exists (
       select 1 from public.profiles where role = 'admin' and id <> old.id
     ) then
    raise exception 'There must be at least one admin. Make someone else an admin first.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_last_admin
  before update on public.profiles
  for each row execute function public.guard_last_admin();

-- ---------------------------------------------------------------------------
-- 2. Removing a member
-- ---------------------------------------------------------------------------
-- A member's login lives in Supabase's built-in auth.users table, which the
-- website's normal (public-key) access can't touch. Deleting the login is the
-- proper way to remove someone; their profile goes with it automatically.
-- Their songs and lineups stay (the "created by" / "edited by" name is simply
-- cleared, because those links are ON DELETE SET NULL).
--
-- SECURITY DEFINER = runs with the owner's rights so it may delete from
-- auth.users; that is safe ONLY because the first thing it does is check the
-- caller is an admin. `set search_path` stops anyone hijacking the lookup.
create function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove members.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t remove yourself. Ask another admin to do it.';
  end if;

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'That member no longer exists.';
  end if;
end;
$$;

revoke execute on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;
