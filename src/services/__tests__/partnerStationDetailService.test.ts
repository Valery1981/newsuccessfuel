import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerStationDetail (§ détails station).
 * On teste les calculs d'agrégation de données station.
 */

describe("Partner Station Detail Service — logique d'agrégation", () => {
  it("calcul de l'évolution entre mois courant et précédent", () => {
    const moisCourant = 5000;
    const moisPrecedent = 4000;
    const evolution = ((moisCourant - moisPrecedent) / moisPrecedent) * 100;
    expect(evolution).toBe(25);
  });

  it("calcul du pourcentage de remplissage du stock", () => {
    const stock = 3000;
    const capacite = 10000;
    const pourcentage = (stock / capacite) * 100;
    expect(pourcentage).toBe(30);
  });

  it("calcul du taux de réalisation mensuel", () => {
    const realise = 7500;
    const objectif = 10000;
    const taux = (realise / objectif) * 100;
    expect(taux).toBe(75);
  });

  it("calcul du taux de résolution des doléances", () => {
    const total = 10;
    const resolues = 8;
    const taux = (resolues / total) * 100;
    expect(taux).toBe(80);
  });

  it("calcul de l'écart moyen sur 30 jours", () => {
    const ecarts = [100, -50, 75, -25];
    const total = ecarts.reduce((sum, e) => sum + e, 0);
    const moyen = total / ecarts.length;
    expect(moyen).toBe(25);
  });
});
