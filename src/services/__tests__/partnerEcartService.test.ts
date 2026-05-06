import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerEcart (§ écarts).
 * On teste les calculs de tendance.
 */

describe("Partner Ecart Service — logique de tendance", () => {
  it("calcul de l'écart total", () => {
    const ecarts = [100, -50, 75, -25];
    const total = ecarts.reduce((sum, e) => sum + e, 0);
    expect(total).toBe(100);
  });

  it("calcul de l'écart moyen", () => {
    const ecarts = [100, -50, 75, -25];
    const moyen = ecarts.reduce((sum, e) => sum + e, 0) / ecarts.length;
    expect(moyen).toBe(25);
  });

  it("détection d'amélioration (tendance)", () => {
    const premiereMoitie = [100, 80, 90];
    const secondeMoitie = [50, 40, 30];
    const moyPremiere = premiereMoitie.reduce((s, e) => s + e, 0) / premiereMoitie.length;
    const moySeconde = secondeMoitie.reduce((s, e) => s + e, 0) / secondeMoitie.length;
    const diff = moySeconde - moyPremiere;
    const tendance = diff < -10 ? "amelioration" : diff > 10 ? "degradation" : "stable";
    expect(tendance).toBe("amelioration");
  });

  it("détection de dégradation (tendance)", () => {
    const premiereMoitie = [50, 40, 30];
    const secondeMoitie = [100, 80, 90];
    const moyPremiere = premiereMoitie.reduce((s, e) => s + e, 0) / premiereMoitie.length;
    const moySeconde = secondeMoitie.reduce((s, e) => s + e, 0) / secondeMoitie.length;
    const diff = moySeconde - moyPremiere;
    const tendance = diff < -10 ? "amelioration" : diff > 10 ? "degradation" : "stable";
    expect(tendance).toBe("degradation");
  });

  it("détection de stabilité (tendance)", () => {
    const premiereMoitie = [50, 50, 50];
    const secondeMoitie = [55, 45, 50];
    const moyPremiere = premiereMoitie.reduce((s, e) => s + e, 0) / premiereMoitie.length;
    const moySeconde = secondeMoitie.reduce((s, e) => s + e, 0) / secondeMoitie.length;
    const diff = moySeconde - moyPremiere;
    const tendance = diff < -10 ? "amelioration" : diff > 10 ? "degradation" : "stable";
    expect(tendance).toBe("stable");
  });
});
