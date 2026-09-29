// YouTube's IFrame Player API, loaded on demand. We describe just the small part
// of it we use, so no extra type package is needed. Shared by the single-song
// player and the lineup's "Play all".

export type YTPlayer = {
  destroy(): void;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string): void; // loads AND starts playing
};

export type YTEvent = { target: YTPlayer; data: number };

export type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: YTEvent) => void;
        onStateChange?: (e: YTEvent) => void;
        onPlaybackRateChange?: (e: YTEvent) => void;
        onError?: (e: YTEvent) => void;
      };
    },
  ) => YTPlayer;
};

/** The numbers YouTube sends in onStateChange. */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

/** Speeds we offer (YouTube also allows 0.25). */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// The script only needs to be added once per page, however many players there are.
let apiPromise: Promise<YTNamespace> | undefined;

export function loadYouTubeApi(): Promise<YTNamespace> {
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
