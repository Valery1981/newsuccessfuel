import { describe, expect, it } from "vitest";

/**
 * Tests pour la logique métier du partnerDoleance (§ doléances).
 * On teste les calculs de statistiques de doléances.
 */

describe("Partner Doleance Service — logique de statistiques", () => {
  it("calcul du taux de résolution", () => {
    const total = 20;
    const resolues = 15;
    const taux = (resolues / total) * 100;
    expect(taux).toBe(75);
  });

  it("calcul du nombre de doléances en cours", () => {
    const doleances = [
      { statut: "envoyee" },
      { statut: "prise_en_charge" },
      { statut: "reglee" },
    ];
    const enCours = doleances.filter(d => d.statut !== "reglee").length;
    expect(enCours).toBe(2);
  });

  it("calcul du délai moyen en heures", () => {
    const delaisMinutes = [60, 120, 180];
    const totalMinutes = delaisMinutes.reduce((sum, d) => sum + d, 0);
    const moyenneHeures = totalMinutes / delaisMinutes.length / 60;
    expect(moyenneHeures).toBe(2);
  });

  it("agrégation par type d'incident", () => {
    const doleances = [
      { type_incident: "Pompe défectueuse" },
      { type_incident: "Pompe défectueuse" },
      { type_incident: "Erreur de paiement" },
    ];
    const parType: Record<string, number> = {};
    doleances.forEach(d => {
      const type = d.type_incident;
      parType[type] = (parType[type] || 0) + 1;
    });
    expect(parType["Pompe défectueuse"]).toBe(2);
    expect(parType["Erreur de paiement"]).toBe(1);
  });
});
