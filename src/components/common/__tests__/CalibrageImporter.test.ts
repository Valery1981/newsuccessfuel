import { describe, expect, it } from "vitest";

import { parseCalibrageText } from "../CalibrageImporter";

describe("parseCalibrageText — §6.6 rules.md", () => {
  it("parse format tabulé classique", () => {
    const out = parseCalibrageText("0\t0\n10\t150\n20\t320");
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ hauteur_cm: 0, volume_litres: 0 });
    expect(out[2]).toMatchObject({ hauteur_cm: 20, volume_litres: 320 });
    expect(out.every((p) => !p.errors || p.errors.length === 0)).toBe(true);
  });

  it("parse CSV avec virgule décimale FR", () => {
    const out = parseCalibrageText("0;0\n10,5;150,75");
    expect(out[1]).toMatchObject({ hauteur_cm: 10.5, volume_litres: 150.75 });
  });

  it("détecte volumes non strictement croissants", () => {
    const out = parseCalibrageText("0\t0\n10\t100\n20\t100");
    expect(out[2].errors).toBeDefined();
    expect(out[2].errors!.some((e) => /croissant/i.test(e))).toBe(true);
  });

  it("détecte hauteurs en doublon", () => {
    const out = parseCalibrageText("0\t0\n10\t100\n10\t200");
    expect(out[2].errors!.some((e) => /Hauteur 10 déjà/.test(e))).toBe(true);
  });

  it("détecte volumes en doublon", () => {
    const out = parseCalibrageText("0\t0\n10\t100\n20\t100");
    expect(out[2].errors!.some((e) => /Volume 100 déjà/.test(e))).toBe(true);
  });

  it("ignore lignes vides et commentaires", () => {
    const out = parseCalibrageText("# en-tête\n\n0\t0\n# commentaire\n10\t150");
    expect(out).toHaveLength(2);
  });

  it("ligne illisible signalée mais ne bloque pas le reste (§6.6 autocomplétion)", () => {
    const out = parseCalibrageText("0\t0\nABCDE\n10\t150");
    expect(out).toHaveLength(3);
    expect(out[1].errors).toBeDefined();
    expect(out[2]).toMatchObject({ hauteur_cm: 10, volume_litres: 150 });
  });
});
