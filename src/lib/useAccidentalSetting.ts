import { useCallback, useSyncExternalStore } from "react";
import type { AccidentalSetting } from "./chords/transpose";

// The sharps/flats choice is remembered on this device (browser localStorage),
// so a member who prefers flats doesn't have to pick it again on every song.
// useSyncExternalStore lets React read it safely: the server render and the
// first browser render both show "auto", then it switches to the saved value.

const STORAGE_KEY = "worship-hub:accidentals";
const CHANGE_EVENT = "worship-hub:accidentals-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // changed in another tab
  window.addEventListener(CHANGE_EVENT, onChange); // changed in this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(): AccidentalSetting {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "sharps" || value === "flats" ? value : "auto";
  } catch {
    return "auto"; // storage blocked (private mode etc.)
  }
}

export function useAccidentalSetting(): [AccidentalSetting, (value: AccidentalSetting) => void] {
  const setting = useSyncExternalStore(subscribe, read, () => "auto" as const);

  const update = useCallback((value: AccidentalSetting) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Not saved, but the event below still updates this page.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [setting, update];
}
