import { describe, expect, it } from "vitest";

/**
 * Tests logique seuils RealisationBar (§4 rules.md codes couleurs).
 * Logique extraite pour test :
 *  - ≥ 100% : vert
 *  - 80-99% : orange
 *  - < 80% : rouge
 */
function getBarColor(realise: number, objectif: number): string {
  if (objectif <= 0) return "bg-destructive";
  const ratio = (realise / objectif) * 100;
  if (ratio >= 100) return "bg-green-500";
  if (ratio >= 80) return "bg-orange-500";
  return "bg-destructive";
}

describe("RealisationBar — seuils §4", () => {
  it("100% exactement → vert", () => {
    expect(getBarColor(100, 100)).toBe("bg-green-500");
  });

  it("> 100% → vert (dépassement)", () => {
    expect(getBarColor(120, 100)).toBe("bg-green-500");
  });

  it("80% → orange (limite basse)", () => {
    expect(getBarColor(80, 100)).toBe("bg-orange-500");
  });

  it("99.9% → orange", () => {
    expect(getBarColor(99.9, 100)).toBe("bg-orange-500");
  });

  it("79.9% → rouge", () => {
    expect(getBarColor(79.9, 100)).toBe("bg-destructive");
  });

  it("0% → rouge", () => {
    expect(getBarColor(0, 100)).toBe("bg-destructive");
  });

  it("objectif=0 → rouge (cas dégénéré)", () => {
    expect(getBarColor(50, 0)).toBe("bg-destructive");
  });
});
