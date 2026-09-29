"use client";

import { useState } from "react";

// Copies text to the clipboard and briefly says so. If the browser blocks
// clipboard access (some in-app browsers do), it tells you to copy by hand.
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button type="button" onClick={copy} className="btn-secondary min-h-10 px-3 py-1 text-sm">
      <span aria-live="polite">
        {state === "copied" ? "Copied ✓" : state === "failed" ? "Couldn't copy: select it by hand" : label}
      </span>
    </button>
  );
}
