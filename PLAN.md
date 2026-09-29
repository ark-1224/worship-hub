# Church Worship Team Website: Full Plan

## 1. Summary of decisions

| Topic | Decision |
|---|---|
| Users | Worship team / choir only (private site) |
| Audio | YouTube first, Spotify link as backup |
| Song editing | Any member can add and edit songs |
| Lineup editing | Any member can create and edit lineups |
| Lineup visibility | All members see it immediately |

Because everyone can edit everything, the plan puts extra weight on **edit history and undo**, so a wrong change is easy to fix.

---

## 2. Pages and what's on them

**1. Login / Join**
- Sign up with email and password, plus a **team invite code** that your leader shares. Without the code, nobody can register.
- Forgot password link.

**2. Home**
- "This Sunday's lineup" card at the top, showing the songs in order with a tap-through to each.
- Recently added or edited songs.
- Quick buttons: *Add song*, *New lineup*.

**3. Song Library**
- Search bar (title, artist, lyrics).
- Filter by tag, key, or artist.
- Sort by title, newest, or recently used.
- Each row shows title, artist, key, and a small "has video" icon.

**4. Song Page** (the main feature)
- Title, artist, original key, tempo/BPM (optional), tags.
- **Chord + lyrics display** with chords above the words.
- **Transpose** buttons (− / +) and a key dropdown.
- **Font size** control, plus toggle to hide chords (lyrics only) for singers.
- **Auto-scroll** with adjustable speed.
- **Embedded YouTube player** with playback speed control.
- Edit button, and a "History" link.

**5. Add / Edit Song**
- Fields: title, artist, key, BPM, tags, YouTube link, Spotify link, notes.
- Big text box for lyrics and chords, with **live preview** beside it.
- Accepts two input styles: chords above the words (pasted from a chord sheet) or inline `[G]word` style. It converts to one storage format.
- Save with an optional "what did you change?" note.

**6. Song History**
- List of past versions: who edited, when, and the note.
- Compare a version with the current one, and a **Restore this version** button.

**7. Lineups List**
- Upcoming lineups first, then past ones.
- Button: *New lineup*, or *Duplicate* an old one.

**8. Lineup Page** (view and edit)
- Title, date, time, service type, notes ("closing song should be slow").
- Ordered song list with drag-to-reorder.
- For each song: **key for this service**, who leads, and a short note.
- *Add song* opens a searchable picker from the library.
- **Play all** queues each song's video in order.
- Share link and print/PDF button.
- Live updates: if someone else changes the lineup while you're viewing, it updates without refreshing.

**9. Stage Mode** (phone/tablet view for service)
- Big text, dark background, chords on/off.
- Swipe left/right to move through the lineup songs.
- Screen stays awake.

**10. Profile / Team**
- Your name, instrument or voice part (e.g. "Alto," "Guitar").
- Team member list.
- Admin only: regenerate the invite code and remove members.

---

## 3. How chords and transposing work

The key technical piece. Store every song in **ChordPro-style** text:

```
{title: Amazing Grace}
{key: G}

[G]Amazing [C]grace, how [G]sweet the [D]sound
That [G]saved a wretch like [D]me
```

