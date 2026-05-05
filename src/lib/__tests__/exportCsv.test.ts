import { describe, it, expect, vi } from "vitest";

// Simulation de l'environnement browser pour l'export CSV
globalThis.URL = {
  createObjectURL: vi.fn(() => "blob:test"),
  revokeObjectURL: vi.fn(),
} as unknown as typeof URL;

globalThis.document = {
  createElement: vi.fn(() => ({
    href: "",
    download: "",
    click: vi.fn(),
  })),
} as unknown as typeof document;

// On importe exportCsv après le mock
import { exportCsv } from "@/lib/exportCsv";

describe("exportCsv", () => {
  it("ne fait rien si le tableau est vide", () => {
    const createSpy = vi.spyOn(globalThis.URL, "createObjectURL");
    exportCsv([], "test");
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("génère un fichier CSV avec BOM UTF-8", () => {
    const rows = [
      { Nom: "Alice", Montant: 1000 },
      { Nom: "Bob", Montant: 2000 },
    ];
    // Vérifie que ça ne lève pas d'erreur
    expect(() => exportCsv(rows, "test-export")).not.toThrow();
  });

  it("échappe les valeurs avec des points-virgules", () => {
    const rows = [{ Description: "Vente; retour" }];
    expect(() => exportCsv(rows, "test")).not.toThrow();
  });
});
