"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useState } from "react";
import { keyChoices, type ItemPatch } from "@/lib/lineups";
import type { EditorItem, Member } from "./types";

// One song in the lineup: drag handle, number, title, then the key for this
// service, who leads, and a note. Also up/down buttons for people who prefer
// tapping to dragging.
export function LineupItemRow({
  item,
  index,
  count,
  members,
  onChange,
  onRemove,
  onMove,
}: {
  item: EditorItem;
  index: number;
  count: number;
  members: Member[];
  onChange: (id: string, patch: ItemPatch) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [note, setNote] = useState(item.note);

  const keys = keyChoices(item.originalKey);
  // Keep a saved key selectable even if it isn't in the usual list.
  if (item.keyOverride && !keys.includes(item.keyOverride)) keys.push(item.keyOverride);

  const songHref = `/songs/${item.songId}${item.keyOverride ? `?key=${encodeURIComponent(item.keyOverride)}` : ""}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-2 bg-white p-3 ${isDragging ? "relative z-10 rounded-xl shadow-lg ring-2 ring-accent-600/40" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        {/* touch-none: the handle must not scroll the page while you drag it. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${item.title}`}
          className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-xl text-stone-400 hover:bg-stone-100 active:cursor-grabbing"
        >
          ⠿
        </button>
        <span className="w-5 shrink-0 text-center font-bold text-stone-400">{index + 1}</span>
        <Link href={songHref} className="min-w-0 flex-1 hover:underline">
          <span className="block font-semibold leading-tight break-words">{item.title}</span>
          {item.artist && <span className="block truncate text-sm text-stone-600">{item.artist}</span>}
        </Link>
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${item.title} up`}
          className="h-11 w-9 shrink-0 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === count - 1}
          aria-label={`Move ${item.title} down`}
          className="h-11 w-9 shrink-0 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        >
          ▼
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.title} from this lineup`}
          className="h-11 w-9 shrink-0 rounded-lg text-xl text-red-700 hover:bg-red-50"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pl-0 sm:pl-[3.6rem]">
        <div>
          <label htmlFor={`key-${item.id}`} className="mb-0.5 block text-xs font-medium text-stone-500">
            Key for this service
          </label>
          <select
            id={`key-${item.id}`}
            value={item.keyOverride ?? ""}
            onChange={(e) => onChange(item.id, { keyOverride: e.target.value || null })}
            className="input min-h-10 py-1"
          >
            <option value="">Original{item.originalKey ? ` (${item.originalKey})` : ""}</option>
            {keys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`leader-${item.id}`} className="mb-0.5 block text-xs font-medium text-stone-500">
            Leads
          </label>
          <select
            id={`leader-${item.id}`}
            value={item.leaderId ?? ""}
            onChange={(e) => onChange(item.id, { leaderId: e.target.value || null })}
            className="input min-h-10 py-1"
          >
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor={`note-${item.id}`} className="mb-0.5 block text-xs font-medium text-stone-500">
            Note
          </label>
          <input
            id={`note-${item.id}`}
            value={note}
            maxLength={500}
            placeholder="e.g. Slow, end on the chorus"
            onChange={(e) => setNote(e.target.value)}
            // Saved when you leave the field, not on every keystroke.
            onBlur={() => note.trim() !== item.note && onChange(item.id, { note })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="input min-h-10 py-1"
          />
        </div>
      </div>
    </li>
  );
}
