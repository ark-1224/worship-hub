"use server";

import { redirect } from "next/navigation";
import { parseLineupForm, type LineupFieldErrors } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/server";

export type SaveLineupState = { error?: string; fieldErrors?: LineupFieldErrors } | undefined;

// Creates or updates a lineup's details (title, date, time, type, notes).
// The songs in the lineup are edited separately. Members can do this because of
// the RLS policies in 0002; created_by / updated_by are stamped by the database.
export async function saveLineup(_prev: SaveLineupState, formData: FormData): Promise<SaveLineupState> {
  const parsed = parseLineupForm(formData);
  if (!parsed.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.errors };
  }
  const lineup = parsed.value;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const columns = {
    title: lineup.title,
    service_date: lineup.serviceDate,
    service_time: lineup.serviceTime,
    service_type: lineup.serviceType || null,
    notes: lineup.notes || null,
  };

  let lineupId = lineup.id;
  if (lineupId) {
    const { data, error } = await supabase
      .from("lineups")
      .update(columns)
      .eq("id", lineupId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "Couldn't save the lineup. Please try again." };
  } else {
    const { data, error } = await supabase.from("lineups").insert(columns).select("id").single();
    if (error || !data) return { error: "Couldn't create the lineup. Please try again." };
    lineupId = data.id;
  }

  redirect(`/lineups/${lineupId}`);
}
