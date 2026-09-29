"use client";

import { useEffect, useRef, useState } from "react";
import { SpeedButtons } from "@/components/songs/SpeedButtons";
import { countPlayable, firstPlayable, nextPlayable, resolveIndex, type QueueItem } from "@/lib/playlist";
import { PLAYBACK_SPEEDS, YT_STATE, loadYouTubeApi, type YTPlayer } from "@/lib/youtubeApi";

// "Play all": plays each song's video in the lineup's order. When one video
// ends, the next song's video loads by itself. Songs without a video are
// skipped. The video player only loads once you open this panel.

export function PlayAll({ items }: { items: QueueItem[] }) {
  const [open, setOpen] = useState(false);
  const playable = countPlayable(items);
  if (playable === 0) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-secondary w-full sm:w-auto"
      >
        {open ? "✕ Close player" : "▶ Play all videos"}
        <span className="text-sm font-normal text-stone-500">
          ({playable} of {items.length} {items.length === 1 ? "song has" : "songs have"} a video)
        </span>
      </button>
      {open && <PlayAllPanel items={items} />}
    </div>
  );
}

function PlayAllPanel({ items }: { items: QueueItem[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [lastIndex, setLastIndex] = useState(0); // position of the song last started

  // The player's callbacks outlive a single render, so they read the latest
  // list, position and speed from here instead of from stale copies.
  const itemsRef = useRef(items);
  const currentIdRef = useRef<string | null>(null);
  const lastIndexRef = useRef(0);
  const rateRef = useRef(1);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    itemsRef.current = items;
    currentIdRef.current = currentId;
    lastIndexRef.current = lastIndex;
    rateRef.current = rate;
  }, [items, currentId, lastIndex, rate]);

  // Starts the song at `index` (loadVideoById also starts playback).
  const play = (index: number) => {
    const item = itemsRef.current[index];
    const player = playerRef.current;
    if (!item?.videoId || !player) return;
    clearTimeout(skipTimer.current);
    setMessage(null);
    setFinished(false);
    setCurrentId(item.id);
    setLastIndex(index);
    // Also update the refs right away: the player may report "ended" or an
    // error before React has re-rendered.
    currentIdRef.current = item.id;
    lastIndexRef.current = index;
    player.loadVideoById(item.videoId);
  };

  // Moves on from wherever we are, or finishes at the end of the lineup.
  const advance = () => {
    const here = resolveIndex(itemsRef.current, currentIdRef.current, lastIndexRef.current);
    const next = nextPlayable(itemsRef.current, here, 1);
    if (next === null) {
      setFinished(true);
      setCurrentId(null);
    } else {
      play(next);
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YTPlayer | undefined;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const first = firstPlayable(itemsRef.current);
        if (first === null) return;
        const target = document.createElement("div");
        host.replaceChildren(target);

        player = new YT.Player(target, {
          videoId: itemsRef.current[first].videoId!, // shown paused until you press play
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => setStatus("ready"),
            onStateChange: (e) => {
              if (e.data === YT_STATE.ENDED) advance();
              // A new video can start at normal speed: apply the chosen speed again.
              if (e.data === YT_STATE.PLAYING) e.target.setPlaybackRate(rateRef.current);
            },
            onError: () => {
              // Removed, private, or embedding disabled: say so and carry on to the next song.
              const item = itemsRef.current.find((i) => i.id === currentIdRef.current);
              setMessage(`Skipped “${item?.title ?? "a song"}”: its video can't be played here.`);
              skipTimer.current = setTimeout(advance, 1500);
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      clearTimeout(skipTimer.current);
      playerRef.current = null;
      player?.destroy();
      host.replaceChildren();
    };
    // Runs once: `advance` and `play` read everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeSpeed = (next: number) => {
    playerRef.current?.setPlaybackRate(next);
    setRate(next);
  };

  const here = resolveIndex(items, currentId, lastIndex);
  const now = currentId !== null ? items.find((i) => i.id === currentId) : undefined;
  const previous = currentId !== null ? nextPlayable(items, here, -1) : null;
  const next = currentId !== null ? nextPlayable(items, here, 1) : null;
  const first = firstPlayable(items);

  return (
    <section aria-label="Play all videos" className="card space-y-3 p-3! sm:p-4!">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full">
        <div ref={hostRef} className="h-full w-full" />
      </div>

      {status === "error" && (
        <p role="alert" className="form-error">
          The video player couldn&apos;t load. Check your connection and try again.
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {now ? (
          <>
            <button
              type="button"
              onClick={() => previous !== null && play(previous)}
              disabled={previous === null}
              className="btn-secondary min-h-11"
              aria-label="Previous song"
            >
              ◀ Prev
            </button>
            <p className="min-w-0 flex-1 text-center" aria-live="polite">
              <span className="block text-xs text-stone-500">
                Now playing {here + 1} of {items.length}
              </span>
              <span className="block truncate font-semibold">{now.title}</span>
            </p>
            <button
              type="button"
              onClick={() => next !== null && play(next)}
              disabled={next === null}
              className="btn-secondary min-h-11"
              aria-label="Next song"
            >
              Next ▶
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => first !== null && play(first)}
            disabled={status !== "ready" || first === null}
            className="btn-primary w-full sm:w-auto"
          >
            {finished ? "▶ Play again from the start" : "▶ Play from the start"}
          </button>
        )}
      </div>
      {finished && <p className="text-sm text-stone-600">That was the last song in the lineup.</p>}

      <SpeedButtons speeds={PLAYBACK_SPEEDS} rate={rate} disabled={status !== "ready"} onChange={changeSpeed} />

      <ol className="divide-y divide-stone-100 rounded-lg border border-stone-200">
        {items.map((item, i) => {
          const isNow = item.id === currentId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => play(i)}
                disabled={!item.videoId || status !== "ready"}
                aria-current={isNow ? "true" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left disabled:opacity-50 ${
                  isNow ? "bg-accent-50 font-semibold text-accent-700" : "hover:bg-stone-50"
                }`}
              >
                <span className="w-5 shrink-0 text-center text-sm text-stone-400">{isNow ? "▶" : i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {!item.videoId && <span className="shrink-0 text-xs text-stone-500">no video</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
