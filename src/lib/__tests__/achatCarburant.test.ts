import { describe, expect, it } from "vitest";
import {
  buildLignesComptaPaiementAchatCarburant,
  buildLignesComptaStockAchatCarburant,
  buildReferenceAchatCarburant,
  calculerCmupAchatCarburant,
  calculerControleJaugeCuve,
  grouperReceptionsParCuve,
  montantLigneReception,
  resolveCompteStockCarburant,
} from "@/lib/achatCarburant";

describe("achatCarburant", () => {
  it("calculerControleJaugeCuve — écart sur total nominal cuve", () => {
    const r = calculerControleJaugeCuve(1000, 11200, 10000);
    expect(r.volumeConstate).toBe(10200);
    expect(r.ecartLivraison).toBe(200);
  });

  it("grouperReceptionsParCuve — 2 compartiments même cuve", () => {
    const g = grouperReceptionsParCuve([
      {
        cuve_id: "c1",
        station_id: "s1",
        cuve_nom: "GO",
        compartiment_id: "p1",
        compartiment_numero: 1,
        volume_nominal: 5000,
        jauge_avant_cm: 10,
        jauge_apres_cm: 50,
        volume_avant_litres: 1000,
        volume_apres_litres: 11200,
      },
      {
        cuve_id: "c1",
        station_id: "s1",
        cuve_nom: "GO",
        compartiment_id: "p2",
        compartiment_numero: 2,
        volume_nominal: 5000,
      },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].total_nominal_livre).toBe(10000);
    expect(g[0].ecart_indicatif).toBe(200);
  });

  it("calculerCmupAchatCarburant", () => {
    const cmup = calculerCmupAchatCarburant(1000, 500, 2000, 600);
    expect(cmup).toBeCloseTo(566.6667, 3);
  });

  it("buildReferenceAchatCarburant", () => {
    expect(buildReferenceAchatCarburant("BC-1")).toBe("BC-1");
    expect(buildReferenceAchatCarburant("BC-1", "BL-9")).toBe("BC-1 + BL-9");
  });

  it("buildLignesComptaStock — partie double", () => {
    const lignes = buildLignesComptaStockAchatCarburant(
      [{ compteStock: "310", libelleStock: "Essence", montant: 1000 }],
      "401FOUR",
      "Total Energies",
      "Achat carburant",
    );
    const debit = lignes.reduce((s, l) => s + l.debit, 0);
    const credit = lignes.reduce((s, l) => s + l.credit, 0);
    expect(debit).toBe(credit);
    expect(debit).toBe(1000);
  });

  it("buildLignesComptaPaiement — D401 C trésorerie", () => {
    const lignes = buildLignesComptaPaiementAchatCarburant({
      montant: 500,
      compteFournisseur: "401",
      libelleFournisseur: "Fournisseur",
      compteTresorerie: "512",
      libelleTresorerie: "Banque",
      referenceBc: "BC-42",
    });
    expect(lignes[0].debit).toBe(500);
    expect(lignes[1].credit).toBe(500);
  });

  it("resolveCompteStockCarburant", () => {
    expect(resolveCompteStockCarburant("320", null)).toBe("320");
    expect(resolveCompteStockCarburant(null, null)).toBe("310");
  });

  it("montantLigneReception", () => {
    expect(montantLigneReception(1000, 650)).toBe(650000);
  });
});
