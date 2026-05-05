import { describe, expect, it } from "vitest";

import { buildXlsHtml } from "../exportXls";

describe("buildXlsHtml — APEX-14 (logique pure, sans DOM)", () => {
  it("retourne une chaîne vide si tableau vide", () => {
    expect(buildXlsHtml([])).toBe("");
  });

  it("génère un HTML SpreadsheetML valide avec en-têtes auto-déduits", () => {
    const html = buildXlsHtml([{ nom: "Ali", montant: 1500 }]);
    expect(html).toContain("<th>nom</th>");
    expect(html).toContain("<th>montant</th>");
    expect(html).toContain("<td>Ali</td>");
    expect(html).toContain('<td x:num="1">1500</td>');
  });

  it("respecte les en-têtes explicites fournis", () => {
    const html = buildXlsHtml([{ a: 1, b: 2 }], { headers: ["a"] });
    expect(html).toContain("<th>a</th>");
    expect(html).not.toContain("<th>b</th>");
  });

  it("échappe le HTML pour éviter les injections", () => {
    const html = buildXlsHtml([{ nom: "<script>alert(1)</script>" }]);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("inclut le nom de la feuille via metadata MSO", () => {
    const html = buildXlsHtml([{ a: 1 }], { sheetName: "Bilan 2026" });
    expect(html).toContain("<x:Name>Bilan 2026</x:Name>");
  });

  it("marque les nombres avec x:num='1' (Excel les traite comme numérique)", () => {
    const html = buildXlsHtml([{ n: 42, s: "abc" }]);
    expect(html).toContain('x:num="1">42</td>');
    expect(html).not.toContain('x:num="1">abc</td>');
  });

  it("traite les valeurs null/undefined comme cellules vides", () => {
    const html = buildXlsHtml([{ a: null, b: undefined, c: "ok" }]);
    expect(html).toContain("<td></td>");
    expect(html).toContain("<td>ok</td>");
  });
});
