import { describe, expect, it } from "vitest";

import { computeBalance } from "../PartieDoubleCheck";
import { buildAchatLignes } from "../ComptabiliserAchatDialog";

const labels = {
  libelleAchat: "Achats carburant",
  libelleTresorerie: "Caisse",
  libelleFournisseur: "Fournisseur Total",
};

describe("buildAchatLignes — APEX-12-suite (§6.1 partie double)", () => {
  it("achat 100% payé cash : 1 ligne débit + 1 ligne crédit, pas de fournisseur", () => {
    const lignes = buildAchatLignes({
      montantFacture: 1000,
      totalPaye: 1000,
      ...labels,
    });
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatchObject({
      libelleCompte: "Achats carburant",
      debit: 1000,
      credit: 0,
    });
    expect(lignes[1]).toMatchObject({
      libelleCompte: "Caisse",
      debit: 0,
      credit: 1000,
    });
  });

  it("achat 100% à crédit : 1 ligne débit + 1 ligne fournisseur", () => {
    const lignes = buildAchatLignes({
      montantFacture: 500,
      totalPaye: 0,
      ...labels,
    });
    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toMatchObject({
      libelleCompte: "Fournisseur Total",
      debit: 0,
      credit: 500,
    });
  });

  it("achat partiel cash + crédit : 3 lignes (1 débit, 2 crédits)", () => {
    const lignes = buildAchatLignes({
      montantFacture: 1000,
      totalPaye: 600,
      ...labels,
    });
    expect(lignes).toHaveLength(3);
    expect(lignes[1].credit).toBe(600); // tresorerie
    expect(lignes[2].credit).toBe(400); // fournisseur
  });

  it("équilibre toujours respecté quel que soit la répartition (§6.1 BLOQUANT)", () => {
    const cases = [
      { f: 1000, p: 1000 },
      { f: 1000, p: 0 },
      { f: 1000, p: 333.33 },
      { f: 9999.99, p: 1.01 },
      { f: 1, p: 0.5 },
    ];
    for (const { f, p } of cases) {
      const lignes = buildAchatLignes({
        montantFacture: f,
        totalPaye: p,
        ...labels,
      });
      const result = computeBalance(
        lignes.map((l) => l.debit),
        lignes.map((l) => l.credit),
      );
      expect(result.isBalanced).toBe(true);
    }
  });

  it("achat = 0 : 1 seule ligne (débit nul, pas de contrepartie)", () => {
    const lignes = buildAchatLignes({
      montantFacture: 0,
      totalPaye: 0,
      ...labels,
    });
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ debit: 0, credit: 0 });
  });

  it("trop-perçu (totalPaye > montantFacture) : pas de ligne fournisseur (dette = 0)", () => {
    const lignes = buildAchatLignes({
      montantFacture: 100,
      totalPaye: 150,
      ...labels,
    });
    // Cas dégénéré : trop-perçu => dette négative => pas de fournisseur ligne
    expect(lignes.find((l) => l.libelleCompte === "Fournisseur Total")).toBeUndefined();
    // Mais l'équilibre est cassé (intentionnellement, pour signaler le bug en amont)
    const result = computeBalance(
      lignes.map((l) => l.debit),
      lignes.map((l) => l.credit),
    );
    expect(result.isBalanced).toBe(false);
  });
});
