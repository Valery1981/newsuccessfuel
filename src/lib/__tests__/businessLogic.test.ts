/**
 * Tests de la logique métier SuccessFuel — calculs critiques
 * Basés sur le Guide Document SuccessFuel.md
 */
import { describe, it, expect } from "vitest";

// ============================================================
// Calcul CMUP (Coût Moyen Unitaire Pondéré)
// Formule : (stock_actuel * cmup_actuel + quantite_entree * prix_achat) / (stock_actuel + quantite_entree)
// ============================================================

function calculerCmup(
  stockActuel: number,
  cmupActuel: number,
  quantiteEntree: number,
  prixAchat: number
): number {
  const totalQuantite = stockActuel + quantiteEntree;
  if (totalQuantite === 0) return 0;
  return (stockActuel * cmupActuel + quantiteEntree * prixAchat) / totalQuantite;
}

describe("Calcul CMUP", () => {
  it("calcule le CMUP à partir de zéro stock", () => {
    const cmup = calculerCmup(0, 0, 1000, 5000);
    expect(cmup).toBe(5000);
  });

  it("calcule le nouveau CMUP après un achat", () => {
    // 500L à 5000 Ar/L existants, achat de 1000L à 5500 Ar/L
    const cmup = calculerCmup(500, 5000, 1000, 5500);
    expect(cmup).toBeCloseTo((500 * 5000 + 1000 * 5500) / 1500, 2);
  });

  it("CMUP inchangé si on rachète au même prix", () => {
    const cmup = calculerCmup(1000, 5000, 500, 5000);
    expect(cmup).toBe(5000);
  });

  it("retourne 0 si stock et entrée sont nuls", () => {
    const cmup = calculerCmup(0, 0, 0, 5000);
    expect(cmup).toBe(0);
  });
});

// ============================================================
// Calcul volume de vente (shift carburant)
// volume_vendu = index_final - index_initial
// ============================================================

function calculerVolumeVendu(indexInitial: number, indexFinal: number): number {
  if (indexFinal < indexInitial) throw new Error("index_final doit être >= index_initial");
  return indexFinal - indexInitial;
}

describe("Calcul volume vendu (shift carburant)", () => {
  it("calcule le volume vendu correctement", () => {
    expect(calculerVolumeVendu(1000, 1500)).toBe(500);
  });

  it("volume nul si indexes identiques", () => {
    expect(calculerVolumeVendu(1000, 1000)).toBe(0);
  });

  it("lève une erreur si index_final < index_initial", () => {
    expect(() => calculerVolumeVendu(1500, 1000)).toThrow();
  });
});

// ============================================================
// Calcul CA shift
// ca = volume_vendu * prix_vente
// ============================================================

function calculerCaShift(indexInitial: number, indexFinal: number, prixVente: number): number {
  const volume = calculerVolumeVendu(indexInitial, indexFinal);
  return volume * prixVente;
}

describe("Calcul CA shift carburant", () => {
  it("calcule le CA correctement", () => {
    // 500L à 5500 Ar/L = 2 750 000 Ar
    expect(calculerCaShift(1000, 1500, 5500)).toBe(2_750_000);
  });

  it("CA nul si aucune vente", () => {
    expect(calculerCaShift(1000, 1000, 5500)).toBe(0);
  });
});

// ============================================================
// Validation partie double comptable
// ∑ Débits = ∑ Crédits
// ============================================================

function validerPartieDouble(lignes: { debit: number; credit: number }[]): boolean {
  const totalDebit = lignes.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = lignes.reduce((acc, l) => acc + l.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01; // tolérance pour flottants
}

describe("Validation partie double comptable", () => {
  it("valide une écriture équilibrée", () => {
    const lignes = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 1000 },
    ];
    expect(validerPartieDouble(lignes)).toBe(true);
  });

  it("rejette une écriture déséquilibrée", () => {
    const lignes = [
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 800 },
    ];
    expect(validerPartieDouble(lignes)).toBe(false);
  });

  it("valide une écriture multi-lignes équilibrée", () => {
    const lignes = [
      { debit: 5000, credit: 0 },
      { debit: 0, credit: 3000 },
      { debit: 0, credit: 2000 },
    ];
    expect(validerPartieDouble(lignes)).toBe(true);
  });

  it("valide avec des montants décimaux", () => {
    const lignes = [
      { debit: 100.50, credit: 0 },
      { debit: 0, credit: 100.50 },
    ];
    expect(validerPartieDouble(lignes)).toBe(true);
  });
});

// ============================================================
// Calcul écart caisse shift
// ecart_caisse = ca_total - total_paiements
// ============================================================

function calculerEcartCaisse(caTotal: number, totalPaiements: number): number {
  return caTotal - totalPaiements;
}

describe("Calcul écart caisse", () => {
  it("pas d'écart si paiements = CA", () => {
    expect(calculerEcartCaisse(5000, 5000)).toBe(0);
  });

  it("écart positif si paiements insuffisants", () => {
    expect(calculerEcartCaisse(5000, 4500)).toBe(500);
  });

  it("écart négatif si trop encaissé", () => {
    expect(calculerEcartCaisse(5000, 5200)).toBe(-200);
  });
});

// ============================================================
// Valorisation stock (CMUP)
// valeur = quantite * cmup
// ============================================================

function valoriserStock(quantite: number, cmup: number): number {
  return quantite * cmup;
}

describe("Valorisation stock", () => {
  it("valorise correctement", () => {
    expect(valoriserStock(100, 250)).toBe(25000);
  });

  it("retourne 0 si quantité nulle", () => {
    expect(valoriserStock(0, 250)).toBe(0);
  });

  it("retourne 0 si CMUP nul", () => {
    expect(valoriserStock(100, 0)).toBe(0);
  });
});
