import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface StockLevel {
  station_id: string;
  station_nom: string;
  cuve_id: string;
  cuve_nom: string;
  type_carburant: string;
  stock_actuel_litres: number;
  capacite_max: number;
  seuil_alerte: number;
  pourcentage_remplissage: number;
  en_alerte: boolean;
}

export const partnerStockService = {
  /**
   * Récupère le niveau de stock par station et par produit avec seuils d'alerte
   * Note: seuil_alerte est calculé comme 20% de la capacité maximale
   */
  async getStocksParStation(stationIds: string[]): Promise<StockLevel[]> {
    if (!stationIds.length) return [];

    const { data, error } = await supabase
      .from("cuves")
      .select(
        "id, nom, type_carburant, stock_actuel_litres, capacite_max, stations!inner(id, nom)",
      )
      .in("station_id", stationIds);

    if (error) throw error;

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const station = r.stations as { id: string; nom: string };
      const stockActuel = r.stock_actuel_litres as number | null;
      const capaciteMax = r.capacite_max as number | null;

      // Calcul du seuil d'alerte (20% de la capacité)
      const seuilAlerte = capaciteMax ? capaciteMax * 0.2 : 0;

      const pourcentageRemplissage =
        capaciteMax && capaciteMax > 0
          ? ((stockActuel ?? 0) / capaciteMax) * 100
          : 0;

      const enAlerte = stockActuel !== null && stockActuel <= seuilAlerte;

      return {
        station_id: station.id,
        station_nom: station.nom,
        cuve_id: r.id as string,
        cuve_nom: r.nom as string,
        type_carburant: r.type_carburant as string,
        stock_actuel_litres: stockActuel ?? 0,
        capacite_max: capaciteMax ?? 0,
        seuil_alerte: seuilAlerte,
        pourcentage_remplissage: pourcentageRemplissage,
        en_alerte: enAlerte,
      };
    });
  },
};
