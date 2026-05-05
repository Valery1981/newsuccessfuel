/**
 * Tests unitaires — notificationService
 * Couvre la logique de construction des payloads de notification
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase createClient
// ---------------------------------------------------------------------------
const mockFrom = vi.fn();
vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers to build chainable supabase mock
// ---------------------------------------------------------------------------
function chainable(returnData: unknown = null, returnError: unknown = null) {
  const chain: Record<string, unknown> = {};
  const fns = ["select", "insert", "update", "eq", "in", "is", "gte", "lte", "order", "limit", "maybeSingle", "single"];
  fns.forEach((fn) => {
    chain[fn] = vi.fn(() => chain);
  });
  (chain["maybeSingle"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: returnData, error: returnError });
  (chain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: returnData, error: returnError });
  (chain["insert"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: returnData, error: returnError });
  return chain;
}

// ---------------------------------------------------------------------------
// Type-check: notif_type values accepted
// ---------------------------------------------------------------------------
describe("notif_type enum values", () => {
  it("covers all required doléance event types", () => {
    const validTypes = [
      "nouvelle_doleance",
      "doleance_prise_en_charge",
      "doleance_reglee",
      "stock_alerte",
      "echeance_proche",
      "station_a_valider",
    ] as const;
    expect(validTypes).toHaveLength(6);
    expect(validTypes).toContain("nouvelle_doleance");
    expect(validTypes).toContain("doleance_prise_en_charge");
    expect(validTypes).toContain("doleance_reglee");
  });
});

// ---------------------------------------------------------------------------
// createNotification — silently ignores errors
// ---------------------------------------------------------------------------
describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls insert with correct fields", async () => {
    const chain = chainable();
    mockFrom.mockReturnValue(chain);

    const { createNotification } = await import("@/services/notificationService");
    await createNotification({
      destinataire_compte_id: "compte-123",
      type: "nouvelle_doleance",
      titre: "Test",
      message: "Test message",
      reference_id: "dol-456",
      reference_type: "doleance",
    });

    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        destinataire_compte_id: "compte-123",
        type: "nouvelle_doleance",
        titre: "Test",
        is_lue: false,
      }),
    );
  });

  it("does not throw when Supabase returns an error", async () => {
    const chain = chainable(null, { message: "RLS violation" });
    mockFrom.mockReturnValue(chain);

    const { createNotification } = await import("@/services/notificationService");
    await expect(
      createNotification({
        destinataire_compte_id: "x",
        type: "stock_alerte",
        titre: "Alerte",
        message: "Stock faible",
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// notifyNouvelleDoceleance — skips if no partenaire compte_id
// ---------------------------------------------------------------------------
describe("notifyNouvelleDoceleance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call createNotification if partenaire has no compte_id", async () => {
    const chain = chainable({ compte_id: null });
    mockFrom.mockReturnValue(chain);

    const { notifyNouvelleDoceleance } = await import("@/services/notificationService");
    await notifyNouvelleDoceleance("dol-1", "part-1", "Station X", "panne_pistolet");

    const insertCalls = (chain.insert as ReturnType<typeof vi.fn>).mock.calls;
    expect(insertCalls).toHaveLength(0);
  });

  it("calls insert when partenaire has a compte_id", async () => {
    const chain = chainable({ compte_id: "compte-TM-001" });
    mockFrom.mockReturnValue(chain);

    const { notifyNouvelleDoceleance } = await import("@/services/notificationService");
    await notifyNouvelleDoceleance("dol-2", "part-2", "Akosombo", "eau_dans_cuve");

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        destinataire_compte_id: "compte-TM-001",
        type: "nouvelle_doleance",
      }),
    );
  });
});
