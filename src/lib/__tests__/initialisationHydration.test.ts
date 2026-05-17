import { describe, expect, it } from "vitest";
import {
  mapStagingComptesToState,
  mapStagingCuvesToState,
  mapStagingPistoletsToState,
} from "@/lib/initialisationHydration";

describe("initialisationHydration", () => {
  it("mapStagingCuvesToState filtre par station", () => {
    const state = mapStagingCuvesToState(
      [
        {
          cuve_id: "c1",
          station_id: "s1",
          jauge_initiale_cm: 120,
          volume_initial_litres: 5000,
          prix_achat_initial: 4500,
        },
        {
          cuve_id: "c2",
          station_id: "s2",
          jauge_initiale_cm: 80,
          volume_initial_litres: 3000,
          prix_achat_initial: 4200,
        },
      ],
      "s1",
    );
    expect(state.c1).toEqual({
      jauge_cm: "120",
      volume_litres: "5000",
      prix_achat: "4500",
    });
    expect(state.c2).toBeUndefined();
  });

  it("mapStagingPistoletsToState recharge les index", () => {
    const state = mapStagingPistoletsToState(
      [
        {
          pistolet_id: "p1",
          station_id: "s1",
          index_initial: 12345,
        },
      ],
      "s1",
    );
    expect(state.p1).toBe("12345");
  });

  it("mapStagingComptesToState sépare créances et dettes", () => {
    const state = mapStagingComptesToState([
      {
        onglet: "tiers",
        numero_compte: "411-001",
        solde_debit: 1000,
        solde_credit: 0,
        tiers_id: "t-client",
        tresorerie_id: null,
      },
      {
        onglet: "tiers",
        numero_compte: "401-001",
        solde_debit: 0,
        solde_credit: 500,
        tiers_id: "t-fourn",
        tresorerie_id: null,
      },
      {
        onglet: "autres_dettes",
        numero_compte: "421",
        solde_debit: 0,
        solde_credit: 200,
        tiers_id: null,
        tresorerie_id: null,
      },
    ]);
    expect(state.creancesSoldes["t-client"]).toBe("1000");
    expect(state.dettesSoldes["t-fourn"]).toBe("500");
    expect(state.dettesComptesSoldes["421"]).toBe("200");
  });
});
