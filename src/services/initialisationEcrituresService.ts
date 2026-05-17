import type { InitialisationLigneANouveau, InitialisationModule } from "@/lib/initialisationCompta";
import { validateLignesInitialisation } from "@/lib/initialisationCompta";
import { assertModuleStationScope } from "@/lib/initialisationScope";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface BilanOuverture {
  fuel: number;
  boutique: number;
  treasury: number;
  receivable: number;
  payable: number;
  /** Immobilisations (classe 2) */
  asset: number;
  totalActif: number;
  totalPassif: number;
  capitalNet: number;
}

function normalizeBilanOuverture(raw: Record<string, unknown>): BilanOuverture {
  const num = (key: string) => {
    const v = raw[key];
    return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
  };
  return {
    fuel: num("fuel"),
    boutique: num("boutique"),
    treasury: num("treasury"),
    receivable: num("receivable"),
    payable: num("payable"),
    asset: num("fixed_assets") || num("asset"),
    totalActif: num("totalActif"),
    totalPassif: num("totalPassif"),
    capitalNet: num("capitalNet"),
  };
}

export const initialisationEcrituresService = {
  /** Reconstruit l'écriture d'ouverture globale (une seule pièce, une seule ligne 101). */
  async rebuildOuvertureGlobale(params: {
    initialisationId: string;
    entrepriseId: string;
    dateOuverture: string;
    createdBy: string | null;
  }): Promise<number> {
    const { data, error } = await supabase.rpc(
      "rebuild_initialisation_ouverture_globale",
      {
        p_initialisation_id: params.initialisationId,
        p_entreprise_id: params.entrepriseId,
        p_date_ouverture: params.dateOuverture,
        p_created_by: params.createdBy,
      },
    );
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async syncANouveau(params: {
    initialisationId: string;
    entrepriseId: string;
    module: InitialisationModule;
    stationId: string | null;
    dateOuverture: string;
    createdBy: string | null;
    lignes: InitialisationLigneANouveau[];
  }): Promise<number> {
    assertModuleStationScope(params.module, params.stationId);
    validateLignesInitialisation(params.module, params.lignes);
    const { data, error } = await supabase.rpc("sync_initialisation_a_nouveau", {
      p_initialisation_id: params.initialisationId,
      p_entreprise_id: params.entrepriseId,
      p_module: params.module,
      p_station_id: params.stationId,
      p_date_ouverture: params.dateOuverture,
      p_created_by: params.createdBy,
      p_lignes: params.lignes,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async getBilanOuverture(initialisationId: string): Promise<BilanOuverture> {
    const { data, error } = await supabase.rpc(
      "get_initialisation_bilan_ouverture",
      { p_initialisation_id: initialisationId },
    );
    if (error) throw error;
    return normalizeBilanOuverture(
      (data ?? {}) as Record<string, unknown>,
    );
  },

  async syncStockBoutique(
    initialisationId: string,
    stationId: string,
    entrepriseId: string,
    createdBy: string | null,
  ): Promise<number> {
    const { data, error } = await supabase.rpc(
      "sync_initialisation_stock_boutique",
      {
        p_initialisation_id: initialisationId,
        p_station_id: stationId,
        p_entreprise_id: entrepriseId,
        p_created_by: createdBy,
      },
    );
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async syncCuvesStock(
    initialisationId: string,
    stationId: string,
    entrepriseId: string,
  ): Promise<number> {
    const { data, error } = await supabase.rpc("sync_initialisation_cuves_stock", {
      p_initialisation_id: initialisationId,
      p_station_id: stationId,
      p_entreprise_id: entrepriseId,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async syncIndexPistolets(
    initialisationId: string,
    stationId: string,
    entrepriseId: string,
  ): Promise<number> {
    const { data, error } = await supabase.rpc(
      "sync_initialisation_index_pistolets",
      {
        p_initialisation_id: initialisationId,
        p_station_id: stationId,
        p_entreprise_id: entrepriseId,
      },
    );
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async validerLock(
    initialisationId: string,
    entrepriseId: string,
    compteId: string,
  ) {
    const { data, error } = await supabase.rpc("valider_initialisation_lock", {
      p_initialisation_id: initialisationId,
      p_entreprise_id: entrepriseId,
      p_compte_id: compteId,
    });
    if (error) throw error;
    return data;
  },

  async getPrixAchatCourant(
    stationId: string,
    typeCarburant: string | null,
    typeCarburantId: string | null,
  ): Promise<number> {
    let query = supabase
      .from("prix_carburant")
      .select("prix_vente, marge_litre")
      .eq("station_id", stationId)
      .order("date_effet", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (typeCarburantId) {
      query = query.eq("type_carburant_id", typeCarburantId);
    } else if (typeCarburant) {
      query = query.eq("type_carburant", typeCarburant);
    } else {
      return 0;
    }

    const { data } = await query.maybeSingle();
    if (!data) return 0;
    return Math.max(0, data.prix_vente - data.marge_litre);
  },
};
