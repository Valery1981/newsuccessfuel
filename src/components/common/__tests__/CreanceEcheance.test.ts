import { describe, expect, it } from "vitest";

import { computeEcheanceSeverity } from "../CreanceEcheance";

describe("computeEcheanceSeverity — §4 rules.md", () => {
  const now = new Date("2026-05-05T12:00:00Z");

  it("date passée → dépassée", () => {
    expect(computeEcheanceSeverity("2026-05-04", now)).toBe("depasse");
  });

  it("< 7 jours → urgent", () => {
    expect(computeEcheanceSeverity("2026-05-10", now)).toBe("urgent");
  });

  it("exactement 7 jours → normal (limite haute)", () => {
    expect(computeEcheanceSeverity("2026-05-12T12:00:00Z", now)).toBe("normal");
  });

  it("> 7 jours → normal", () => {
    expect(computeEcheanceSeverity("2026-06-01", now)).toBe("normal");
  });

  it("aujourd'hui à même heure → urgent (0 < 7)", () => {
    expect(computeEcheanceSeverity(now, now)).toBe("urgent");
  });
});
