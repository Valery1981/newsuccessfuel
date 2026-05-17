import { describe, expect, it } from "vitest";

import {
  aggregateBoutiqueParCompteStock,
  aggregateCuvesParCompteStock,
  calculerPrixAchatCarburant,
  calculerValeurStock,
  comptesToLignesANouveau,
  validateLignesInitialisation,
} from "@/lib/initialisationCompta";

describe("initialisationCompta", () => {
  it("calculerPrixAchatCarburant = PV - marge", () => {
    expect(calculerPrixAchatCarburant(750, 50)).toBe(700);
  });

  it("calculerValeurStock ignore montants nuls", () => {
    expect(calculerValeurStock(0, 100)).toBe(0);
    expect(calculerValeurStock(10, 25.5)).toBe(255);
  });

  it("aggregateCuvesParCompteStock regroupe par 310/320/330", () => {
    const lignes = aggregateCuvesParCompteStock([
      { compte_stock: "310", valeur: 1000 },
      { compte_stock: "310", valeur: 500 },
      { compte_stock: "320", valeur: 200 },
    ]);
    expect(lignes).toHaveLength(2);
    expect(lignes.find((l) => l.numero_compte === "310")?.montant).toBe(1500);
    expect(lignes.find((l) => l.numero_compte === "320")?.montant).toBe(200);
  });

  it("aggregateBoutiqueParCompteStock mappe les familles", () => {
    const lignes = aggregateBoutiqueParCompteStock([
      { famille: "marchandises_generales", valeur: 300 },
      { famille: "lubrifiants", valeur: 100 },
    ]);
    expect(lignes.map((l) => l.numero_compte).sort()).toEqual(["340", "360"]);
  });

  it("comptesToLignesANouveau déduit le sens", () => {
    const lignes = comptesToLignesANouveau([
      {
        numero_compte: "512001",
        libelle_compte: "Banque",
        solde_debit: 1000,
        solde_credit: 0,
      },
      {
        numero_compte: "401001",
        libelle_compte: "Fournisseur",
        solde_debit: 0,
        solde_credit: 400,
      },
    ]);
    expect(lignes).toHaveLength(2);
    expect(lignes[0].sens).toBe("debit");
    expect(lignes[1].sens).toBe("credit");
  });

  it("validateLignesInitialisation refuse 421 en créances", () => {
    expect(() =>
      validateLignesInitialisation("creances", [
        {
          numero_compte: "421-001",
          libelle_compte: "Employé",
          montant: 100,
          sens: "debit",
        },
      ]),
    ).toThrow(/460/);
  });

  it("validateLignesInitialisation accepte 460 en créances", () => {
    expect(() =>
      validateLignesInitialisation("creances", [
        {
          numero_compte: "460-001",
          libelle_compte: "Employé A",
          montant: 100,
          sens: "debit",
        },
      ]),
    ).not.toThrow();
  });
});
