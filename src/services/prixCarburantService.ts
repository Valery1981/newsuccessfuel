import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export type PrixCarburantRow =
  Database["public"]["Tables"]["prix_carburant"]["Row"];

export interface CreatePrixCarburantInput {
  station_id: string;
  type_carburant: string;
  prix_vente: number;
  marge_litre: number;
  date_effet?: string;
}

/**
 * Service prix carburant — §6.5 rules.md.
 * Historisation obligatoire : INSERT uniquement, jamais UPDATE.
 */
export const prixCarburantService = {
  /** Historique complet par station, du plus récent au plus ancien */
  async getHistorique(stationId: string): Promise<PrixCarburantRow[]> {
    const { data, error } = await supabase
      .from("prix_carburant")
      .select("*")
      .eq("station_id", stationId)
      .order("date_effet", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Prix courant (le plus récent) par type de carburant pour une station */
  async getPrixCourants(stationId: string): Promise<PrixCarburantRow[]> {
    const { data, error } = await supabase
      .from("prix_carburant")
      .select("*")
      .eq("station_id", stationId)
      .order("date_effet", { ascending: false });
    if (error) throw error;
    // Garder le plus récent par type_carburant
    const byType = new Map<string, PrixCarburantRow>();
    for (const row of data ?? []) {
      if (!row.type_carburant) continue;
      if (!byType.has(row.type_carburant)) {
        byType.set(row.type_carburant, row);
      }
    }
    return Array.from(byType.values());
  },

  /**
   * Crée une nouvelle entrée datée (INSERT, jamais UPDATE).
   * PA = PV − Marge (calculé automatiquement, jamais saisi — §6.5).
   */
  async create(input: CreatePrixCarburantInput): Promise<PrixCarburantRow> {
    // prix_achat est GENERATED ALWAYS AS (prix_vente - marge_litre) STORED — ne pas l'insérer
    const payload: Database["public"]["Tables"]["prix_carburant"]["Insert"] = {
      station_id: input.station_id,
      type_carburant: input.type_carburant,
      prix_vente: input.prix_vente,
      marge_litre: input.marge_litre,
      date_effet: input.date_effet ?? new Date().toISOString().split("T")[0],
    };
    const { data, error } = await supabase
      .from("prix_carburant")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
