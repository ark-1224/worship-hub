import { randomInt } from "node:crypto";

// Small helpers for the Team page: checking the profile form and making
// invite codes.

export type ProfileInput = { name: string; voiceOrInstrument: string };
export type ProfileFieldErrors = Partial<Record<"name" | "voice", string>>;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export function parseProfileForm(
  formData: FormData,
): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileFieldErrors } {
  const errors: ProfileFieldErrors = {};

  const name = field(formData, "name").trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Enter your name.";
  else if (name.length > 100) errors.name = "Name is too long (100 characters max).";

  const voice = field(formData, "voice").trim().replace(/\s+/g, " ");
  if (voice.length > 100) errors.voice = "That's too long (100 characters max).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, voiceOrInstrument: voice } };
}

// Letters and digits people can't mix up when reading a code aloud or typing it
// from a phone screenshot: no 0/O, 1/I/L.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A new invite code like "K7MQ-2XJD-9PWH" (12 characters, about 59 bits of
 * randomness, so it can't be guessed). Uses the operating system's secure random
 * numbers. `pick` is replaceable so the test can be predictable.
 */
export function generateInviteCode(pick: (max: number) => number = (max) => randomInt(max)): string {
  const group = () => Array.from({ length: 4 }, () => CODE_ALPHABET[pick(CODE_ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/** The message an admin can copy and send to a new member. */
export function inviteMessage(siteUrl: string, code: string): string {
  return `Join our worship team site: ${siteUrl.replace(/\/$/, "")}/join\nTeam invite code: ${code}`;
}
