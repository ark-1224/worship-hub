"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, parseProfileForm, type ProfileFieldErrors } from "@/lib/team";

// Everything here is protected by the database (RLS policies and triggers from
// 0002 and 0007). The checks in this file only exist to give clear messages.

export type ProfileState = { error?: string; saved?: boolean; fieldErrors?: ProfileFieldErrors } | undefined;
export type SimpleState = { error?: string } | undefined;

const FAILED = "Something went wrong. Please try again.";
const NOT_ADMIN = "Only admins can do that.";

async function member() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

async function adminMember() {
  const ctx = await member();
  const { data } = await ctx.supabase.rpc("is_admin");
  return { ...ctx, isAdmin: data === true };
}

// ---------------------------------------------------------------------------
// Your own profile
// ---------------------------------------------------------------------------

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.errors };

  const { supabase, userId } = await member();
  const { data, error } = await supabase
    .from("profiles")
    .update({ name: parsed.value.name, voice_or_instrument: parsed.value.voiceOrInstrument || null })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save your profile. Please try again." };

  revalidatePath("/team");
  return { saved: true };
}

// ---------------------------------------------------------------------------
// Members (admins)
// ---------------------------------------------------------------------------

export async function setMemberRole(
  userId: string,
  role: "admin" | "member",
  _prev: SimpleState,
  _formData: FormData,
): Promise<SimpleState> {
  void _formData;
  if (!isUuid(userId) || (role !== "admin" && role !== "member")) return { error: FAILED };
  const { supabase, isAdmin } = await adminMember();
  if (!isAdmin) return { error: NOT_ADMIN };

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    // The database refuses to demote the last admin; its message says why.
    return { error: /at least one admin/i.test(error.message) ? error.message : FAILED };
  }
  if (!data) return { error: FAILED };

  revalidatePath("/team");
}

export async function removeMember(userId: string, _prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  void _formData;
  if (!isUuid(userId)) return { error: FAILED };
  const { supabase, isAdmin } = await adminMember();
  if (!isAdmin) return { error: NOT_ADMIN };

  const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
  if (error) {
    // The function's own messages are written for people ("You can't remove yourself...").
    return { error: /remove|exist|admin/i.test(error.message) ? error.message : FAILED };
  }

  revalidatePath("/team");
}

// ---------------------------------------------------------------------------
// Invite codes (admins)
// ---------------------------------------------------------------------------

// Inserts a fresh random code. In the (very unlikely) event it collides with an
// existing one, the database's uniqueness rule rejects it and we try another.
async function insertNewCode(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ code: generateInviteCode(), active: true, created_by: userId })
      .select("id")
      .single();
    if (!error && data) return data.id as string;
    if (error?.code !== "23505") return null; // not a "duplicate" problem: give up
  }
  return null;
}

/** Adds another active code (the existing ones keep working). */
export async function createInviteCode(_prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  void _formData;
  const { supabase, userId, isAdmin } = await adminMember();
  if (!isAdmin) return { error: NOT_ADMIN };

  const id = await insertNewCode(supabase, userId);
  if (!id) return { error: "Couldn't create a code. Please try again." };
  revalidatePath("/team");
}

/** Makes a new code and switches every older one off, so only the new code works. */
export async function replaceInviteCode(_prev: SimpleState, _formData: FormData): Promise<SimpleState> {
  void _formData;
  const { supabase, userId, isAdmin } = await adminMember();
  if (!isAdmin) return { error: NOT_ADMIN };

  // The new code is created first, so there is never a moment with no valid code.
  const newId = await insertNewCode(supabase, userId);
  if (!newId) return { error: "Couldn't create a code. Please try again." };

  const { error } = await supabase.from("invite_codes").update({ active: false }).neq("id", newId);
  if (error) return { error: "The new code works, but the old ones couldn't be switched off. Try again." };
  revalidatePath("/team");
}

export async function setInviteCodeActive(
  codeId: string,
  active: boolean,
  _prev: SimpleState,
  _formData: FormData,
): Promise<SimpleState> {
  void _formData;
  if (!isUuid(codeId)) return { error: FAILED };
  const { supabase, isAdmin } = await adminMember();
  if (!isAdmin) return { error: NOT_ADMIN };

  const { data, error } = await supabase
    .from("invite_codes")
    .update({ active })
    .eq("id", codeId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: FAILED };
  revalidatePath("/team");
}
