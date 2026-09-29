"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/lineups";

// "Last edited by Maria · 2 min ago". The wording refreshes every 30 seconds.
export function LastEdited({ name, updatedAt }: { name: string | null; updatedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm text-stone-500">
      Last edited{name ? ` by ${name}` : ""} ·{" "}
      {/* The server and the browser can disagree by a few seconds; that's expected. */}
      <span suppressHydrationWarning>{timeAgo(updatedAt, now)}</span>
    </p>
  );
}
