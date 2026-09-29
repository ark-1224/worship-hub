import type { Metadata } from "next";
import {
  createInviteCode,
  removeMember,
  replaceInviteCode,
  setInviteCodeActive,
  setMemberRole,
} from "@/app/(app)/team/actions";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { CopyButton } from "@/components/team/CopyButton";
import { ProfileForm } from "@/components/team/ProfileForm";
import { formatTimestamp, appTimezone } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/server";
import { inviteMessage } from "@/lib/team";

export const metadata: Metadata = { title: "Team" };

type Member = { id: string; name: string; voice_or_instrument: string | null; role: "admin" | "member" };
type InviteCode = { id: string; code: string; active: boolean; created_at: string };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const myId = claims?.claims.sub ?? "";

  const { data: membersData } = await supabase
    .from("profiles")
    .select("id, name, voice_or_instrument, role")
    .order("name", { ascending: true });
  const members = (membersData ?? []) as Member[];
  const me = members.find((m) => m.id === myId);
  const isAdmin = me?.role === "admin";
  const adminCount = members.filter((m) => m.role === "admin").length;

  // Invite codes: the database only returns them to admins (RLS), so members
  // simply get an empty list. We don't even ask unless you are one.
  const { data: codesData } = isAdmin
    ? await supabase
        .from("invite_codes")
        .select("id, code, active, created_at")
        .order("created_at", { ascending: false })
    : { data: [] };
  const codes = (codesData ?? []) as InviteCode[];
  const activeCodes = codes.filter((c) => c.active);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const tz = appTimezone();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Team</h1>

      <section className="space-y-3" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Your profile
        </h2>
        <ProfileForm name={me?.name ?? ""} voice={me?.voice_or_instrument ?? ""} />
      </section>

      <section className="space-y-3" aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Members ({members.length})
        </h2>
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {members.map((m) => {
            const isMe = m.id === myId;
            return (
              <li key={m.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {m.name}
                      {isMe && <span className="ml-2 text-sm font-normal text-stone-500">(you)</span>}
                    </p>
                    {m.voice_or_instrument && (
                      <p className="truncate text-sm text-stone-600">{m.voice_or_instrument}</p>
                    )}
                  </div>
                  {m.role === "admin" && (
                    <span className="shrink-0 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
                      Admin
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    {m.role === "member" ? (
                      <ConfirmActionButton
                        compact
                        variant="secondary"
                        action={setMemberRole.bind(null, m.id, "admin")}
                        label="Make admin"
                        pendingLabel="Saving…"
                        confirmMessage={`Make ${m.name} an admin? Admins can manage members and invite codes.`}
                      />
                    ) : (
                      // The database also refuses to demote the last admin; hiding the button just saves a click.
                      (adminCount > 1 || !isMe) && (
                        <ConfirmActionButton
                          compact
                          variant="secondary"
                          action={setMemberRole.bind(null, m.id, "member")}
                          label="Remove admin"
                          pendingLabel="Saving…"
                          confirmMessage={`Remove admin rights from ${m.name}?`}
                        />
                      )
                    )}
                    {!isMe && (
                      <ConfirmActionButton
                        compact
                        variant="danger"
                        action={removeMember.bind(null, m.id)}
                        label="Remove from team"
                        pendingLabel="Removing…"
                        confirmMessage={`Remove ${m.name} from the team? Their login is deleted and they can no longer sign in. The songs and lineups they made stay.`}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin && (
        <section className="space-y-3" aria-labelledby="invites-heading">
          <h2 id="invites-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
            Invite codes
          </h2>
          <p className="text-sm text-stone-600">
            New members sign up at <span className="font-medium">{siteUrl ? `${siteUrl.replace(/\/$/, "")}/join` : "/join"}</span>{" "}
            with an active code. Turning a code off doesn&apos;t affect people who already joined.
          </p>

          {activeCodes.length === 0 && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              There is no active code, so nobody can join right now.
            </p>
          )}

          <ul className="space-y-2">
            {codes.map((c) => (
              <li key={c.id} className="card space-y-2 p-3!">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-mono text-lg font-bold tracking-wider">{c.code}</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        c.active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {c.active ? "Active" : "Off"}
                    </span>
                  </p>
                  <p className="text-xs text-stone-400">Created {formatTimestamp(c.created_at, tz)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.active && <CopyButton text={inviteMessage(siteUrl, c.code)} label="Copy invite message" />}
                  <ConfirmActionButton
                    compact
                    variant="secondary"
                    action={setInviteCodeActive.bind(null, c.id, !c.active)}
                    label={c.active ? "Turn off" : "Turn on"}
                    pendingLabel="Saving…"
                    confirmMessage={c.active ? `Turn off code ${c.code}? Nobody can join with it until you turn it back on.` : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <ConfirmActionButton
              variant="secondary"
              action={createInviteCode}
              label="Add another code"
              pendingLabel="Creating…"
            />
            <ConfirmActionButton
              variant="danger"
              action={replaceInviteCode}
              label="Replace with a new code"
              pendingLabel="Replacing…"
              confirmMessage="Create a new code and turn OFF all the others? Anyone holding an old code will no longer be able to join."
            />
          </div>
        </section>
      )}
    </div>
  );
}
