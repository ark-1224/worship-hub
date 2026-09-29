"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPassword,
  join,
  login,
  resetPassword,
  type AuthState,
} from "@/app/(auth)/actions";

// All four auth forms share the same pattern: a server action returns
// { error } or { notice }, and useActionState re-renders the form with it.

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

function Messages({ state }: { state: AuthState }) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p role="status" className="form-notice">
          {state.notice}
        </p>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="input"
      />
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function useAuthForm(action: Action) {
  return useActionState(action, undefined);
}

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useAuthForm(login);
  return (
    <form action={formAction} className="space-y-4">
      {notice && <p className="form-error">{notice}</p>}
      <Messages state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Logging in…" : "Log in"}
      </button>
      <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between">
        <Link href="/forgot-password" className="text-accent-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/join" className="text-accent-700 hover:underline">
          New here? Join with an invite code
        </Link>
      </div>
    </form>
  );
}

export function JoinForm() {
  const [state, formAction, pending] = useAuthForm(join);
  return (
    <form action={formAction} className="space-y-4">
      <Messages state={state} />
      <Field label="Your name" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Field
        label="Team invite code"
        name="inviteCode"
        hint="Ask your worship leader. You can't join without it."
      />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating account…" : "Join the team"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent-700 hover:underline">
          Already have an account? Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useAuthForm(forgotPassword);
  return (
    <form action={formAction} className="space-y-4">
      <Messages state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useAuthForm(resetPassword);
  return (
    <form action={formAction} className="space-y-4">
      <Messages state={state} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
