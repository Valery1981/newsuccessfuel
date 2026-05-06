import { createClient } from "@/utils/supabase/client";
import { subDays } from "date-fns";

const supabase = createClient();

export interface EcartStation {
  station_id: string;
  station_nom: string;
  ecart_total_litres: number;
  ecart_moyen_litres: number;
  nombre_inventaires: number;
  tendance: "amelioration" | "degradation" | "stable";
  dernier_ecart: number;
  dernier_ecart_date: string;
}

export const partnerEcartService = {
  /**
   * Récupère les écarts par station avec tendance sur les 30 derniers jours
   */
  async getEcartsParStation(stationIds: string[]): Promise<EcartStation[]> {
    if (!stationIds.length) return [];

    const depuis30j = subDays(new Date(), 30).toISOString().split("T")[0];

    // Récupérer les écarts d'inventaire
    const { data: lignesInventaire, error } = await supabase
      .from("lignes_inventaire_carburant")
      .select(
        "ecart_litres, inventaires!inner(station_id, date_inventaire, stations(nom))",
      )
      .in("inventaires.station_id", stationIds)
      .gte("inventaires.date_inventaire", depuis30j)
      .order("inventaires.date_inventaire", { ascending: true });

    if (error) throw error;

    // Grouper par station
    const stationMap = new Map<
      string,
      {
        nom: string;
        ecarts: number[];
        dates: string[];
      }
    >();

    for (const row of lignesInventaire ?? []) {
      const r = row as Record<string, unknown>;
      const inv = r.inventaires as Record<string, unknown>;
      const station = inv.stations as { nom: string } | null;
      const stationId = inv.station_id as string;
      const ecart = r.ecart_litres as number;
      const date = inv.date_inventaire as string;

      if (!stationMap.has(stationId)) {
        stationMap.set(stationId, {
          nom: station?.nom ?? "—",
          ecarts: [],
          dates: [],
        });
      }

      const stationData = stationMap.get(stationId)!;
      stationData.ecarts.push(ecart);
      stationData.dates.push(date);
    }

    // Construire les résultats avec tendance
    const resultats: EcartStation[] = [];

    for (const [stationId, data] of stationMap.entries()) {
      const ecarts = data.ecarts;
      const dates = data.dates;

      const ecartTotal = ecarts.reduce((a, b) => a + b, 0);
      const ecartMoyen = ecarts.length > 0 ? ecartTotal / ecarts.length : 0;
      const nombreInventaires = ecarts.length;

      // Calculer la tendance
      let tendance: "amelioration" | "degradation" | "stable" = "stable";
      if (ecarts.length >= 2) {
        const premiereMoitie = ecarts.slice(0, Math.floor(ecarts.length / 2));
        const deuxiemeMoitie = ecarts.slice(Math.floor(ecarts.length / 2));

        const moyennePremiere =
          premiereMoitie.reduce((a, b) => a + b, 0) / premiereMoitie.length;
        const moyenneDeuxieme =
          deuxiemeMoitie.reduce((a, b) => a + b, 0) / deuxiemeMoitie.length;

        const difference = Math.abs(moyennePremiere - moyenneDeuxieme);
        const seuil = Math.abs(moyennePremiere) * 0.2; // 20% de variation

        if (difference > seuil) {
          tendance =
            moyenneDeuxieme < moyennePremiere ? "amelioration" : "degradation";
        }
      }

      const dernierEcart = ecarts[ecarts.length - 1] ?? 0;
      const dernierEcartDate = dates[dates.length - 1] ?? "";

      resultats.push({
        station_id: stationId,
        station_nom: data.nom,
        ecart_total_litres: ecartTotal,
        ecart_moyen_litres: ecartMoyen,
        nombre_inventaires: nombreInventaires,
        tendance,
        dernier_ecart: dernierEcart,
        dernier_ecart_date: dernierEcartDate,
      });
    }

    // Trier par écart total absolu (décroissant)
    return resultats.sort(
      (a, b) => Math.abs(b.ecart_total_litres) - Math.abs(a.ecart_total_litres),
    );
  },
};
