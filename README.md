# Worship Hub

A private website for our worship team / choir: store songs with chords and lyrics,
transpose them, and play the song's YouTube video. Built mobile-first for use at
practice and during service.

**Stack:** Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (auth + Postgres) · Vercel.

The full roadmap is in [PLAN.md](PLAN.md). This repo currently contains **Phase 1**
(login with invite code, add/edit songs, library, song page with transpose + player).

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. Pick a name (e.g. `worship-hub`), a strong database password (save it somewhere), and the region closest to your team.
3. Wait a minute for it to finish setting up.

### Auth settings (Authentication → Sign In / Providers → Email)

- **Confirm email:** we recommend turning this **off**. The invite code is what keeps outsiders out, and Supabase's built-in email sender only allows a few emails per hour on the free plan. (If you leave it on, sign-up still works: people get a "check your email" message.)
- Leave "Allow new users to sign up" **on**. Sign-ups are still blocked without an invite code, enforced by the database.

### URL settings (Authentication → URL Configuration)

- **Site URL:** `http://localhost:3000` for now (change to your Vercel URL after deploying).
- **Redirect URLs:** add `http://localhost:3000/**` and later `https://YOUR-SITE.vercel.app/**`.

### Password-reset email template (recommended)

Authentication → Emails → **Reset Password**. Change the link to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a>
```

This makes the reset link work even if a member opens the email on a different
device than the one they requested it from. (The default link also works, but only
on the same device/browser.)

> Free-plan emails are limited to a few per hour. If members can't get reset emails, set up
> custom SMTP (Project Settings → Authentication → SMTP), e.g. with Resend.

## 2. Run the SQL migrations

In the Supabase dashboard open **SQL Editor → New query**, then paste and **Run** each file **in this order**:

1. `supabase/migrations/0001_schema.sql` – tables
2. `supabase/migrations/0002_auth_and_rls.sql` – permissions (Row Level Security), invite-code gate
3. `supabase/migrations/0003_save_song.sql` – the "save song + write history" function

Each should finish with "Success. No rows returned". Run them only once; if you need to start over, use
Database → reset the project or drop the tables first.

(If you prefer the Supabase CLI: `supabase link` then `supabase db push` applies the same files.)

## 3. Create the first invite code and the first admin

Nobody can join without an invite code, and only admins can create codes, so the first one is made by hand:

1. Open [`supabase/bootstrap.sql`](supabase/bootstrap.sql), change the code text, and run **step 1** in the SQL Editor.
2. Open your site's `/join` page and sign up with that code.
3. Back in `bootstrap.sql`, put your email in **step 3** and run it to make yourself admin.

Give teammates the same code (a code can be used by many people; deactivate it later by setting `active = false`).

## 4. Set environment variables

```bash
cp .env.local.example .env.local      # Windows PowerShell: Copy-Item .env.local.example .env.local
```

Fill in `.env.local` from Supabase → **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | "Publishable key" (or the legacy `anon` key) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your Vercel URL in production |

Never use the `service_role` / secret key in this project. `.env.local` is git-ignored, so keys never get committed.

## 5. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. To test on your phone, open `http://<your-computer-LAN-IP>:3000` on the same Wi-Fi
(add that URL to Supabase's Redirect URLs if you test password reset from the phone).

Other commands:

```bash
npm test          # unit tests (transposer, chord-sheet converter, YouTube parser)
npm run lint
npm run build     # production build
```

## 6. Deploy to Vercel

1. Push this repo to GitHub.
2. On <https://vercel.com>: **Add New → Project**, import the repo (framework: Next.js is auto-detected).
3. Under **Environment Variables** add the three variables from step 4. Use your final Vercel URL for `NEXT_PUBLIC_SITE_URL`.
4. Deploy. Then in Supabase → Authentication → URL Configuration, set **Site URL** to the Vercel URL and add `https://YOUR-SITE.vercel.app/**` to Redirect URLs.

## How permissions work (short version)

- The **database** (Row Level Security in `0002_auth_and_rls.sql`) decides who can do what, not the UI: only logged-in members can read or write; only admins can manage invite codes and change roles; songs and lineups are never hard-deleted (soft-delete with `archived_at`).
- **Sign-up is gated by a database trigger** that rejects any new account without an active invite code, so calling Supabase's API directly can't bypass it.
- Every song save also writes a row to `song_versions` (the history screen arrives in Phase 3).

## Backups

The free Supabase plan has no automatic backups. Plan a monthly export of the `songs` table
(Table Editor → Export as CSV, or `pg_dump`).
