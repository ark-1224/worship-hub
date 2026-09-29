import { useCallback, useSyncExternalStore } from "react";

// Settings remembered on this device (the browser's localStorage): the
// sharps/flats choice, font size, whether chords show, scroll speed.
// useSyncExternalStore lets React read them safely: the server render and the
// first browser render both use the fallback, then it switches to the saved value.

const CHANGE_EVENT = "worship-hub:setting-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // changed in another tab
  window.addEventListener(CHANGE_EVENT, onChange); // changed in this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.): not remembered, but the page below still updates.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A setting that is one of a fixed list of words, e.g. "on" | "off". */
export function useLocalSetting<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = read(key);
      return (allowed as readonly string[]).includes(stored ?? "") ? (stored as T) : fallback;
    },
    () => fallback,
  );
  const set = useCallback((next: T) => save(key, next), [key]);
  return [value, set];
}

/** A whole-number setting kept between `min` and `max`. */
export function useLocalNumber(
  key: string,
  fallback: number,
  min: number,
  max: number,
): [number, (value: number) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const stored = Number.parseInt(read(key) ?? "", 10);
      return Number.isInteger(stored) && stored >= min && stored <= max ? stored : fallback;
    },
    () => fallback,
  );
  const set = useCallback(
    (next: number) => save(key, String(Math.min(max, Math.max(min, Math.round(next))))),
    [key, min, max],
  );
  return [value, set];
}
