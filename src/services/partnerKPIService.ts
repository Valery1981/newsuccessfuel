import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface AchatCarburantParProduit {
  type_carburant: string;
  volume_litres: number;
}

export interface VenteCarburantParProduit {
  type_carburant: string;
  volume_litres: number;
}

export interface AchatLubrifiants {
  volume_litres: number;
}

export interface DoleancesOuvertes {
  count: number;
}

export const partnerKPIService = {
  /**
   * Récupère le total d'achat de carburant par produit depuis le début du mois
   */
  async getAchatsCarburantMois(
    stationIds: string[],
    dateDebut: string,
  ): Promise<AchatCarburantParProduit[]> {
    if (!stationIds.length) return [];

    const { data, error } = await supabase
      .from("lignes_bc_carburant")
      .select(
        "type_carburant, quantite_commandee, achats_carburant!inner(date_livraison)",
      )
      .in("station_id", stationIds)
      .gte("achats_carburant.date_livraison", dateDebut)
      .in("achats_carburant.statut", ["recu", "mouvemente"]);

    if (error) throw error;

    const grouped = new Map<string, number>();
    for (const row of data ?? []) {
      const type = row.type_carburant;
      const quantite = row.quantite_commandee ?? 0;
      grouped.set(type, (grouped.get(type) ?? 0) + quantite);
    }

    return Array.from(grouped.entries()).map(
      ([type_carburant, volume_litres]) => ({
        type_carburant,
        volume_litres,
      }),
    );
  },

  /**
   * Récupère le total de ventes de carburant par produit depuis le début du mois
   */
  async getVentesCarburantMois(
    stationIds: string[],
    dateDebut: string,
  ): Promise<VenteCarburantParProduit[]> {
    if (!stationIds.length) return [];

    const { data, error } = await supabase
      .from("lignes_shift_carburant")
      .select(
        "type_carburant, volume_vendu, shifts_carburant!inner(date_shift)",
      )
      .in("shifts_carburant.station_id", stationIds)
      .gte("shifts_carburant.date_shift", dateDebut);

    if (error) throw error;

    const grouped = new Map<string, number>();
    for (const row of data ?? []) {
      const type = row.type_carburant;
      const volume = row.volume_vendu ?? 0;
      grouped.set(type, (grouped.get(type) ?? 0) + volume);
    }

    return Array.from(grouped.entries()).map(
      ([type_carburant, volume_litres]) => ({
        type_carburant,
        volume_litres,
      }),
    );
  },

  /**
   * Récupère le total d'achat de lubrifiants depuis le début du mois
   */
  async getAchatsLubrifiantsMois(
    stationIds: string[],
    dateDebut: string,
  ): Promise<AchatLubrifiants> {
    if (!stationIds.length) return { volume_litres: 0 };

    const { data, error } = await supabase
      .from("lignes_achat_boutique")
      .select(
        "quantite, articles!inner(famille), achats_boutique!inner(date_facture)",
      )
      .in("achats_boutique.station_id", stationIds)
      .gte("achats_boutique.date_facture", dateDebut)
      .eq("articles.famille", "lubrifiants");

    if (error) throw error;

    const total = (data ?? []).reduce((sum, row) => {
      return sum + (row.quantite ?? 0);
    }, 0);

    return { volume_litres: total };
  },

  /**
   * Récupère le nombre de doléances ouvertes
   */
  async getDoleancesOuvertes(stationIds: string[]): Promise<DoleancesOuvertes> {
    if (!stationIds.length) return { count: 0 };

    const { data, error } = await supabase
      .from("doleances")
      .select("id")
      .in("station_id", stationIds)
      .in("statut", ["envoyee", "prise_en_charge"]);

    if (error) throw error;

    return { count: data?.length ?? 0 };
  },
};
