"use client";

import { useActionState } from "react";

type State = { error?: string } | undefined;

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn border border-red-300 bg-white text-red-700 hover:bg-red-50",
} as const;

// A button that (optionally) asks "are you sure?" and then runs a server action,
// showing any error underneath. Used for "Archive this song", "Restore this
// version", "Remove member", and so on.
export function ConfirmActionButton({
  action,
  label,
  pendingLabel,
  confirmMessage,
  variant = "primary",
  compact = false,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  label: string;
  pendingLabel: string;
  /** Leave out to run straight away without asking. */
  confirmMessage?: string;
  variant?: keyof typeof VARIANTS;
  /** A smaller button for use inside lists. */
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="space-y-1"
    >
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`${VARIANTS[variant]} ${compact ? "min-h-10 px-3 py-1 text-sm" : "w-full sm:w-auto"}`}
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
