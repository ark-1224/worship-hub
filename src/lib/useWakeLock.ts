import { useEffect, useState } from "react";

// Asks the phone to keep the screen on (the browser's "Screen Wake Lock").
// Used in stage mode, so the screen doesn't go dark in the middle of a song.
// Not every browser supports it; where it doesn't, this quietly does nothing.
// The lock is dropped when the page is hidden, so it is requested again
// whenever the page comes back.
export function useWakeLock(enabled: boolean): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false); // refused (low battery, or the tab isn't visible)
      }
    };

    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [enabled]);

  return enabled && active;
}
