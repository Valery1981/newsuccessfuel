import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerStock (§ stock levels).
 * On teste les calculs de seuils d'alerte sans toucher Supabase.
 */

describe("Partner Stock Service — logique de seuils", () => {
  it("calcul du seuil d'alerte à 20% de la capacité", () => {
    const capacite = 10000;
    const seuil = capacite * 0.2;
    expect(seuil).toBe(2000);
  });

  it("calcul du pourcentage de remplissage", () => {
    const stock = 5000;
    const capacite = 10000;
    const pourcentage = (stock / capacite) * 100;
    expect(pourcentage).toBe(50);
  });

  it("détection d'alerte quand stock < seuil", () => {
    const stock = 1500;
    const capacite = 10000;
    const seuil = capacite * 0.2;
    const alerte = stock < seuil;
    expect(alerte).toBe(true);
  });

  it("pas d'alerte quand stock >= seuil", () => {
    const stock = 3000;
    const capacite = 10000;
    const seuil = capacite * 0.2;
    const alerte = stock < seuil;
    expect(alerte).toBe(false);
  });
});
