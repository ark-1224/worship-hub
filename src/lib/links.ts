// Parsing for the YouTube and Spotify links members paste into the song form.
// Shared by the form (instant feedback) and the server action (the real check).

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Result of parsing an optional field: an empty input is valid ("no link").
export type LinkResult<T> = { ok: true; value: T } | { ok: false; error: string };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

// Path styles where the video ID is the segment right after the prefix,
// e.g. youtube.com/embed/ID, /shorts/ID, /live/ID, /v/ID
const YOUTUBE_ID_PREFIXES = new Set(["embed", "shorts", "live", "v"]);

/**
 * Extracts the 11-character video ID from any common YouTube link:
 *   https://www.youtube.com/watch?v=ID   (also with &t=..., &list=...)
 *   https://m.youtube.com/watch?v=ID     (mobile)
 *   https://youtu.be/ID?si=...           (short / share links)
 *   https://www.youtube.com/embed/ID, /shorts/ID, /live/ID
 * A bare 11-character ID is accepted too. Empty input means "no video".
 * We store only the ID, never the URL.
 */
export function parseYouTubeInput(input: string): LinkResult<string | null> {
  const raw = input.trim();
  if (!raw) return { ok: true, value: null };

  if (YOUTUBE_ID.test(raw)) return { ok: true, value: raw };

  const invalid: LinkResult<string | null> = {
    ok: false,
    error: "That doesn't look like a YouTube link. Paste the video's link (e.g. https://youtu.be/…).",
  };

  let url: URL;
  try {
    // Allow pasting "youtube.com/watch?v=…" without the https://
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return invalid;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return invalid;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let candidate: string | undefined;

  if (host === "youtu.be" || host === "www.youtu.be") {
    candidate = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch") candidate = url.searchParams.get("v") ?? undefined;
    else if (YOUTUBE_ID_PREFIXES.has(segments[0])) candidate = segments[1];
  }

  return candidate && YOUTUBE_ID.test(candidate) ? { ok: true, value: candidate } : invalid;
}

/** A normal watch link rebuilt from a stored ID (used to refill the edit form). */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Spotify links are only shown as an "Open in Spotify" button, so we just make
 * sure they point at Spotify over https (this also stops "javascript:" links).
 */
export function parseSpotifyInput(input: string): LinkResult<string | null> {
  const raw = input.trim();
  if (!raw) return { ok: true, value: null };

  const invalid: LinkResult<string | null> = {
    ok: false,
    error: "That doesn't look like a Spotify link (open.spotify.com/…).",
  };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return invalid;
  }

  const host = url.hostname.toLowerCase();
  const isSpotify = host === "open.spotify.com" || host === "spotify.link";
  if (url.protocol !== "https:" || !isSpotify) return invalid;
  return { ok: true, value: url.toString() };
}
