-- 0001_schema.sql
-- Full schema from PLAN.md section 4, created now so later phases
-- (lineups, history, admin) don't need big migrations.
-- Run order: 0001 -> 0002 -> 0003.

-- ---------------------------------------------------------------------------
-- profiles: one row per member, linked 1:1 to Supabase's built-in auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 100),
  voice_or_instrument text check (char_length(voice_or_instrument) <= 100),
  role                text not null default 'member' check (role in ('admin', 'member')),
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
create table public.songs (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(btrim(title)) between 1 and 200),
  artist           text check (char_length(artist) <= 200),
  -- e.g. G, F#, Bb, Am. Validated here AND in the app.
  original_key     text check (original_key ~ '^[A-G][#b]?m?$'),
  bpm              integer check (bpm between 20 and 300),
  tags             text[] not null default '{}',
  -- Only the 11-character video ID is stored, never the full URL.
  youtube_video_id text check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  spotify_url      text check (char_length(spotify_url) <= 500),
  notes            text,
  -- Always ChordPro, e.g. "[G]Amazing [C]grace"
  chord_text       text not null default '',
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Soft delete: non-null means "in the archive". Rows are never hard-deleted.
  archived_at      timestamptz
);

create index songs_title_idx on public.songs (lower(title));
create index songs_archived_idx on public.songs (archived_at);

-- ---------------------------------------------------------------------------
-- song_versions: a new row on every save (history UI comes in Phase 3)
-- ---------------------------------------------------------------------------
create table public.song_versions (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  chord_text text not null,
  title      text not null,
  edited_by  uuid references public.profiles (id) on delete set null,
  edit_note  text check (char_length(edit_note) <= 500),
  created_at timestamptz not null default now()
);

create index song_versions_song_idx on public.song_versions (song_id, created_at desc);

-- ---------------------------------------------------------------------------
-- lineups + lineup_items (UI comes in Phase 2)
-- ---------------------------------------------------------------------------
create table public.lineups (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  service_date date,
  service_time time,
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create index lineups_date_idx on public.lineups (service_date);

create table public.lineup_items (
  id           uuid primary key default gen_random_uuid(),
  lineup_id    uuid not null references public.lineups (id) on delete cascade,
  -- RESTRICT: a song that is used in a lineup can never be hard-deleted.
  song_id      uuid not null references public.songs (id) on delete restrict,
  position     integer not null,
  -- The key chosen for this service only; the song's original_key never changes.
  key_override text check (key_override ~ '^[A-G][#b]?m?$'),
  leader_id    uuid references public.profiles (id) on delete set null,
  note         text
);

create index lineup_items_lineup_idx on public.lineup_items (lineup_id, position);

-- ---------------------------------------------------------------------------
-- invite_codes: a member can only register with an active code
-- ---------------------------------------------------------------------------
create table public.invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (char_length(btrim(code)) >= 4),
  active     boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Codes are compared case-insensitively, so keep them unique that way too.
create unique index invite_codes_code_key on public.invite_codes (lower(btrim(code)));

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on every UPDATE
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function public.touch_updated_at();

create trigger lineups_touch_updated_at
  before update on public.lineups
  for each row execute function public.touch_updated_at();
