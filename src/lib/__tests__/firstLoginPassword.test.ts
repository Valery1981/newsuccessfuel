import { describe, it, expect } from "vitest";
import { firstLoginPasswordSchema } from "@/lib/firstLoginPassword";

describe("firstLoginPasswordSchema", () => {
  it("accepte deux champs identiques d’au moins 8 caractères", () => {
    const r = firstLoginPasswordSchema.safeParse({
      password: "abcdefgh",
      confirm: "abcdefgh",
    });
    expect(r.success).toBe(true);
  });

  it("refuse un mot de passe trop court", () => {
    const r = firstLoginPasswordSchema.safeParse({
      password: "short",
      confirm: "short",
    });
    expect(r.success).toBe(false);
  });

  it("refuse si confirmation différente", () => {
    const r = firstLoginPasswordSchema.safeParse({
      password: "abcdefgh",
      confirm: "abcdefgi",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.confirm?.length).toBeGreaterThan(0);
    }
  });
});
