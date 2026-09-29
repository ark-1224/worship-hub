"use client";

import Link from "next/link";

// The bar above a printable page: a Print button (the browser's own print
// dialog, where "Save as PDF" is also offered), a way back, and option links.
// print:hidden keeps the whole bar off the paper.
export function PrintToolbar({
  backHref,
  backLabel,
  options,
}: {
  backHref: string;
  backLabel: string;
  options: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className="btn-primary">
          🖨 Print / Save as PDF
        </button>
        <Link href={backHref} className="btn-secondary">
          ← {backLabel}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="What to print">
        {options.map((o) => (
          <Link
            key={o.label}
            href={o.href}
            aria-current={o.active ? "true" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${
              o.active
                ? "border-accent-600 bg-accent-600 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-stone-500">
        The print screen has a &ldquo;Save as PDF&rdquo; option. On a phone, look for Print or Share &rarr; Print.
      </p>
    </div>
  );
}
