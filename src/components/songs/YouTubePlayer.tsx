"use client";

import { useEffect, useRef, useState } from "react";

// YouTube's IFrame Player API, loaded on demand. We describe just the small part
// of it we use, so no extra type package is needed.
type YTPlayer = {
  destroy(): void;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
};
type YTEvent = { target: YTPlayer; data: number };
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: YTEvent) => void;
        onPlaybackRateChange?: (e: YTEvent) => void;
        onError?: (e: YTEvent) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// The script only needs to be added once per page, however many players there are.
let apiPromise: Promise<YTNamespace> | undefined;

function loadYouTubeApi(): Promise<YTNamespace> {
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);

    // YouTube calls this global function when the script has finished loading.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = undefined; // allow a retry next time
      reject(new Error("Couldn't load the YouTube player."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function YouTubePlayer({ videoId }: { videoId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rate, setRate] = useState(1);
  const [speeds, setSpeeds] = useState(SPEEDS);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YTPlayer | undefined;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        // The API REPLACES the element it is given with an iframe. Give it a
        // throwaway child so React's own <div> survives (and React strict mode's
        // mount / unmount / mount in development works).
        const target = document.createElement("div");
        host.replaceChildren(target);

        player = new YT.Player(target, {
          videoId,
          // playsinline: play inside the page on iPhones instead of forcing fullscreen
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              setStatus("ready");
              const available = e.target.getAvailablePlaybackRates();
              setSpeeds(SPEEDS.filter((s) => available.includes(s)));
            },
            // Also fires if the member changes speed in YouTube's own menu.
            onPlaybackRateChange: (e) => setRate(e.data),
            onError: () => setStatus("error"), // removed, private, or embedding disabled
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [videoId]);

  const changeSpeed = (next: number) => {
    playerRef.current?.setPlaybackRate(next);
    setRate(next);
  };

  return (
    <section aria-label="Video" className="card space-y-3 p-3! sm:p-4!">
      {/* aspect-video keeps 16:9 at any width; the [&_iframe] rules make the
          iframe the API creates fill that box. */}
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full">
        <div ref={hostRef} className="h-full w-full" />
      </div>

      {status === "error" && (
        <p role="alert" className="form-error">
          This video can&apos;t be played here (it may have been removed or set to private). Try the
          Spotify link, or open it on YouTube.
        </p>
      )}

      <div>
        <span className="label" id="speed-label">
          Playback speed
        </span>
        <div role="radiogroup" aria-labelledby="speed-label" className="flex flex-wrap gap-2">
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={rate === s}
              disabled={status !== "ready"}
              onClick={() => changeSpeed(s)}
              className={`min-h-11 min-w-14 rounded-lg border px-3 text-base font-semibold disabled:opacity-50 ${
                rate === s
                  ? "border-accent-600 bg-accent-600 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-accent-700 hover:underline"
      >
        Open on YouTube
      </a>
    </section>
  );
}
