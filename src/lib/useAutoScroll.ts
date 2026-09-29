import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { atBottom, scrollStep } from "./display";

// Slowly scrolls the page (or a scrollable panel) so a musician can play with
// both hands. It stops by itself at the end, and as soon as the person touches,
// scrolls or types: they always win over the automatic scroll.
//
// Mark buttons that should NOT interrupt it (like its own pause button) with
// the attribute data-autoscroll-ignore.

export function useAutoScroll(pixelsPerSecond: number, panel?: RefObject<HTMLElement | null>) {
  const [running, setRunning] = useState(false);

  // The animation loop reads the latest speed from here without restarting.
  const speed = useRef(pixelsPerSecond);
  useEffect(() => {
    speed.current = pixelsPerSecond;
  }, [pixelsPerSecond]);

  useEffect(() => {
    if (!running) return;

    const el = panel?.current ?? null; // null = the whole page
    let frame = 0;
    let last = performance.now();
    let remainder = 0;

    const tick = (now: number) => {
      const step = scrollStep(remainder, speed.current, now - last);
      remainder = step.remainder;
      last = now;

      if (step.pixels > 0) {
        if (el) el.scrollTop += step.pixels;
        else window.scrollBy(0, step.pixels);
      }

      const top = el ? el.scrollTop : window.scrollY;
      const visible = el ? el.clientHeight : window.innerHeight;
      const total = el ? el.scrollHeight : document.documentElement.scrollHeight;
      if (atBottom(top, visible, total)) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const stopOnTouch = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-autoscroll-ignore]")) return;
      setRunning(false);
    };
    const events = ["wheel", "touchstart", "mousedown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, stopOnTouch, { passive: true }));

    return () => {
      cancelAnimationFrame(frame);
      events.forEach((name) => window.removeEventListener(name, stopOnTouch));
    };
  }, [running, panel]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const stop = useCallback(() => setRunning(false), []);
  return { running, toggle, stop };
}
