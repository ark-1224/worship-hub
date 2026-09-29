"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/(app)/team/actions";

export function ProfileForm({ name, voice }: { name: string; voice: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [values, setValues] = useState({ name, voice });

  return (
    <form action={formAction} className="card space-y-4">
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="form-notice">
          Saved.
        </p>
      )}

      <div>
        <label htmlFor="name" className="label">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="input"
        />
        {state?.fieldErrors?.name && <p className="mt-1 text-sm text-red-700">{state.fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="voice" className="label">
          Voice part or instrument
        </label>
        <input
          id="voice"
          name="voice"
          maxLength={100}
          placeholder="e.g. Alto, Guitar, Keys"
          value={values.voice}
          onChange={(e) => setValues((v) => ({ ...v, voice: e.target.value }))}
          className="input"
        />
        {state?.fieldErrors?.voice && <p className="mt-1 text-sm text-red-700">{state.fieldErrors.voice}</p>}
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
