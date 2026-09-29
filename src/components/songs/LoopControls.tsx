"use client";

import { useEffect, useState, type RefObject } from "react";
import { EMPTY_LOOP, formatTime, isLoopReady, nudgeLoop, setLoopEnd, setLoopStart, shouldLoopBack, type Loop } from "@/lib/loop";
import type { YTPlayer } from "@/lib/youtubeApi";

// "Loop a section": play the video, tap "Set start" where the hard part begins
// and "Set end" where it ends, then switch the loop on. Handy for practising a
// bridge or a tricky transition. Not saved: it's for this sitting only.
export function LoopControls({
  player,
  ready,
}: {
  player: RefObject<YTPlayer | null>;
  ready: boolean;
}) {
  const [loop, setLoop] = useState<Loop>(EMPTY_LOOP);
  const [looping, setLooping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active = looping && isLoopReady(loop);

  // While the loop is on, check the video's position a few times a second and
  // jump back to the start once it reaches the end.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const p = player.current;
      if (p && shouldLoopBack(p.getCurrentTime(), loop)) p.seekTo(loop.start ?? 0, true);
    }, 200);
    return () => clearInterval(timer);
  }, [active, loop, player]);

  const now = () => player.current?.getCurrentTime() ?? 0;

  const markStart = () => {
    setMessage(null);
    setLoop(setLoopStart(loop, now()).loop);
  };
  const markEnd = () => {
    const result = setLoopEnd(loop, now());
    setMessage(result.error ?? null);
    setLoop(result.loop);
  };
  const nudge = (which: "start" | "end", delta: number) => {
    setMessage(null);
    setLoop(nudgeLoop(loop, which, delta).loop);
  };
  const clear = () => {
    setLoop(EMPTY_LOOP);
    setLooping(false);
    setMessage(null);
  };

  const small = "btn-secondary min-h-10 px-3 py-1 text-sm";

  return (
    <details className="rounded-lg border border-stone-200 bg-stone-50">
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
        Loop a section {active ? `(on: ${formatTime(loop.start)}–${formatTime(loop.end)})` : ""}
      </summary>
      <div className="space-y-3 border-t border-stone-200 p-3">
        <p className="text-sm text-stone-600">
          Play the video, tap <strong>Set start</strong> at the beginning of the part you want to practise and{" "}
          <strong>Set end</strong> where it finishes, then turn the loop on.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-sm">
              Start <span className="font-mono font-bold">{formatTime(loop.start)}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={markStart} disabled={!ready} className={small}>
                Set start
              </button>
              <button type="button" onClick={() => nudge("start", -1)} disabled={loop.start === null} className={small} aria-label="Start 1 second earlier">
                −1s
              </button>
              <button type="button" onClick={() => nudge("start", 1)} disabled={loop.start === null} className={small} aria-label="Start 1 second later">
                +1s
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              End <span className="font-mono font-bold">{formatTime(loop.end)}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={markEnd} disabled={!ready} className={small}>
                Set end
              </button>
              <button type="button" onClick={() => nudge("end", -1)} disabled={loop.end === null} className={small} aria-label="End 1 second earlier">
                −1s
              </button>
              <button type="button" onClick={() => nudge("end", 1)} disabled={loop.end === null} className={small} aria-label="End 1 second later">
                +1s
              </button>
            </div>
          </div>
        </div>

        {message && (
          <p role="alert" className="form-error">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={looping}
            disabled={!isLoopReady(loop)}
            onClick={() => {
              const next = !looping;
              setLooping(next);
              // Start from the beginning of the section when switching on.
              if (next && loop.start !== null) player.current?.seekTo(loop.start, true);
            }}
            className={`btn min-h-11 border ${
              active ? "border-accent-600 bg-accent-600 text-white" : "border-stone-300 bg-white text-stone-800"
            } disabled:opacity-50`}
          >
            🔁 Loop {active ? "on" : "off"}
          </button>
          <button type="button" onClick={clear} disabled={loop.start === null && loop.end === null} className={small}>
            Clear
          </button>
          {!isLoopReady(loop) && <span className="text-xs text-stone-500">Set both a start and an end to loop.</span>}
        </div>
      </div>
    </details>
  );
}
