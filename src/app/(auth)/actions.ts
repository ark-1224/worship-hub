"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// State shape shared by all the auth forms (used with useActionState).
export type AuthState = { error?: string; notice?: string } | undefined;

const INVALID_CODE_MESSAGE =
  "That invite code isn't valid. Ask your worship leader for the current code.";

function text(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };

  redirect("/");
}

export async function join(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  const inviteCode = text(formData, "inviteCode");

  if (!name) return { error: "Enter your name." };
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!inviteCode) return { error: "Enter the team invite code." };

  const supabase = await createClient();

  // Friendly pre-check so a wrong code gets a clear message. The real gate is
  // the database trigger in 0002_auth_and_rls.sql, which also rejects the
  // sign-up if this check were ever skipped.
  const { data: codeOk, error: codeError } = await supabase.rpc("check_invite_code", {
    p_code: inviteCode,
  });
  if (codeError) return { error: "Couldn't check the invite code. Please try again." };
  if (!codeOk) return { error: INVALID_CODE_MESSAGE };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the database trigger, which validates the code again and
      // creates the member's profile.
      data: { name, invite_code: inviteCode },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    // The trigger's rejection surfaces as a generic database error.
    if (/database error|invite/i.test(error.message)) return { error: INVALID_CODE_MESSAGE };
    if (/already registered/i.test(error.message)) {
      return { error: "That email already has an account. Try logging in instead." };
    }
    return { error: error.message };
  }

  // A session exists right away unless "Confirm email" is turned on in Supabase.
  if (data.session) redirect("/");
  return { notice: "Almost there! Check your email and tap the link to confirm your account." };
}

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });

  // Same answer whether or not the email exists, so nobody can probe who is a member.
  return { notice: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Couldn't update your password. The link may have expired; request a new one." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
