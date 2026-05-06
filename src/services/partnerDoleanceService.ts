import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface DoleanceStats {
  total: number;
  envoyees: number;
  prises_en_charge: number;
  reglees: number;
  en_cours: number;
  delai_moyen_resolution_heures: number;
  delai_moyen_prise_en_charge_heures: number;
}

export interface DoleanceStatsParType {
  type_incident: string;
  total: number;
  reglees: number;
  taux_resolution: number;
}

export const partnerDoleanceService = {
  /**
   * Récupère les statistiques globales de doléances pour un partenaire
   */
  async getDoleancesStats(stationIds: string[]): Promise<DoleanceStats> {
    if (!stationIds.length) {
      return {
        total: 0,
        envoyees: 0,
        prises_en_charge: 0,
        reglees: 0,
        en_cours: 0,
        delai_moyen_resolution_heures: 0,
        delai_moyen_prise_en_charge_heures: 0,
      };
    }

    const { data, error } = await supabase
      .from("doleances")
      .select("statut, delai_resolution_minutes, delai_prise_en_charge_minutes")
      .in("station_id", stationIds);

    if (error) throw error;

    const total = data?.length ?? 0;
    const envoyees = data?.filter((d) => d.statut === "envoyee").length ?? 0;
    const prisesEnCharge =
      data?.filter((d) => d.statut === "prise_en_charge").length ?? 0;
    const reglees = data?.filter((d) => d.statut === "reglee").length ?? 0;
    const enCours = envoyees + prisesEnCharge; // Doléances non résolues

    // Calculer les délais moyens
    const delaisResolution =
      data
        ?.map((d) => d.delai_resolution_minutes)
        .filter((d): d is number => d !== null) ?? [];
    const delaiMoyenResolution =
      delaisResolution.length > 0
        ? delaisResolution.reduce((a, b) => a + b, 0) /
          delaisResolution.length /
          60
        : 0;

    const delaisPriseEnCharge =
      data
        ?.map((d) => d.delai_prise_en_charge_minutes)
        .filter((d): d is number => d !== null) ?? [];
    const delaiMoyenPriseEnCharge =
      delaisPriseEnCharge.length > 0
        ? delaisPriseEnCharge.reduce((a, b) => a + b, 0) /
          delaisPriseEnCharge.length /
          60
        : 0;

    return {
      total,
      envoyees,
      prises_en_charge: prisesEnCharge,
      reglees,
      en_cours: enCours,
      delai_moyen_resolution_heures: delaiMoyenResolution,
      delai_moyen_prise_en_charge_heures: delaiMoyenPriseEnCharge,
    };
  },

  /**
   * Récupère les statistiques de doléances par type d'incident
   */
  async getDoleancesStatsParType(
    stationIds: string[],
  ): Promise<DoleanceStatsParType[]> {
    if (!stationIds.length) return [];

    const { data, error } = await supabase
      .from("doleances")
      .select("type_incident, statut")
      .in("station_id", stationIds);

    if (error) throw error;

    // Grouper par type d'incident
    const typeMap = new Map<string, { total: number; reglees: number }>();

    for (const row of data ?? []) {
      const type = row.type_incident ?? "Autre";
      if (!typeMap.has(type)) {
        typeMap.set(type, { total: 0, reglees: 0 });
      }
      const stats = typeMap.get(type)!;
      stats.total++;
      if (row.statut === "reglee") {
        stats.reglees++;
      }
    }

    return Array.from(typeMap.entries())
      .map(([type_incident, stats]) => ({
        type_incident,
        total: stats.total,
        reglees: stats.reglees,
        taux_resolution:
          stats.total > 0 ? (stats.reglees / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  },
};
