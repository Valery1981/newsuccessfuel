import {
  calculerPrixAchatCarburant,
  selectPrixCarburantActifPourDate,
  type PrixAchatCarburantResolu,
} from "@/lib/prixCarburant";
import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export type PrixCarburantRow =
  Database["public"]["Tables"]["prix_carburant"]["Row"];

export interface CreatePrixCarburantInput {
  station_id: string;
  /** Libellé legacy (compat) — laissé en option, le trigger DB le dérive depuis type_carburant_id si absent. */
  type_carburant?: string;
  /** UUID du type carburant (référentiel types_carburant). Recommandé. */
  type_carburant_id?: string;
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
      .order("date_effet", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Prix courant (le plus récent) par type de carburant pour une station */
  async getPrixCourants(stationId: string): Promise<PrixCarburantRow[]> {
    const { data, error } = await supabase
      .from("prix_carburant")
      .select("*")
      .eq("station_id", stationId)
      .order("date_effet", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    const byType = new Map<string, PrixCarburantRow>();
    for (const row of data ?? []) {
      const key = row.type_carburant_id ?? row.type_carburant;
      if (!key || byType.has(key)) continue;
      byType.set(key, row);
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
      type_carburant: input.type_carburant ?? null,
      type_carburant_id: input.type_carburant_id ?? null,
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

  /**
   * Prix d'achat actif pour un achat carburant (Structure > Prix carburant).
   * Dernier enregistrement avec date_effet ≤ dateReference.
   */
  async getPrixAchatActif(params: {
    stationId: string;
    typeCarburantId: string;
    dateReference: string;
  }): Promise<PrixAchatCarburantResolu | null> {
    const dateRef = params.dateReference.slice(0, 10);
    const { data, error } = await supabase
      .from("prix_carburant")
      .select(
        "type_carburant_id, date_effet, prix_vente, marge_litre, prix_achat, created_at",
      )
      .eq("station_id", params.stationId)
      .eq("type_carburant_id", params.typeCarburantId)
      .lte("date_effet", dateRef)
      .order("date_effet", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const prixAchat =
      data.prix_achat != null && Number.isFinite(data.prix_achat)
        ? data.prix_achat
        : calculerPrixAchatCarburant(data.prix_vente, data.marge_litre);
    if (prixAchat <= 0) return null;
    return {
      prixAchat,
      prixVente: data.prix_vente,
      margeLitre: data.marge_litre,
      dateEffet: data.date_effet.slice(0, 10),
    };
  },

  /** Historique filtré puis résolution locale (tests / batch). */
  async resolvePrixAchatDepuisHistorique(params: {
    stationId: string;
    typeCarburantId: string;
    dateReference: string;
  }): Promise<PrixAchatCarburantResolu | null> {
    const rows = await this.getHistorique(params.stationId);
    return selectPrixCarburantActifPourDate(
      rows,
      params.typeCarburantId,
      params.dateReference,
    );
  },
};
