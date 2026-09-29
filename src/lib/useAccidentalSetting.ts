import type { AccidentalSetting } from "./chords/transpose";
import { useLocalSetting } from "./useLocalSetting";

// The sharps/flats choice, remembered on this device so a member who prefers
// flats doesn't have to pick it again on every song.
const OPTIONS = ["auto", "sharps", "flats"] as const;

export function useAccidentalSetting(): [AccidentalSetting, (value: AccidentalSetting) => void] {
  // Same storage key as before, so anyone's saved choice carries over.
  return useLocalSetting<AccidentalSetting>("worship-hub:accidentals", "auto", OPTIONS);
}
