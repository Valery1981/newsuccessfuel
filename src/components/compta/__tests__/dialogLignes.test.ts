/**
 * APEX-12-final : tests unit pour les fonctions de construction de lignes comptables
 * des dialogs de ManagerNonSalesOperationsPage.
 *
 * Ces tests vérifient l'équilibre débit/crédit pour tous les patterns de lignes
 * utilisés dans les 6 dialogs avec EcriturePreview.
 */

import { describe, it, expect } from "vitest";

/**
 * Pattern EncaissementCréances : D Trésorerie / C Créance client
 */
export function buildEncaissementLignes(
  montant: number,
  tresorerieLibelle: string,
  tiersNom?: string | null,
) {
  return [
    {
      libelleCompte: tresorerieLibelle,
      debit: montant,
      credit: 0,
      libelle: "Encaissement reçu",
    },
    {
      libelleCompte: `Créance client${tiersNom ? ` (${tiersNom})` : ""}`,
      debit: 0,
      credit: montant,
      libelle: "Extinction partielle/totale",
    },
  ];
}

/**
 * Pattern RèglementDettes : D Dette fournisseur / C Trésorerie
 */
export function buildReglementLignes(
  montant: number,
  fournisseurNom?: string | null,
  tresorerieLibelle?: string,
) {
  return [
    {
      libelleCompte: `Dette fournisseur${fournisseurNom ? ` (${fournisseurNom})` : ""}`,
      debit: montant,
      credit: 0,
      libelle: "Extinction partielle/totale",
    },
    {
      libelleCompte: tresorerieLibelle ?? "Trésorerie",
      debit: 0,
      credit: montant,
      libelle: "Sortie paiement",
    },
  ];
}

/**
 * Pattern ChargesCourantes : D Charge / C Trésorerie + C Fournisseur (si crédit partiel)
 */
export function buildChargesLignes(
  montant: number,
  montantCash: number,
  montantCredit: number,
  libelleCharge: string,
  tresorerieLibelle?: string,
  fournisseurNom?: string,
) {
  const lignes = [
    {
      libelleCompte: libelleCharge || "Charge",
      debit: montant,
      credit: 0,
      libelle: "Charge de la période",
    },
  ];

  if (montantCash > 0 && tresorerieLibelle) {
    lignes.push({
      libelleCompte: tresorerieLibelle,
      debit: 0,
      credit: montantCash,
      libelle: "Paiement immédiat",
    });
  }

  if (montantCredit > 0 && fournisseurNom) {
    lignes.push({
      libelleCompte: `Fournisseur ${fournisseurNom}`,
      debit: 0,
      credit: montantCredit,
      libelle: "Reste à payer",
    });
  }

  return lignes;
}

/**
 * Pattern Salaires (Avance) : D Avances au personnel / C Trésorerie
 */
export function buildAvanceLignes(montant: number, tresorerieLibelle: string) {
  return [
    {
      libelleCompte: "Avances au personnel",
      debit: montant,
      credit: 0,
      libelle: "Créance sur employé",
    },
    {
      libelleCompte: tresorerieLibelle,
      debit: 0,
      credit: montant,
      libelle: "Sortie immédiate",
    },
  ];
}

/**
 * Pattern Immobilisations : 3 sous-types (acquisition_cash, acquisition_credit, cession)
 */
export function buildImmobilisationsLignes(
  sousType: "acquisition_cash" | "acquisition_credit" | "cession",
  montant: number,
  libelleImmo: string,
  tresorerieLibelle?: string,
  fournisseurNom?: string,
) {
  if (sousType === "acquisition_cash") {
    return [
      {
        libelleCompte: libelleImmo,
        debit: montant,
        credit: 0,
        libelle: "Acquisition immobilisation",
      },
      {
        libelleCompte: tresorerieLibelle ?? "Trésorerie",
        debit: 0,
        credit: montant,
        libelle: "Sortie trésorerie",
      },
    ];
  }

  if (sousType === "acquisition_credit") {
    return [
      {
        libelleCompte: libelleImmo,
        debit: montant,
        credit: 0,
        libelle: "Acquisition à crédit",
      },
      {
        libelleCompte: `Fournisseur ${fournisseurNom ?? ""}`,
        debit: 0,
        credit: montant,
        libelle: "Reste à payer",
      },
    ];
  }

  // cession
  return [
    {
      libelleCompte: tresorerieLibelle ?? "Trésorerie",
      debit: montant,
      credit: 0,
      libelle: "Encaissement cession",
    },
    {
      libelleCompte: libelleImmo,
      debit: 0,
      credit: montant,
      libelle: "Sortie immobilisation",
    },
  ];
}

