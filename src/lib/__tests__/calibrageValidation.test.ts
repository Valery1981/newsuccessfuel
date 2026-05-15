import { describe, expect, it } from "vitest";

import {
  isCalibrationValid,
  validateCalibrationPoints,
} from "../calibrageValidation";

// APEX 2026-05-15-03 — Tests unitaires pour les 3 règles de calibrage
// Source : guide/Guide_Document_SuccessFuel.md §7 sous-étape 3.2

describe("validateCalibrationPoints", () => {
  describe("Règle 1 : dernière jauge ≥ capacité max", () => {
    it("accepte un calibrage qui couvre la capacité max", () => {
      const points = [
        { hauteur_cm: 1, volume_litres: 0 },
        { hauteur_cm: 100, volume_litres: 5000 },
        { hauteur_cm: 200, volume_litres: 10000 },
      ];
      const result = validateCalibrationPoints(points, 10000);
      expect(result.every((p) => !p.erreur)).toBe(true);
    });

    it("rejette si le dernier volume est < capacité max", () => {
      const points = [
        { hauteur_cm: 1, volume_litres: 0 },
        { hauteur_cm: 100, volume_litres: 5000 },
        { hauteur_cm: 200, volume_litres: 8000 },
      ];
      const result = validateCalibrationPoints(points, 10000);
      const last = result[result.length - 1];
      expect(last.erreur).toMatch(/Règle 1/);
    });
  });

  describe("Règle 2 : volumes strictement croissants", () => {
    it("rejette un volume identique au précédent", () => {
      const points = [
        { hauteur_cm: 1, volume_litres: 0 },
        { hauteur_cm: 50, volume_litres: 1000 },
        { hauteur_cm: 100, volume_litres: 1000 },
      ];
      const result = validateCalibrationPoints(points, null);
      expect(result[2].erreur).toMatch(/Volume.*dupliqué/);
    });

    it("rejette un volume décroissant", () => {
      const points = [
        { hauteur_cm: 1, volume_litres: 0 },
        { hauteur_cm: 50, volume_litres: 1000 },
        { hauteur_cm: 100, volume_litres: 800 },
      ];
      const result = validateCalibrationPoints(points, null);
      expect(result[2].erreur).toMatch(/strictement supérieur/);
    });
  });

  describe("Règle 3 : pas de doublons sur la hauteur", () => {
    it("rejette deux hauteurs identiques", () => {
      const points = [
        { hauteur_cm: 1, volume_litres: 0 },
        { hauteur_cm: 50, volume_litres: 1000 },
        { hauteur_cm: 50, volume_litres: 2000 },
      ];
      const result = validateCalibrationPoints(points, null);
      expect(result[2].erreur).toMatch(/Hauteur.*dupliquée/);
    });

    it("rejette une hauteur décroissante", () => {
      const points = [
        { hauteur_cm: 50, volume_litres: 1000 },
        { hauteur_cm: 30, volume_litres: 2000 },
      ];
      const result = validateCalibrationPoints(points, null);
      expect(result[1].erreur).toMatch(/strictement supérieure/);
    });

    it("rejette une hauteur < 1 cm", () => {
      const points = [{ hauteur_cm: 0, volume_litres: 0 }];
      const result = validateCalibrationPoints(points, null);
      expect(result[0].erreur).toMatch(/minimum 1 cm/);
    });
  });
});

describe("isCalibrationValid", () => {
  it("retourne false pour moins de 2 points", () => {
    expect(
      isCalibrationValid([{ hauteur_cm: 1, volume_litres: 0 }], 1000),
    ).toBe(false);
  });

  it("retourne true pour un calibrage conforme aux 3 règles", () => {
    const points = [
      { hauteur_cm: 1, volume_litres: 0 },
      { hauteur_cm: 100, volume_litres: 3000 },
      { hauteur_cm: 200, volume_litres: 6000 },
      { hauteur_cm: 300, volume_litres: 10000 },
    ];
    expect(isCalibrationValid(points, 10000)).toBe(true);
  });

  it("retourne false si une règle est violée", () => {
    const points = [
      { hauteur_cm: 1, volume_litres: 0 },
      { hauteur_cm: 100, volume_litres: 3000 },
      { hauteur_cm: 100, volume_litres: 6000 }, // doublon hauteur
    ];
    expect(isCalibrationValid(points, 10000)).toBe(false);
  });
});
