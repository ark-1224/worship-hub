-- bootstrap.sql  (run by hand in the Supabase SQL editor, NOT a migration)
--
-- Chicken-and-egg: nobody can join without an invite code, and only an admin can
-- create invite codes. So the very first code is created here, from the SQL
-- editor (which runs with full rights and bypasses Row Level Security).

-- ---------------------------------------------------------------------------
-- STEP 1: create the first invite code.  Change the code text, then run.
-- Pick something hard to guess (people can try codes on the join page).
-- ---------------------------------------------------------------------------
insert into public.invite_codes (code, active)
values ('CHANGE-ME-TO-YOUR-TEAM-CODE', true);

-- ---------------------------------------------------------------------------
-- STEP 2: go to your site's /join page and sign up with that code.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- STEP 3: make yourself admin.  Put YOUR email below, then run.
-- The SQL editor is trusted, so the "only admins can change roles" guard lets
-- this through. It should report "1 row updated".
-- ---------------------------------------------------------------------------
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');

-- Check it worked:
-- select p.name, u.email, p.role
-- from public.profiles p join auth.users u on u.id = p.id;
