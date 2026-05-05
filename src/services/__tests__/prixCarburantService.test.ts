import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier prix carburant (§6.5 rules.md).
 * On teste la formule PA = PV - Marge sans toucher Supabase (logique pure).
 */

function calculerPrixAchat(prixVente: number, marge: number): number {
  return prixVente - marge;
}

describe("Prix Carburant — règle métier §6.5", () => {
  it("PA = PV - Marge", () => {
    expect(calculerPrixAchat(750, 50)).toBe(700);
  });

  it("Marge nulle → PA = PV", () => {
    expect(calculerPrixAchat(750, 0)).toBe(750);
  });

  it("PV = Marge → PA = 0", () => {
    expect(calculerPrixAchat(50, 50)).toBe(0);
  });

  it("PV < Marge → PA négatif (cas invalide bloqué par Zod en amont)", () => {
    // Cas invalide qui ne devrait pas atteindre le service (validation côté form)
    expect(calculerPrixAchat(50, 75)).toBe(-25);
  });

  it("Précision décimale conservée", () => {
    expect(calculerPrixAchat(751.5, 50.25)).toBeCloseTo(701.25, 2);
  });
});
