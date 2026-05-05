import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "@/lib/utils";

describe("cn (class names merger)", () => {
  it("fusionne des classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("gère les conflits Tailwind (tailwind-merge)", () => {
    // tailwind-merge doit résoudre les conflits px-2 vs px-4
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });
});

describe("formatCurrency", () => {
  it("formate un nombre en monnaie", () => {
    const result = formatCurrency(1000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formate zéro", () => {
    const result = formatCurrency(0);
    expect(typeof result).toBe("string");
  });

  it("formate des grands nombres", () => {
    const result = formatCurrency(1_000_000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });
});
