import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests pour typesCarburantService.
 * On mocke @/utils/supabase/client pour valider la logique sans réseau.
 */

const mockChain = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
};

// Helper pour réinitialiser le chain et faire qu'il retourne lui-même
function resetChain() {
  Object.values(mockChain).forEach((fn) => fn.mockReset());
  for (const key of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
  ] as const) {
    mockChain[key].mockReturnValue(mockChain);
  }
}

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: vi.fn(() => mockChain),
  }),
}));

import { typesCarburantService } from "../typesCarburantService";

describe("typesCarburantService", () => {
  beforeEach(() => {
    resetChain();
  });

  it("create normalise le code en majuscules et trim le label", async () => {
    const fakeRow = {
      id: "uuid-1",
      code: "DIESEL",
      label: "Diesel",
      partenaire_id: null,
      compte_stock: "320",
      compte_vente: "702",
      ordre: 0,
      actif: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      created_by: null,
    };
    mockChain.single.mockResolvedValue({ data: fakeRow, error: null });

    const result = await typesCarburantService.create({
      code: " diesel ",
      label: "  Diesel  ",
      compte_stock: "320",
      compte_vente: "702",
    });

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "DIESEL",
        label: "Diesel",
        partenaire_id: null,
      }),
    );
    expect(result).toEqual(fakeRow);
  });

  it("setActif délègue à update avec le bon flag", async () => {
    const fakeRow = { id: "uuid-2", actif: false };
    mockChain.single.mockResolvedValue({ data: fakeRow, error: null });

    const result = await typesCarburantService.setActif("uuid-2", false);

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ actif: false }),
    );
    expect(result).toEqual(fakeRow);
  });

  it("propage l'erreur Supabase sur create", async () => {
    mockChain.single.mockResolvedValue({
      data: null,
      error: { message: "duplicate key" },
    });

    await expect(
      typesCarburantService.create({
        code: "ESSENCE",
        label: "Essence",
        compte_stock: "310",
        compte_vente: "701",
      }),
    ).rejects.toMatchObject({ message: "duplicate key" });
  });
});
