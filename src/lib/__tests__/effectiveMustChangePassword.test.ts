import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import { effectiveMustChangePassword } from "@/lib/effectiveMustChangePassword";

function userWithMeta(
  meta: Record<string, unknown> | undefined
): User | undefined {
  if (!meta) return undefined;
  return { user_metadata: meta } as User;
}

describe("effectiveMustChangePassword", () => {
  it("false en metadata débloque même si la DB est encore à true", () => {
    expect(
      effectiveMustChangePassword(
        true,
        userWithMeta({ must_change_password: false })
      )
    ).toBe(false);
  });

  it("true en DB et pas de metadata false → true", () => {
    expect(effectiveMustChangePassword(true, userWithMeta({}))).toBe(true);
    expect(effectiveMustChangePassword(true, userWithMeta(undefined))).toBe(
      true
    );
  });

  it("false en DB → false (même avec metadata absente)", () => {
    expect(effectiveMustChangePassword(false, userWithMeta({}))).toBe(false);
  });
});
