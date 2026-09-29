"use client";

// The 0.5x to 2x playback speed buttons, shared by the song player and "Play all".
export function SpeedButtons({
  speeds,
  rate,
  disabled,
  onChange,
}: {
  speeds: number[];
  rate: number;
  disabled: boolean;
  onChange: (rate: number) => void;
}) {
  return (
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
            disabled={disabled}
            onClick={() => onChange(s)}
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
  );
}
