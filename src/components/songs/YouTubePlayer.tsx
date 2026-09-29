"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYBACK_SPEEDS, loadYouTubeApi, type YTPlayer } from "@/lib/youtubeApi";
import { LoopControls } from "./LoopControls";
import { SpeedButtons } from "./SpeedButtons";

export function YouTubePlayer({ videoId }: { videoId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rate, setRate] = useState(1);
  const [speeds, setSpeeds] = useState(PLAYBACK_SPEEDS);

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
              setSpeeds(PLAYBACK_SPEEDS.filter((s) => available.includes(s)));
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

      <SpeedButtons speeds={speeds} rate={rate} disabled={status !== "ready"} onChange={changeSpeed} />

      <LoopControls player={playerRef} ready={status === "ready"} />

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
