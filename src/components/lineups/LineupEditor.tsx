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
import { useState } from "react";
import {
  addLineupItem,
  removeLineupItem,
  reorderLineupItems,
  updateLineupItem,
} from "@/app/(app)/lineups/[id]/actions";
import { moveItem, type ItemPatch } from "@/lib/lineups";
import { AddSongDialog } from "./AddSongDialog";
import { LineupItemRow } from "./LineupItemRow";
import type { EditorItem, Member, PickerSong } from "./types";

// The editable song list of a lineup. Changes show instantly on screen and are
// saved in the background; if a save fails, the screen goes back to how it was
// and a message explains.
export function LineupEditor({
  lineupId,
  initialItems,
  songs,
  members,
}: {
  lineupId: string;
  initialItems: EditorItem[];
  songs: PickerSong[];
  members: Member[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    const result = await reorderLineupItems(lineupId, next.map((i) => i.id));
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
    const result = await updateLineupItem(id, patch);
    if (!result.ok) fail(previous, result.error);
  };

  const remove = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !window.confirm(`Remove “${item.title}” from this lineup?`)) return;
    const previous = items;
    setError(null);
    setItems(items.filter((i) => i.id !== id));
    const result = await removeLineupItem(id);
    if (!result.ok) fail(previous, result.error);
  };

  const add = async (song: PickerSong) => {
    setError(null);
    const result = await addLineupItem(lineupId, song.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: result.id,
        songId: song.id,
        title: song.title,
        artist: song.artist,
        originalKey: song.originalKey,
        keyOverride: null,
        leaderId: null,
        note: "",
      },
    ]);
  };

  return (
    <section className="space-y-3" aria-label="Songs in this lineup">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Songs ({items.length})
        </h2>
        <button type="button" onClick={() => setPickerOpen(true)} className="btn-primary">
          + Add song
        </button>
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

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
