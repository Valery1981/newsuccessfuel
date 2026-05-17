import { describe, expect, it } from "vitest";
import {
  compareCompteNumero,
  flattenGrandLivreForExport,
  getCompteDisplayLabel,
  groupGrandLivreParCompte,
  getMouvementLibelle,
  simplifyEcritureLibelle,
} from "@/lib/grandLivre";

describe("compareCompteNumero", () => {
  it("trie par classe comptable puis numéro", () => {
    expect(compareCompteNumero("101", "211")).toBeLessThan(0);
    expect(compareCompteNumero("310", "411-001")).toBeLessThan(0);
    expect(compareCompteNumero("411-001", "512")).toBeLessThan(0);
    expect(compareCompteNumero("530", "601")).toBeLessThan(0);
  });

  it("ne trie pas alphabétiquement par libellé", () => {
    expect(compareCompteNumero("310", "320")).toBeLessThan(0);
  });
});

describe("grandLivre", () => {
  it("getCompteDisplayLabel préfère le tiers", () => {
    expect(
      getCompteDisplayLabel({
        date_ecriture: "2026-01-01",
        libelle_ecriture: "test",
        numero_compte: "411-001",
        libelle_compte: "Clients",
        tiers_nom: "Dupont SARL",
        tresorerie_libelle: null,
        debit: 100,
        credit: 0,
      }),
    ).toBe("Dupont SARL");
  });

  it("groupGrandLivreParCompte ordonne 101 avant 211 avant 310", () => {
    const sections = groupGrandLivreParCompte([
      {
        date_ecriture: "2026-01-01",
        libelle_ecriture: "À nouveau — Ouverture",
        numero_compte: "310",
        libelle_compte: "Stock Essence",
        tiers_nom: null,
        tresorerie_libelle: null,
        debit: 1000,
        credit: 0,
      },
      {
        date_ecriture: "2026-01-01",
        libelle_ecriture: "À nouveau — Ouverture",
        numero_compte: "101",
        libelle_compte: "À nouveau — Ouverture",
        tiers_nom: null,
        tresorerie_libelle: null,
        debit: 0,
        credit: 500,
      },
      {
        date_ecriture: "2026-01-01",
        libelle_ecriture: "À nouveau — Ouverture",
        numero_compte: "211",
        libelle_compte: "Matériels roulants",
        tiers_nom: null,
        tresorerie_libelle: null,
        debit: 200,
        credit: 0,
      },
    ]);
    expect(sections.map((s) => s.compteNumero)).toEqual(["101", "211", "310"]);
    const capital = sections.find((s) => s.compteNumero === "101");
    expect(capital?.compteLabel).toBe("Capital social");
    expect(capital?.mouvements[0]?.libelle).toBe("À nouveau — Ouverture");
  });

  it("simplifyEcritureLibelle conserve le libellé ouverture globale", () => {
    expect(simplifyEcritureLibelle("À nouveau — Ouverture")).toBe(
      "À nouveau — Ouverture",
    );
  });

  it("getMouvementLibelle sur 101 utilise libelle_compte de la ligne", () => {
    expect(
      getMouvementLibelle({
        date_ecriture: "2026-01-01",
        libelle_ecriture: "A Nouveau - Initialisation - dettes",
        numero_compte: "101",
        libelle_compte: "À nouveau — Ouverture",
        tiers_nom: null,
        tresorerie_libelle: null,
        debit: 0,
        credit: 1000,
      }),
    ).toBe("À nouveau — Ouverture");
  });

  it("flattenGrandLivreForExport ne contient pas de numéro de compte", () => {
    const flat = flattenGrandLivreForExport(
      groupGrandLivreParCompte([
        {
          date_ecriture: "2026-01-01",
          libelle_ecriture: "test",
          numero_compte: "310",
          libelle_compte: "Stock Essence",
          tiers_nom: null,
          tresorerie_libelle: null,
          debit: 200,
          credit: 0,
        },
      ]),
    );
    const json = JSON.stringify(flat);
    expect(json).not.toMatch(/"310"/);
    expect(flat[0].Compte).toBe("Stock Essence");
  });
});
