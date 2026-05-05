import { describe, expect, it } from "vitest";

import { computeBalance } from "../PartieDoubleCheck";

describe("computeBalance — partie double §6.1", () => {
  it("équilibre exact", () => {
    const r = computeBalance([100, 50], [75, 75]);
    expect(r.isBalanced).toBe(true);
    expect(r.diff).toBe(0);
    expect(r.sumDebits).toBe(150);
    expect(r.sumCredits).toBe(150);
  });

  it("déséquilibre détecté", () => {
    const r = computeBalance([100], [90]);
    expect(r.isBalanced).toBe(false);
    expect(r.diff).toBe(10);
  });

  it("tolère les arrondis monétaires jusqu'au centime", () => {
    const r = computeBalance([100.005], [100]);
    expect(r.isBalanced).toBe(true);
  });

  it("rejette les écarts > 1 centime par défaut", () => {
    const r = computeBalance([100.02], [100]);
    expect(r.isBalanced).toBe(false);
  });

  it("accepte une tolérance custom", () => {
    const r = computeBalance([100.5], [100], 1);
    expect(r.isBalanced).toBe(true);
  });

  it("ignore les NaN / undefined — traités comme 0", () => {
    const r = computeBalance([NaN, 100], [100]);
    expect(r.isBalanced).toBe(true);
  });

  it("tableaux vides → équilibré à 0", () => {
    const r = computeBalance([], []);
    expect(r.isBalanced).toBe(true);
    expect(r.sumDebits).toBe(0);
  });

  it("débit seul sans crédit → non équilibré", () => {
    const r = computeBalance([100], []);
    expect(r.isBalanced).toBe(false);
    expect(r.diff).toBe(100);
  });
});
