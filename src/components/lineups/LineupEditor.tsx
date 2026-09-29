"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addLineupItem,
  removeLineupItem,
  reorderLineupItems,
  updateLineupItem,
} from "@/app/(app)/lineups/[id]/actions";
import { moveItem, type ItemPatch } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/client";
import { AddSongDialog } from "./AddSongDialog";
import { LineupItemRow } from "./LineupItemRow";
import { PlayAll } from "./PlayAll";
import type { EditorItem, Member, PickerSong } from "./types";

// The editable song list of a lineup.
//
//  * Your changes show instantly and are saved in the background; if a save
//    fails, the list goes back to how it was and a message explains.
//  * Other people's changes arrive live (Supabase Realtime): when the lineup is
//    changed, we ask the server for the fresh list and show it.
export function LineupEditor({
  lineupId,
  initialItems,
  songs,
  members,
}: {
  lineupId: string;
  initialItems: EditorItem[]; // the server's current list; new data arrives after router.refresh()
  songs: PickerSong[];
  members: Member[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [seenFromServer, setSeenFromServer] = useState(initialItems);
  const [saving, setSaving] = useState(0); // how many of MY saves are in flight
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // New list from the server? Show it, unless I'm in the middle of saving
  // something (its own refresh, below, catches up afterwards). Setting state
  // during render like this is React's recommended way to react to a changed prop.
  if (initialItems !== seenFromServer) {
    setSeenFromServer(initialItems);
    if (saving === 0) setItems(initialItems);
  }

  // Ask the server for fresh data. Debounced: reordering touches several rows,
  // and each one sends its own "changed" message.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  // Listen for changes to this lineup. Every change to its songs also updates
  // the lineup row itself (a trigger in 0004_lineups.sql), so watching that one
  // row is enough. The database only sends these to logged-in members (RLS).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lineup:${lineupId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lineups", filter: `id=eq.${lineupId}` },
        requestRefresh,
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // A phone that slept may have missed messages: catch up when it wakes.
    const onVisible = () => document.visibilityState === "visible" && requestRefresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [lineupId, requestRefresh]);

  // Wraps each of my saves: while one is in flight, incoming server data is
  // held back so it can't undo what I just did; afterwards, sync with the server.
  const track = async <T,>(work: () => Promise<T>): Promise<T> => {
    setSaving((n) => n + 1);
    try {
      return await work();
    } finally {
      setSaving((n) => n - 1);
      requestRefresh();
    }
  };

  // Drag with a mouse or finger (5px before it counts, so taps still work) or
  // with the keyboard (Space to pick up, arrows to move, Space to drop).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Puts back the previous list and shows why.
  const fail = (previous: EditorItem[], message: string) => {
    setItems(previous);
    setError(message);
  };

  const reorder = async (next: EditorItem[]) => {
    if (next === items) return;
    const previous = items;
    setError(null);
    setItems(next);
    const result = await track(() => reorderLineupItems(lineupId, next.map((i) => i.id)));
    if (!result.ok) fail(previous, result.error);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    void reorder(moveItem(items, from, to));
  };

  const change = async (id: string, patch: ItemPatch) => {
    const previous = items;
    setError(null);
    setItems(
      items.map((i) =>
        i.id !== id
          ? i
          : {
              ...i,
              ...("keyOverride" in patch && { keyOverride: patch.keyOverride || null }),
              ...("leaderId" in patch && { leaderId: patch.leaderId || null }),
              ...("note" in patch && { note: (patch.note ?? "").trim() }),
            },
      ),
    );
    const result = await track(() => updateLineupItem(id, patch));
    if (!result.ok) fail(previous, result.error);
  };

  const remove = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !window.confirm(`Remove “${item.title}” from this lineup?`)) return;
    const previous = items;
    setError(null);
    setItems(items.filter((i) => i.id !== id));
    const result = await track(() => removeLineupItem(id));
    if (!result.ok) fail(previous, result.error);
  };

  const add = async (song: PickerSong) => {
    setError(null);
    const result = await track(() => addLineupItem(lineupId, song.id));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // If a live update already brought this song in, don't add it twice.
    setItems((current) =>
      current.some((i) => i.id === result.id)
        ? current
        : [
            ...current,
            {
              id: result.id,
              songId: song.id,
              title: song.title,
              artist: song.artist,
              originalKey: song.originalKey,
              youtubeVideoId: song.youtubeVideoId,
              keyOverride: null,
              leaderId: null,
              note: "",
            },
          ],
    );
  };

  return (
    <section className="space-y-3" aria-label="Songs in this lineup">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Songs ({items.length})</h2>
          <p
            className={`text-xs ${live ? "text-emerald-700" : "text-stone-400"}`}
            title={live ? "Changes by others appear here automatically" : "Trying to connect for live updates"}
          >
            {live ? "● Live" : "○ Connecting…"}
          </p>
        </div>
        <button type="button" onClick={() => setPickerOpen(true)} className="btn-primary">
          + Add song
        </button>
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {/* Plays the videos in the order shown below, including any reordering you do. */}
      <PlayAll items={items.map((i) => ({ id: i.id, title: i.title, videoId: i.youtubeVideoId }))} />

      {items.length === 0 ? (
        <p className="card text-stone-600">No songs yet. Tap “Add song” to build the lineup.</p>
      ) : (
        // A fixed id: without it dnd-kit numbers its accessibility labels differently
        // on the server and in the browser, which React reports as a hydration mismatch.
        <DndContext id="lineup-songs" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              {items.map((item, index) => (
                <LineupItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  count={items.length}
                  members={members}
                  onChange={change}
                  onRemove={remove}
                  onMove={(from, to) => void reorder(moveItem(items, from, to))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AddSongDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        songs={songs}
        inLineup={new Set(items.map((i) => i.songId))}
        onAdd={add}
      />
    </section>
  );
}
