import { describe, expect, it } from "vitest";
import { generateInviteCode, inviteMessage, parseProfileForm } from "./team";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseProfileForm", () => {
  it("accepts a name and an optional voice or instrument, tidying spaces", () => {
    expect(parseProfileForm(form({ name: "  Maria   Santos ", voice: " Alto  / guitar " }))).toEqual({
      ok: true,
      value: { name: "Maria Santos", voiceOrInstrument: "Alto / guitar" },
    });
    expect(parseProfileForm(form({ name: "Josh" }))).toEqual({
      ok: true,
      value: { name: "Josh", voiceOrInstrument: "" },
    });
  });

  it("requires a name and limits lengths", () => {
    const empty = parseProfileForm(form({ name: "   " }));
    expect(empty.ok).toBe(false);
    const long = parseProfileForm(form({ name: "x".repeat(101), voice: "y".repeat(101) }));
    expect(long.ok).toBe(false);
    if (!long.ok) expect(Object.keys(long.errors).sort()).toEqual(["name", "voice"]);
  });
});

describe("generateInviteCode", () => {
  it("has three groups of four letters and digits, without look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("produces different codes each time", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateInviteCode()));
    expect(codes.size).toBe(500);
  });

  it("uses the random source it is given (so the format is testable)", () => {
    expect(generateInviteCode(() => 0)).toBe("AAAA-AAAA-AAAA");
    let n = 0;
    expect(generateInviteCode(() => n++)).toBe("ABCD-EFGH-JKMN");
  });

  it("only asks the random source for valid positions", () => {
    generateInviteCode((max) => {
      expect(max).toBe(31);
      return 0;
    });
  });
});

describe("inviteMessage", () => {
  it("gives the join link and the code, tolerating a trailing slash", () => {
    expect(inviteMessage("https://worship.example.com/", "ABCD-EFGH-JKMN")).toBe(
      "Join our worship team site: https://worship.example.com/join\nTeam invite code: ABCD-EFGH-JKMN",
    );
  });
});
