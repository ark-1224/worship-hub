"use client";

import { useActionState, useState } from "react";
import { saveLineup } from "@/app/(app)/lineups/actions";
import type { LineupFormValues } from "@/lib/lineups";

const SERVICE_TYPES = ["Sunday Service", "Youth Service", "Prayer Meeting", "Special Event", "Practice"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export function LineupForm({ initial }: { initial: LineupFormValues }) {
  const [state, formAction, pending] = useActionState(saveLineup, undefined);
  const [values, setValues] = useState(initial);
  const isEdit = initial.id !== null;

  const set = <K extends keyof LineupFormValues>(key: K, value: LineupFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form action={formAction} className="card space-y-4">
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div>
        <label htmlFor="title" className="label">
          Title *
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="e.g. Sunday Service, Oct 4"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className="input"
        />
        <FieldError message={state?.fieldErrors?.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="serviceDate" className="label">
            Date *
          </label>
          <input
            id="serviceDate"
            name="serviceDate"
            type="date"
            required
            value={values.serviceDate}
            onChange={(e) => set("serviceDate", e.target.value)}
            className="input"
          />
          <FieldError message={state?.fieldErrors?.date} />
        </div>
        <div>
          <label htmlFor="serviceTime" className="label">
            Time (optional)
          </label>
          <input
            id="serviceTime"
            name="serviceTime"
            type="time"
            value={values.serviceTime}
            onChange={(e) => set("serviceTime", e.target.value)}
            className="input"
          />
          <FieldError message={state?.fieldErrors?.time} />
        </div>
      </div>

      <div>
        <label htmlFor="serviceType" className="label">
          Service type (optional)
        </label>
        <input
          id="serviceType"
          name="serviceType"
          list="service-types"
          maxLength={100}
          value={values.serviceType}
          onChange={(e) => set("serviceType", e.target.value)}
          className="input"
        />
        <datalist id="service-types">
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <FieldError message={state?.fieldErrors?.type} />
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. Closing song should be slow."
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="input"
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto sm:min-w-40">
          {pending ? "Saving…" : isEdit ? "Save details" : "Create lineup"}
        </button>
      </div>
    </form>
  );
}
