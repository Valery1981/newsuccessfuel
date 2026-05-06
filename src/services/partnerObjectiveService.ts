import { createClient } from "@/utils/supabase/client";
import {
  differenceInDays,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
} from "date-fns";

const supabase = createClient();

export interface RealisationObjectif {
  station_id: string;
  station_nom: string;
  type: string;
  type_carburant: string | null;
  objectif: number;
  realise: number;
  taux_realisation: number;
  projection_fin_mois: number;
  taux_projection: number;
  jours_ecoules: number;
  jours_total: number;
}

export interface RealisationObjectifAnnuel {
  station_id: string;
  station_nom: string;
  type: string;
  type_carburant: string | null;
  objectif: number;
  realise: number;
  taux_realisation: number;
  projection_fin_annee: number;
  taux_projection: number;
  jours_ecoules: number;
  jours_total: number;
}

export const partnerObjectiveService = {
  /**
   * Récupère les réalisations vs objectifs mensuels avec projection
   */
  async getRealisationsObjectifsMensuel(
    stationIds: string[],
    dateMois: string,
  ): Promise<RealisationObjectif[]> {
    if (!stationIds.length) return [];

    const debutMois = startOfMonth(new Date(dateMois))
      .toISOString()
      .split("T")[0];
    const finMois = endOfMonth(new Date(dateMois)).toISOString().split("T")[0];
    const aujourdHui = new Date();
    const joursEcoules = differenceInDays(aujourdHui, new Date(debutMois)) + 1;
    const joursTotal =
      differenceInDays(new Date(finMois), new Date(debutMois)) + 1;

    // Récupérer les objectifs pour le mois
    const { data: objectifs, error: objError } = await supabase
      .from("objectifs")
      .select("station_id, type, type_carburant, valeur, stations(nom)")
      .in("station_id", stationIds)
      .lte("periode_debut", debutMois)
      .gte("periode_fin", finMois);

    if (objError) throw objError;

    if (!objectifs || objectifs.length === 0) return [];

    // Récupérer les réalisations (ventes carburant)
    const { data: ventesCarburant, error: ventesError } = await supabase
      .from("lignes_shift_carburant")
      .select(
        "type_carburant, volume_vendu, shifts_carburant!inner(station_id, date_shift)",
      )
      .in("shifts_carburant.station_id", stationIds)
      .gte("shifts_carburant.date_shift", debutMois)
      .lte("shifts_carburant.date_shift", finMois);

    if (ventesError) throw ventesError;

    // Grouper les ventes par station et type de carburant
    const ventesMap = new Map<string, Map<string, number>>();
    for (const row of ventesCarburant ?? []) {
      const r = row as Record<string, unknown>;
      const shift = r.shifts_carburant as Record<string, unknown>;
      const stationId = shift.station_id as string;
      const typeCarburant = r.type_carburant as string;
      const volume = r.volume_vendu as number;

      if (!ventesMap.has(stationId)) {
        ventesMap.set(stationId, new Map());
      }
      const stationMap = ventesMap.get(stationId)!;
      stationMap.set(
        typeCarburant,
        (stationMap.get(typeCarburant) ?? 0) + volume,
      );
    }

    // Construire les résultats
    const resultats: RealisationObjectif[] = [];

    for (const obj of objectifs) {
      const r = obj as Record<string, unknown>;
      const station = r.stations as { nom: string } | null;
      const stationId = r.station_id as string;
      const type = r.type as string;
      const typeCarburant = r.type_carburant as string | null;
      const objectif = r.valeur as number;

      let realise = 0;
      if (type === "volume_carburant" && typeCarburant) {
        const stationMap = ventesMap.get(stationId);
        realise = stationMap?.get(typeCarburant) ?? 0;
      }

      const tauxRealisation = objectif > 0 ? (realise / objectif) * 100 : 0;

      // Projection de fin de mois
      const projectionFinMois =
        joursEcoules > 0 ? (realise / joursEcoules) * joursTotal : realise;
      const tauxProjection =
        objectif > 0 ? (projectionFinMois / objectif) * 100 : 0;

      resultats.push({
        station_id: stationId,
        station_nom: station?.nom ?? "—",
        type,
        type_carburant: typeCarburant,
        objectif,
        realise,
        taux_realisation: tauxRealisation,
        projection_fin_mois: projectionFinMois,
        taux_projection: tauxProjection,
        jours_ecoules: joursEcoules,
        jours_total: joursTotal,
      });
    }

    return resultats;
  },

  /**
   * Récupère les réalisations vs objectifs annuels avec projection
   */
  async getRealisationsObjectifsAnnuel(
    stationIds: string[],
    annee: number,
  ): Promise<RealisationObjectifAnnuel[]> {
    if (!stationIds.length) return [];

    const debutAnnee = startOfYear(new Date(annee, 0, 1))
      .toISOString()
      .split("T")[0];
    const finAnnee = endOfYear(new Date(annee, 0, 1))
      .toISOString()
      .split("T")[0];
    const aujourdHui = new Date();
    const joursEcoules = differenceInDays(aujourdHui, new Date(debutAnnee)) + 1;
    const joursTotal =
      differenceInDays(new Date(finAnnee), new Date(debutAnnee)) + 1;

    // Récupérer les objectifs pour l'année
    const { data: objectifs, error: objError } = await supabase
      .from("objectifs")
      .select("station_id, type, type_carburant, valeur, stations(nom)")
      .in("station_id", stationIds)
      .lte("periode_debut", debutAnnee)
      .gte("periode_fin", finAnnee);

    if (objError) throw objError;

    if (!objectifs || objectifs.length === 0) return [];

    // Récupérer les réalisations (ventes carburant) pour l'année
    const { data: ventesCarburant, error: ventesError } = await supabase
      .from("lignes_shift_carburant")
      .select(
        "type_carburant, volume_vendu, shifts_carburant!inner(station_id, date_shift)",
      )
      .in("shifts_carburant.station_id", stationIds)
      .gte("shifts_carburant.date_shift", debutAnnee)
      .lte("shifts_carburant.date_shift", finAnnee);

    if (ventesError) throw ventesError;

    // Grouper les ventes par station et type de carburant
    const ventesMap = new Map<string, Map<string, number>>();
    for (const row of ventesCarburant ?? []) {
      const r = row as Record<string, unknown>;
      const shift = r.shifts_carburant as Record<string, unknown>;
      const stationId = shift.station_id as string;
      const typeCarburant = r.type_carburant as string;
      const volume = r.volume_vendu as number;

      if (!ventesMap.has(stationId)) {
        ventesMap.set(stationId, new Map());
      }
      const stationMap = ventesMap.get(stationId)!;
      stationMap.set(
        typeCarburant,
        (stationMap.get(typeCarburant) ?? 0) + volume,
      );
    }

    // Construire les résultats
    const resultats: RealisationObjectifAnnuel[] = [];

    for (const obj of objectifs) {
      const r = obj as Record<string, unknown>;
      const station = r.stations as { nom: string } | null;
      const stationId = r.station_id as string;
      const type = r.type as string;
      const typeCarburant = r.type_carburant as string | null;
      const objectif = r.valeur as number;

      let realise = 0;
      if (type === "volume_carburant" && typeCarburant) {
        const stationMap = ventesMap.get(stationId);
        realise = stationMap?.get(typeCarburant) ?? 0;
      }

      const tauxRealisation = objectif > 0 ? (realise / objectif) * 100 : 0;

      // Projection de fin d'année
      const projectionFinAnnee =
        joursEcoules > 0 ? (realise / joursEcoules) * joursTotal : realise;
      const tauxProjection =
        objectif > 0 ? (projectionFinAnnee / objectif) * 100 : 0;

      resultats.push({
        station_id: stationId,
        station_nom: station?.nom ?? "—",
        type,
        type_carburant: typeCarburant,
        objectif,
        realise,
        taux_realisation: tauxRealisation,
        projection_fin_annee: projectionFinAnnee,
        taux_projection: tauxProjection,
        jours_ecoules: joursEcoules,
        jours_total: joursTotal,
      });
    }

    return resultats;
  },
};