- The app finds chords inside `[ ]`, converts them, and displays them above the lyrics.
- **Transposing** is math on note names: G up 2 semitones becomes A. Handle sharps and flats (C#, Bb), slash chords (D/F#), and chord types (m, 7, maj7, sus4, add9).
- A small setting for whether to show sharps or flats in the transposed key (e.g. Bb instead of A#).
- Chord-above-lyrics pastes get converted by matching each chord's horizontal position to the word underneath.
- The song's **original key** never changes when someone transposes. Transposing is a temporary view. In a lineup, the chosen key is saved with that lineup entry only.

---

## 4. Database design

```
profiles
  id, name, voice_or_instrument, role (admin/member), created_at

songs
  id, title, artist, original_key, bpm, tags[], 
  youtube_url, spotify_url, notes,
  chord_text (ChordPro),
  created_by, updated_by, created_at, updated_at

song_versions
  id, song_id, chord_text, title, edited_by, edit_note, created_at
  (a new row is saved every time a song is edited)

lineups
  id, title, service_date, service_time, notes,
  created_by, updated_by, created_at, updated_at

lineup_items
  id, lineup_id, song_id, position, 
  key_override, leader_id (nullable), note

invite_codes
  id, code, active, created_by
```

Notes:
- `song_versions` is what powers history and restore.
- `position` in `lineup_items` is the order. Reordering just rewrites the position numbers.
- Songs used in lineups can't be silently deleted. Deleting a song either archives it or warns "this is used in 3 lineups."

---

## 5. Permissions and safety

Everyone can edit, so the safeguards are:

- **Invite code required** to join, and the leader can rotate the code.
- **Only logged-in members** can read anything (private site).
- **Version history** for songs, so any bad edit is reversible.
- **Soft delete:** deleting a song or lineup moves it to an "archive" that an admin can restore.
- **Admin role** (one or two people): manage members, rotate the invite code, restore deleted items.
- Lineups: show "Last edited by Maria, 2 min ago," and use realtime updates to reduce edit collisions.
- Database rules (Supabase Row Level Security) enforce all of this on the server, not just in the interface.

---

## 6. Music player details

- **YouTube:** use the official embed player. It supports play/pause, seeking, playback speed (0.5x to 2x), and looping via the API. Store the video ID, not the whole URL.
- **Spotify:** embeds usually play only 30-second previews unless the listener is logged into Spotify, so treat it as a backup link ("Open in Spotify").
- **Play all** in a lineup: when one video ends, load the next song's video.
- **Optional later:** store a start timestamp per song (for songs where the video has a long intro), and section markers (Verse, Chorus, Bridge) that jump the video when tapped.

---

## 7. Tech stack

| Part | Choice | Why |
|---|---|---|
| Frontend | **Next.js + React** | Popular, lots of help available, works well on phones |
| Styling | **Tailwind CSS** | Fast to build clean, mobile-friendly screens |
| Database + login | **Supabase** | Free tier, handles accounts, database, and realtime updates |
| Hosting | **Vercel** | Free tier, deploys straight from GitHub |
| Drag to reorder | **dnd-kit** library | Works with touch |
| Player | **YouTube IFrame API** | Speed and loop control |
| Chord parsing | Small custom code or the **ChordSheetJS** library | Handles ChordPro and transposing |

Expected cost: **₱0/month** to start. Custom domain is optional (about ₱600–900/year).

---

## 8. Build phases

**Phase 1: Foundation (about 1–2 weeks)**
- Project setup, Supabase, deployment
- Login with invite code
- Add/edit songs with live preview
- Song page with chords, transpose, YouTube player

**Phase 2: Lineups (about 1 week)**
- Create/edit lineups, add songs, drag to reorder
- Per-song key, leader, and notes
- Home page showing the upcoming lineup
- Realtime updates

**Phase 3: Safety and search (about 1 week)**
- Song version history and restore
- Search, tags, filters
- Archive / restore deleted items
- Admin page for members and invite code

**Phase 4: Practice and service tools (about 1–2 weeks)**
- Stage mode
- Auto-scroll, font size, lyrics-only view
- Play all, loop sections
- Print/PDF export
- Duplicate lineup

**Phase 5: Extras (any time)**
- Section markers, start timestamps
- Attendance/availability ("who can serve this Sunday?")
- Notifications when a new lineup is posted
- Installable on phones like an app (PWA)

Timings assume part-time building and will vary with how much you build yourself versus with my help.

---

## 9. Things to watch out for

1. **Copyright.** Lyrics and chords are copyrighted. Keeping the site private and login-only is the safest approach. Check whether your church's CCLI license covers digital use.
2. **Transposing edge cases.** Slash chords and unusual chords are where bugs show up, so test with a variety of songs early.
3. **Two people editing at once.** Realtime updates and "last edited by" notes handle most cases. For songs, the version history is the safety net.
4. **Phone use is the priority.** Most members will open this on a phone at practice or in service, so I'd design mobile-first.
5. **YouTube videos disappearing.** Videos get removed sometimes. Keeping the Spotify link as a backup helps.
6. **Data backup.** Supabase does backups on paid plans. On the free tier, plan a simple monthly export of your songs.

---

## 10. Suggested next steps

1. Write down 5–10 songs your team knows well. These are your test data.
2. Decide the site name (e.g. "[Church name] Worship Hub").
3. Choose who the first admin will be.
4. Pick how we proceed: I can build a working **Phase 1 + 2 prototype** here for you to try and give feedback on, or I can guide you step by step through building it in your own project.

I can also put this plan into a shareable doc for your team if you'd like. Which way do you want to go for step 4?