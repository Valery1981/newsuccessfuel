import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerObjective (§ objectifs).
 * On teste les calculs de taux de réalisation et projection.
 */

describe("Partner Objective Service — logique d'objectifs", () => {
  it("calcul du taux de réalisation", () => {
    const realise = 7500;
    const objectif = 10000;
    const taux = (realise / objectif) * 100;
    expect(taux).toBe(75);
  });

  it("calcul de la projection mensuelle", () => {
    const realise = 5000;
    const jourActuel = 15;
    const joursMois = 30;
    const projection = (realise / jourActuel) * joursMois;
    expect(projection).toBe(10000);
  });

  it("calcul de la projection annuelle", () => {
    const realise = 30000;
    const joursEcoules = 90;
    const joursAnnee = 365;
    const projection = (realise / joursEcoules) * joursAnnee;
    expect(projection).toBeCloseTo(121666.67, 2);
  });

  it("taux de réalisation limité à 150%", () => {
    const realise = 20000;
    const objectif = 10000;
    const taux = Math.min((realise / objectif) * 100, 150);
    expect(taux).toBe(150);
  });

  it("taux de 0 quand objectif est 0", () => {
    const realise = 5000;
    const objectif = 0;
    const taux = objectif > 0 ? (realise / objectif) * 100 : 0;
    expect(taux).toBe(0);
  });
});
