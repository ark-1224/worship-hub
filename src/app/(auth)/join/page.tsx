import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { JoinForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Join the team" };

export default function JoinPage() {
  return (
    <AuthShell title="Join the team" subtitle="You'll need the invite code from your worship leader.">
      <JoinForm />
    </AuthShell>
  );
}
