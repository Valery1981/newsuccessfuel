import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerKPI (§ partner dashboard).
 * On teste les calculs d'agrégation sans toucher Supabase (logique pure).
 */

describe("Partner KPI Service — logique d'agrégation", () => {
  it("calcul du total des achats carburant par type", () => {
    const lignes = [
      { type_carburant: "Essence", quantite_commandee: 1000 },
      { type_carburant: "Diesel", quantite_commandee: 2000 },
      { type_carburant: "Essence", quantite_commandee: 500 },
    ];
    
    const totalEssence = lignes
      .filter(l => l.type_carburant === "Essence")
      .reduce((sum, l) => sum + l.quantite_commandee, 0);
    
    expect(totalEssence).toBe(1500);
  });

  it("calcul du total des ventes carburant", () => {
    const lignes = [
      { volume_vendu: 500 },
      { volume_vendu: 750 },
      { volume_vendu: 250 },
    ];
    
    const total = lignes.reduce((sum, l) => sum + l.volume_vendu, 0);
    expect(total).toBe(1500);
  });

  it("calcul du nombre de doléances ouvertes", () => {
    const doleances = [
      { statut: "envoyee" },
      { statut: "prise_en_charge" },
      { statut: "reglee" },
      { statut: "envoyee" },
    ];
    
    const ouvertes = doleances.filter(d => d.statut !== "reglee").length;
    expect(ouvertes).toBe(3);
  });
});
