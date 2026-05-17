import { describe, expect, it } from "vitest";

import {
  assertModuleStationScope,
  compteRowMatchesScope,
} from "@/lib/initialisationScope";

describe("initialisationScope", () => {
  it("compteRowMatchesScope distingue créances et dettes (onglet tiers)", () => {
    expect(
      compteRowMatchesScope(
        { onglet: "tiers", numero_compte: "411001" },
        "creances",
      ),
    ).toBe(true);
    expect(
      compteRowMatchesScope(
        { onglet: "tiers", numero_compte: "401001" },
        "creances",
      ),
    ).toBe(false);
    expect(
      compteRowMatchesScope(
        { onglet: "tiers", numero_compte: "401001" },
        "dettes",
      ),
    ).toBe(true);
    expect(
      compteRowMatchesScope(
        { onglet: "tiers", numero_compte: "411001" },
        "dettes",
      ),
    ).toBe(false);
  });

  it("assertModuleStationScope refuse entreprise avec station_id", () => {
    expect(() =>
      assertModuleStationScope("tresorerie", "uuid-station"),
    ).toThrow(/centralisées/);
  });

  it("assertModuleStationScope refuse station sans station_id", () => {
    expect(() => assertModuleStationScope("cuves", null)).toThrow(
      /station_id obligatoire/,
    );
  });

  it("assertModuleStationScope accepte les combinaisons valides", () => {
    expect(() => assertModuleStationScope("cuves", "s1")).not.toThrow();
    expect(() => assertModuleStationScope("tresorerie", null)).not.toThrow();
  });
});
