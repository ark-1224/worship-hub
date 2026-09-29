"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export type SimpleState = { error?: string } | undefined;

// Brings an archived song or lineup back. Only admins may do this: the database
// (guard_restore in 0002) refuses anyone else, so the check here is just for a
// clear message.
async function restore(table: "songs" | "lineups", id: string): Promise<SimpleState> {
  if (!isUuid(id)) return { error: "Something went wrong. Please try again." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Only admins can restore archived items." };

  const { data, error } = await supabase
    .from(table)
    .update({ archived_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't restore it. Please try again." };

  revalidatePath("/archive");
}

export async function restoreSong(id: string, _prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  void _formData;
  return restore("songs", id);
}

export async function restoreLineup(id: string, _prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  void _formData;
  return restore("lineups", id);
}
