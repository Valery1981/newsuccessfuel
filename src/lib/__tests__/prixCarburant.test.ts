import { describe, expect, it } from "vitest";

import {
  buildPrixCarburantConfirmSummary,
  calculerMontantLigneAchatCarburant,
  calculerPrixAchatCarburant,
  getPrixDejaEnregistreAujourdhuiWarning,
  hasPrixCarburantPourDate,
  PRIX_CARBURANT_CONFIRM_WARNINGS,
  selectPrixCarburantActifPourDate,
} from "@/lib/prixCarburant";

describe("prixCarburant — confirmation §6.5", () => {
  it("expose les avertissements obligatoires", () => {
    expect(PRIX_CARBURANT_CONFIRM_WARNINGS.length).toBeGreaterThanOrEqual(4);
    expect(PRIX_CARBURANT_CONFIRM_WARNINGS[0]).toMatch(/historis/i);
    expect(PRIX_CARBURANT_CONFIRM_WARNINGS[1]).toMatch(/conservent/i);
  });

  it("buildPrixCarburantConfirmSummary calcule PA = PV − marge", () => {
    const summary = buildPrixCarburantConfirmSummary({
      stationNom: "Station Nord",
      typeLabel: "Gasoil",
      prixVente: 750,
      margeLitre: 50,
      dateEffetLabel: "15 mai 2026",
    });
    expect(summary.prixAchat).toBe(700);
    expect(summary.stationNom).toBe("Station Nord");
    expect(summary.dateEffetLabel).toBe("15 mai 2026");
  });

  it("calculerPrixAchatCarburant", () => {
    expect(calculerPrixAchatCarburant(751.5, 50.25)).toBeCloseTo(701.25, 2);
  });

  it("hasPrixCarburantPourDate détecte un prix du jour", () => {
    const today = "2026-05-15";
    expect(
      hasPrixCarburantPourDate(
        [
          {
            type_carburant_id: "uuid-gasoil",
            date_effet: "2026-05-15",
          },
        ],
        "uuid-gasoil",
        today,
      ),
    ).toBe(true);
    expect(
      hasPrixCarburantPourDate(
        [{ type_carburant_id: "uuid-gasoil", date_effet: "2026-05-14" }],
        "uuid-gasoil",
        today,
      ),
    ).toBe(false);
  });

  it("getPrixDejaEnregistreAujourdhuiWarning", () => {
    expect(getPrixDejaEnregistreAujourdhuiWarning(false)).toBeNull();
    expect(getPrixDejaEnregistreAujourdhuiWarning(true)).toMatch(/déjà/i);
  });

  it("selectPrixCarburantActifPourDate prend le dernier prix à date_effet ≤ référence", () => {
    const rows = [
      {
        type_carburant_id: "gasoil",
        date_effet: "2026-05-01",
        prix_vente: 700,
        marge_litre: 50,
        prix_achat: 650,
        created_at: "2026-05-01T10:00:00Z",
      },
      {
        type_carburant_id: "gasoil",
        date_effet: "2026-05-10",
        prix_vente: 750,
        marge_litre: 50,
        prix_achat: null,
        created_at: "2026-05-10T12:00:00Z",
      },
      {
        type_carburant_id: "gasoil",
        date_effet: "2026-05-20",
        prix_vente: 800,
        marge_litre: 50,
        prix_achat: 750,
        created_at: "2026-05-20T08:00:00Z",
      },
    ];
    const actif = selectPrixCarburantActifPourDate(rows, "gasoil", "2026-05-15");
    expect(actif?.prixAchat).toBe(700);
    expect(actif?.dateEffet).toBe("2026-05-10");
    expect(
      selectPrixCarburantActifPourDate(rows, "gasoil", "2026-04-30"),
    ).toBeNull();
  });

  it("calculerMontantLigneAchatCarburant", () => {
    expect(calculerMontantLigneAchatCarburant(1000, 701.25)).toBe(701250);
  });
});
