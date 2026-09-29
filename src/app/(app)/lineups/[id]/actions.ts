"use server";

import { redirect } from "next/navigation";
import { parseItemPatch, type ItemPatch } from "@/lib/lineups";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

// Edits to the songs inside one lineup. Each returns { ok } so the screen can
// show a message if something went wrong. Permissions are enforced by the
// database (RLS in 0002), not here; these checks just give clear errors.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = { ok: false, error: "Something went wrong. Please try again." } as const;

async function memberClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return supabase;
}

/** Adds a song at the end of the lineup. Returns the new item's id. */
export async function addLineupItem(lineupId: string, songId: string): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(lineupId) || !isUuid(songId)) return FAILED;
  const supabase = await memberClient();

  // The database picks the next position, so two people adding at once can't collide.
  const { data, error } = await supabase.rpc("add_lineup_item", {
    p_lineup_id: lineupId,
    p_song_id: songId,
  });
  if (error || !data) return { ok: false, error: "Couldn't add that song. Please try again." };
  return { ok: true, id: data as string };
}

export async function removeLineupItem(itemId: string): Promise<ActionResult> {
  if (!isUuid(itemId)) return FAILED;
  const supabase = await memberClient();

  const { error } = await supabase.from("lineup_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: "Couldn't remove that song. Please try again." };
  return { ok: true };
}

/** Changes the key for this service, the leader, or the note. Send only what changed. */
export async function updateLineupItem(itemId: string, patch: ItemPatch): Promise<ActionResult> {
  if (!isUuid(itemId)) return FAILED;
  const parsed = parseItemPatch(patch);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (Object.keys(parsed.columns).length === 0) return { ok: true };

  const supabase = await memberClient();
  const { error } = await supabase.from("lineup_items").update(parsed.columns).eq("id", itemId);
  if (error) return { ok: false, error: "Couldn't save that change. Please try again." };
  return { ok: true };
}

/** Saves a new order. `itemIds` lists every item in its new order. */
export async function reorderLineupItems(lineupId: string, itemIds: string[]): Promise<ActionResult> {
  if (!isUuid(lineupId) || !Array.isArray(itemIds) || itemIds.length > 200 || !itemIds.every(isUuid)) {
    return FAILED;
  }
  const supabase = await memberClient();

  const { error } = await supabase.rpc("reorder_lineup_items", {
    p_lineup_id: lineupId,
    p_item_ids: itemIds,
  });
  if (error) return { ok: false, error: "Couldn't save the new order. Please try again." };
  return { ok: true };
}
