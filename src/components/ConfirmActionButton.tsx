"use client";

import { useActionState } from "react";

type State = { error?: string } | undefined;

// A button that asks "are you sure?" and then runs a server action, showing any
// error underneath. Used for "Archive this song" and "Restore this version".
export function ConfirmActionButton({
  action,
  label,
  pendingLabel,
  confirmMessage,
  variant = "primary",
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  label: string;
  pendingLabel: string;
  confirmMessage: string;
  variant?: "primary" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="space-y-2"
    >
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "danger"
            ? "btn w-full border border-red-300 bg-white text-red-700 hover:bg-red-50 sm:w-auto"
            : "btn-primary w-full sm:w-auto"
        }
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