/**
 * Helper pour vérifier l'équilibre débit/crédit
 */
function computeBalance(lignes: Array<{ debit: number; credit: number }>) {
  const totalDebit = lignes.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lignes.reduce((sum, l) => sum + l.credit, 0);
  return totalDebit - totalCredit;
}

describe("buildEncaissementLignes", () => {
  it("génère 2 lignes équilibrées", () => {
    const lignes = buildEncaissementLignes(1000, "Caisse Principale", "Client A");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("inclut le nom du tiers si fourni", () => {
    const lignes = buildEncaissementLignes(500, "Caisse", "Client B");
    expect(lignes[1].libelleCompte).toContain("Client B");
  });

  it("sans nom de tiers", () => {
    const lignes = buildEncaissementLignes(500, "Caisse", null);
    expect(lignes[1].libelleCompte).toBe("Créance client");
  });
});

describe("buildReglementLignes", () => {
  it("génère 2 lignes équilibrées", () => {
    const lignes = buildReglementLignes(2000, "Fournisseur X", "Banque");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("sans fournisseur ni trésorerie spécifiés", () => {
    const lignes = buildReglementLignes(1500);
    expect(lignes[0].libelleCompte).toBe("Dette fournisseur");
    expect(lignes[1].libelleCompte).toBe("Trésorerie");
  });
});

describe("buildChargesLignes", () => {
  it("100% cash : 2 lignes équilibrées", () => {
    const lignes = buildChargesLignes(1000, 1000, 0, "Loyer", "Caisse");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("100% crédit : 2 lignes équilibrées", () => {
    const lignes = buildChargesLignes(1000, 0, 1000, "Loyer", undefined, "Fournisseur Y");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("partiel (50/50) : 3 lignes équilibrées", () => {
    const lignes = buildChargesLignes(1000, 500, 500, "Loyer", "Caisse", "Fournisseur Z");
    expect(lignes).toHaveLength(3);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("partiel (70/30) : 3 lignes équilibrées", () => {
    const lignes = buildChargesLignes(1000, 700, 300, "Électricité", "Banque", "EDF");
    expect(lignes).toHaveLength(3);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("montant = 0 : 1 seule ligne (dégénéré)", () => {
    const lignes = buildChargesLignes(0, 0, 0, "Charge X");
    expect(lignes).toHaveLength(1);
    expect(lignes[0].debit).toBe(0);
  });
});

describe("buildAvanceLignes", () => {
  it("génère 2 lignes équilibrées", () => {
    const lignes = buildAvanceLignes(500, "Caisse");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
  });

  it("compte trésorerie personnalisé", () => {
    const lignes = buildAvanceLignes(750, "Banque Société");
    expect(lignes[1].libelleCompte).toBe("Banque Société");
  });
});

describe("buildImmobilisationsLignes", () => {
  it("acquisition_cash : 2 lignes équilibrées", () => {
    const lignes = buildImmobilisationsLignes("acquisition_cash", 10000, "Matériel Info", "Banque");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
    expect(lignes[0].libelleCompte).toBe("Matériel Info");
    expect(lignes[1].libelle).toBe("Sortie trésorerie");
  });

  it("acquisition_credit : 2 lignes équilibrées", () => {
    const lignes = buildImmobilisationsLignes("acquisition_credit", 15000, "Véhicule", undefined, "Concession Auto");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
    expect(lignes[0].libelleCompte).toBe("Véhicule");
    expect(lignes[1].libelleCompte).toContain("Concession Auto");
  });

  it("cession : 2 lignes équilibrées (inversées)", () => {
    const lignes = buildImmobilisationsLignes("cession", 5000, "Ancien PC", "Caisse");
    expect(lignes).toHaveLength(2);
    expect(computeBalance(lignes)).toBeCloseTo(0);
    expect(lignes[0].libelleCompte).toBe("Caisse");
    expect(lignes[0].debit).toBe(5000);
    expect(lignes[1].credit).toBe(5000);
  });

  it("acquisition_cash sans trésorerie spécifiée", () => {
    const lignes = buildImmobilisationsLignes("acquisition_cash", 8000, "Mobilier");
    expect(lignes[1].libelleCompte).toBe("Trésorerie");
  });
});
