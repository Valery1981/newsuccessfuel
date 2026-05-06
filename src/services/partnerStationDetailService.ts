import { createClient } from "@/utils/supabase/client";
import { startOfMonth, startOfYear, subDays } from "date-fns";

const supabase = createClient();

export interface StationDetail {
  station: {
    id: string;
    nom: string;
    adresse: string | null;
    telephone: string | null;
  };
  volumes: {
    mois_courant: number;
    mois_precedent: number;
    annee_courante: number;
  };
  stocks: {
    carburants: Array<{
      type: string;
      stock_actuel: number;
      capacite: number;
      pourcentage: number;
      seuil_alerte: number;
    }>;
  };
  objectifs: {
    mensuel: {
      objectif: number;
      realise: number;
      taux: number;
      projection: number;
    } | null;
    annuel: {
      objectif: number;
      realise: number;
      taux: number;
      projection: number;
    } | null;
  };
  ecarts: {
    total_30j: number;
    moyen_30j: number;
    tendance: "amelioration" | "degradation" | "stable";
  };
  doleances: {
    total: number;
    ouvertes: number;
    resolues: number;
    taux_resolution: number;
  };
}

export async function getStationDetail(
  stationId: string,
): Promise<StationDetail> {
  const aujourd_hui = new Date();
  const debutMois = startOfMonth(aujourd_hui);
  const debutMoisPrecedent = startOfMonth(subDays(aujourd_hui, 30));
  const debutAnnee = startOfYear(aujourd_hui);
  const depuis30j = subDays(aujourd_hui, 30);

  // Récupérer les infos de la station
  const { data: station } = await supabase
    .from("stations")
    .select("id, nom, adresse, telephone")
    .eq("id", stationId)
    .single();

  if (!station) {
    throw new Error("Station non trouvée");
  }

  // Volumes
  const [volMois, volMoisPrec, volAnnee] = await Promise.all([
    supabase
      .from("lignes_shift_carburant")
      .select("volume_vendu")
      .eq("shifts_carburant.station_id", stationId)
      .gte(
        "shifts_carburant.date_shift",
        debutMois.toISOString().split("T")[0],
      ),
    supabase
      .from("lignes_shift_carburant")
      .select("volume_vendu")
      .eq("shifts_carburant.station_id", stationId)
      .gte(
        "shifts_carburant.date_shift",
        debutMoisPrecedent.toISOString().split("T")[0],
      )
      .lt("shifts_carburant.date_shift", debutMois.toISOString().split("T")[0]),
    supabase
      .from("lignes_shift_carburant")
      .select("volume_vendu")
      .eq("shifts_carburant.station_id", stationId)
      .gte(
        "shifts_carburant.date_shift",
        debutAnnee.toISOString().split("T")[0],
      ),
  ]);

  const volumeMoisCourant =
    volMois.data?.reduce((sum, row) => sum + (row.volume_vendu || 0), 0) || 0;
  const volumeMoisPrecedent =
    volMoisPrec.data?.reduce((sum, row) => sum + (row.volume_vendu || 0), 0) ||
    0;
  const volumeAnneeCourante =
    volAnnee.data?.reduce((sum, row) => sum + (row.volume_vendu || 0), 0) || 0;

  // Stocks
  const { data: stocks } = await supabase
    .from("reservoirs")
    .select("id, type_carburant, capacite")
    .eq("station_id", stationId);

  const stocksDetail = await Promise.all(
    (stocks || []).map(async (reservoir) => {
      const { data: lignes } = await supabase
        .from("lignes_inventaire_carburant")
        .select("volume_reel_litres")
        .eq("cuve_id", reservoir.id)
        .order("inventaires(date_inventaire)", { ascending: false })
        .limit(1)
        .single();

      const stockActuel = lignes?.volume_reel_litres || 0;
      const capacite = reservoir.capacite || 10000;
      const pourcentage = capacite > 0 ? (stockActuel / capacite) * 100 : 0;
      const seuilAlerte = capacite * 0.2;

      return {
        type: reservoir.type_carburant || "Inconnu",
        stock_actuel: stockActuel,
        capacite,
        pourcentage,
        seuil_alerte: seuilAlerte,
      };
    }),
  );

  // Objectifs
  const [objMensuel, objAnnuel] = await Promise.all([
    supabase
      .from("objectifs")
      .select("valeur")
      .eq("station_id", stationId)
      .eq("type", "volume")
      .lte("periode_debut", debutMois.toISOString().split("T")[0])
      .gte("periode_fin", debutMois.toISOString().split("T")[0])
      .single(),
    supabase
      .from("objectifs")
      .select("valeur")
      .eq("station_id", stationId)
      .eq("type", "volume")
      .lte("periode_debut", debutAnnee.toISOString().split("T")[0])
      .gte("periode_fin", debutAnnee.toISOString().split("T")[0])
      .single(),
  ]);

  const objectifMensuel = objMensuel.data
    ? {
        objectif: objMensuel.data.valeur,
        realise: volumeMoisCourant,
        taux:
          objMensuel.data.valeur > 0
            ? (volumeMoisCourant / objMensuel.data.valeur) * 100
            : 0,
        projection:
          objMensuel.data.valeur > 0 && volumeMoisCourant > 0
            ? (volumeMoisCourant / aujourd_hui.getDate()) *
              new Date(
                aujourd_hui.getFullYear(),
                aujourd_hui.getMonth() + 1,
                0,
              ).getDate()
            : 0,
      }
    : null;

  const objectifAnnuel = objAnnuel.data
    ? {
        objectif: objAnnuel.data.valeur,
        realise: volumeAnneeCourante,
        taux:
          objAnnuel.data.valeur > 0
            ? (volumeAnneeCourante / objAnnuel.data.valeur) * 100
            : 0,
        projection:
          objAnnuel.data.valeur > 0 && volumeAnneeCourante > 0
            ? (volumeAnneeCourante /
                (aujourd_hui.getDate() + 30 * aujourd_hui.getMonth())) *
              365
            : 0,
      }
    : null;

  // Écarts
  const { data: ecarts } = await supabase
    .from("lignes_inventaire_carburant")
    .select("ecart_litres, inventaires!inner(date_inventaire)")
    .eq("inventaires.station_id", stationId)
    .gte("inventaires.date_inventaire", depuis30j.toISOString().split("T")[0]);

  const totalEcart =
    ecarts?.reduce((sum, row) => sum + (row.ecart_litres || 0), 0) || 0;
  const moyenEcart = ecarts?.length > 0 ? totalEcart / ecarts.length : 0;

  // Tendance
  const ecartsDates =
    ecarts?.map((e) => ({
      date: new Date(
        (e.inventaires as { date_inventaire: string }).date_inventaire,
      ).getTime(),
      ecart: e.ecart_litres || 0,
    })) || [];
  ecartsDates.sort((a, b) => a.date - b.date);

  let tendance: "amelioration" | "degradation" | "stable" = "stable";
  if (ecartsDates.length >= 2) {
    const mid = Math.floor(ecartsDates.length / 2);
    const premiereMoitie =
      ecartsDates.slice(0, mid).reduce((sum, e) => sum + e.ecart, 0) / mid;
    const secondeMoitie =
      ecartsDates.slice(mid).reduce((sum, e) => sum + e.ecart, 0) /
      (ecartsDates.length - mid);
    const diff = secondeMoitie - premiereMoitie;
    if (diff > 10) tendance = "amelioration";
    else if (diff < -10) tendance = "degradation";
  }

  // Doléances
  const { data: doleances } = await supabase
    .from("doleances")
    .select("statut")
    .eq("station_id", stationId);

  const totalDoleances = doleances?.length || 0;
  const doleancesOuvertes =
    doleances?.filter((d) => d.statut !== "reglee").length || 0;
  const doleancesResolues =
    doleances?.filter((d) => d.statut === "reglee").length || 0;
  const tauxResolution =
    totalDoleances > 0 ? (doleancesResolues / totalDoleances) * 100 : 0;

  return {
    station: {
      id: station.id,
      nom: station.nom,
      adresse: station.adresse,
      telephone: station.telephone,
    },
    volumes: {
      mois_courant: volumeMoisCourant,
      mois_precedent: volumeMoisPrecedent,
      annee_courante: volumeAnneeCourante,
    },
    stocks: {
      carburants: stocksDetail,
    },
    objectifs: {
      mensuel: objectifMensuel,
      annuel: objectifAnnuel,
    },
    ecarts: {
      total_30j: totalEcart,
      moyen_30j: moyenEcart,
      tendance,
    },
    doleances: {
      total: totalDoleances,
      ouvertes: doleancesOuvertes,
      resolues: doleancesResolues,
      taux_resolution: tauxResolution,
    },
  };
}
