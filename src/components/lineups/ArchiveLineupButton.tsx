"use client";

import { useActionState } from "react";
import { archiveLineup } from "@/app/(app)/lineups/[id]/actions";

// "Archive" hides a lineup from the lists. Nothing is deleted, and an admin can
// bring it back.
export function ArchiveLineupButton({ lineupId, title }: { lineupId: string; title: string }) {
  const [state, formAction, pending] = useActionState(archiveLineup.bind(null, lineupId), undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Archive “${title}”? It will disappear from the lists. Only an admin can bring it back.`)) {
          e.preventDefault();
        }
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
        className="btn w-full border border-red-300 bg-white text-red-700 hover:bg-red-50 sm:w-auto"
      >
        {pending ? "Archiving…" : "Archive this lineup"}
      </button>
    </form>
  );
}
