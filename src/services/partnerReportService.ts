/**
 * partnerReportService.ts
 * SECURITY: Partner NEVER sees financial data (CA carburant, margins, CMUP, cash, accounting).
 * ALLOWED: volume_vendu (litres), stock_actuel_litres, ca_boutique (tickets total), objectifs, doleances.
 * FORBIDDEN: ca from lignes_shift_carburant, cmup_sortie, ecritures_comptables, trésorerie.
 */
import { createClient } from "@/utils/supabase/client";
import { format, subDays } from "date-fns";

const supabase = createClient();

export type PartnerStation = { id: string; nom: string };

export type VolumeRow = {
  station_id: string;
  station_nom: string;
  type_carburant: string;
  total_litres: number;
  nb_shifts: number;
};

export type StockCarburantRow = {
  cuve_id: string;
  cuve_nom: string;
  station_id: string;
  station_nom: string;
  type_carburant: string;
  stock_litres: number;
  jauge_cm: number | null;
};

export type CaBoutiqueRow = {
  station_id: string;
  station_nom: string;
  ca_total: number;
  nb_tickets: number;
};

export type EcartCarburantRow = {
  inventaire_id: string;
  station_id: string;
  station_nom: string;
  date_inventaire: string;
  type_carburant: string;
  ecart_litres: number;
};

export type ObjectifRow = {
  station_id: string;
  station_nom: string;
  type: string;
  type_carburant: string | null;
  objectif: number;
  realise: number;
  taux: number;
};

export type AchatCarburantRow = {
  achat_id: string;
  entreprise_nom: string;
  date_commande: string;
  date_livraison: string | null;
  numero_bc: string;
  numero_bl: string | null;
  statut: string | null;
};

export type ComparatifRow = {
  station_id: string;
  station_nom: string;
  volume_litres: number;
  ca_boutique: number;
  nb_doleances: number;
};

export type DoleanceStatRow = {
  type_incident: string;
  total: number;
  resolues: number;
  taux_resolution: number;
  delai_moyen_resolution_min: number | null;
};

export async function getPartenaireStations(
  compteId: string,
): Promise<PartnerStation[]> {
  const { data: partenaire } = await supabase
    .from("partenaires")
    .select("id")
    .eq("compte_id", compteId)
    .maybeSingle();
  if (!partenaire) return [];
  const { data } = await supabase
    .from("stations")
    .select("id, nom")
    .eq("partenaire_id", partenaire.id)
    .order("nom");
  return (data ?? []).map((s) => ({
    id: s.id as string,
    nom: s.nom as string,
  }));
}

/** Volumes vendus (litres only — NO CA carburant) */
export async function getVolumesVendus(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<VolumeRow[]> {
  if (!stationIds.length) return [];
  const { data } = await supabase
    .from("lignes_shift_carburant")
    .select(
      "type_carburant, volume_vendu, shifts_carburant!inner(station_id, date_shift, stations!inner(nom))",
    )
    .in("shifts_carburant.station_id", stationIds)
    .gte("shifts_carburant.date_shift", dateFrom)
    .lte("shifts_carburant.date_shift", dateTo);

  const map = new Map<string, VolumeRow>();
  (data ?? []).forEach((r: Record<string, unknown>) => {
    const shift = r.shifts_carburant as Record<string, unknown>;
    const stationId = shift.station_id as string;
    const stationNom = (shift.stations as Record<string, unknown>)
      .nom as string;
    const type = r.type_carburant as string;
    const vol = (r.volume_vendu as number) ?? 0;
    const key = `${stationId}|${type}`;
    const existing = map.get(key);
    if (existing) {
      existing.total_litres += vol;
      existing.nb_shifts += 1;
    } else {
      map.set(key, {
        station_id: stationId,
        station_nom: stationNom,
        type_carburant: type,
        total_litres: vol,
        nb_shifts: 1,
      });
    }
  });
  return [...map.values()].sort((a, b) =>
    a.station_nom.localeCompare(b.station_nom),
  );
}

/** Stocks carburant courants (litres only) */
export async function getStocksCarburant(
  stationIds: string[],
): Promise<StockCarburantRow[]> {
  if (!stationIds.length) return [];
  const { data } = await supabase
    .from("cuves")
    .select(
      "id, nom, type_carburant, station_id, stock_actuel_litres, jauge_actuelle_cm, stations(nom)",
    )
    .in("station_id", stationIds)
    .order("station_id");
  return (data ?? []).map((r: Record<string, unknown>) => ({
    cuve_id: r.id as string,
    cuve_nom: r.nom as string,
    station_id: r.station_id as string,
    station_nom: ((r.stations as Record<string, unknown>)?.nom as string) ?? "",
    type_carburant: r.type_carburant as string,
    stock_litres: (r.stock_actuel_litres as number) ?? 0,
    jauge_cm: r.jauge_actuelle_cm as number | null,
  }));
}

/** CA Boutique (sum of ticket totals — NO margins, NO cmup) */
export async function getCaBoutique(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<CaBoutiqueRow[]> {
  if (!stationIds.length) return [];
  const { data } = await supabase
    .from("tickets_boutique")
    .select("station_id, total, stations(nom)")
    .in("station_id", stationIds)
    .gte("date_vente", dateFrom)
    .lte("date_vente", dateTo);

  const map = new Map<string, CaBoutiqueRow>();
  (data ?? []).forEach((r: Record<string, unknown>) => {
    const stId = r.station_id as string;
    const stNom =
      ((r.stations as Record<string, unknown>)?.nom as string) ?? "";
    const existing = map.get(stId);
    if (existing) {
      existing.ca_total += (r.total as number) ?? 0;
      existing.nb_tickets += 1;
    } else {
      map.set(stId, {
        station_id: stId,
        station_nom: stNom,
        ca_total: (r.total as number) ?? 0,
        nb_tickets: 1,
      });
    }
  });
  return [...map.values()].sort((a, b) => b.ca_total - a.ca_total);
}

/** Écarts inventaire carburant (litres only — NO monetary values) */
export async function getEcartsCarburant(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<EcartCarburantRow[]> {
  if (!stationIds.length) return [];
  const { data } = await supabase
    .from("lignes_inventaire_carburant")
    .select(
      "ecart_litres, inventaire_id, cuves(type_carburant), inventaires!inner(station_id, date_inventaire, stations(nom))",
    )
    .in("inventaires.station_id", stationIds)
    .gte("inventaires.date_inventaire", dateFrom)
    .lte("inventaires.date_inventaire", dateTo);

  return (data ?? [])
    .map((r: Record<string, unknown>) => {
      const inv = r.inventaires as Record<string, unknown>;
      const stNom =
        ((inv.stations as Record<string, unknown>)?.nom as string) ?? "";
      return {
        inventaire_id: r.inventaire_id as string,
        station_id: inv.station_id as string,
        station_nom: stNom,
        date_inventaire: inv.date_inventaire as string,
        type_carburant:
          ((r.cuves as Record<string, unknown>)?.type_carburant as string) ??
          "—",
        ecart_litres: (r.ecart_litres as number) ?? 0,
      };
    })
    .sort((a, b) => b.date_inventaire.localeCompare(a.date_inventaire));
}

/** Réalisations vs Objectifs (volume litres + CA boutique only) */
export async function getRealisations(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<ObjectifRow[]> {
  if (!stationIds.length) return [];
  const { data: objectifs } = await supabase
    .from("objectifs")
    .select("station_id, type, type_carburant, valeur, stations(nom)")
    .in("station_id", stationIds)
    .lte("periode_debut", dateTo)
    .gte("periode_fin", dateFrom);

  const [volumes, caData] = await Promise.all([
    getVolumesVendus(stationIds, dateFrom, dateTo),
    getCaBoutique(stationIds, dateFrom, dateTo),
  ]);

  const volumeByStation = new Map(
    volumes.map((v) => [v.station_id, v.total_litres]),
  );
  const caByStation = new Map(caData.map((c) => [c.station_id, c.ca_total]));

  return (objectifs ?? []).map((o: Record<string, unknown>) => {
    const stId = o.station_id as string;
    const stNom =
      ((o.stations as Record<string, unknown>)?.nom as string) ?? "";
    const type = o.type as string;
    const realise =
      type === "ca_boutique"
        ? (caByStation.get(stId) ?? 0)
        : (volumeByStation.get(stId) ?? 0);
    const objectif = o.valeur as number;
    return {
      station_id: stId,
      station_nom: stNom,
      type,
      type_carburant: o.type_carburant as string | null,
      objectif,
      realise,
      taux: objectif > 0 ? Math.round((realise / objectif) * 100) : 0,
    };
  });
}

/** Achats carburant — bons de commande/livraison par réseau partenaire */
export async function getAchatsCarburant(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<AchatCarburantRow[]> {
  if (!stationIds.length) return [];
  // Get entreprise IDs from partner stations
  const { data: stationsData } = await supabase
    .from("stations")
    .select("entreprise_id")
    .in("id", stationIds)
    .not("entreprise_id", "is", null);
  const entrepriseIds = (stationsData ?? [])
    .map((s) => (s as Record<string, unknown>).entreprise_id as string)
    .filter(Boolean);
  if (!entrepriseIds.length) return [];

  const { data } = await supabase
    .from("achats_carburant")
    .select(
      "id, date_commande, date_livraison, numero_bc, numero_bl, statut, entreprises(nom)",
    )
    .in("entreprise_id", entrepriseIds)
    .gte("date_commande", dateFrom)
    .lte("date_commande", dateTo)
    .order("date_commande", { ascending: false });

  return (data ?? []).map((r: Record<string, unknown>) => ({
    achat_id: r.id as string,
    entreprise_nom:
      ((r.entreprises as Record<string, unknown>)?.nom as string) ?? "",
    date_commande: r.date_commande as string,
    date_livraison: r.date_livraison as string | null,
    numero_bc: r.numero_bc as string,
    numero_bl: r.numero_bl as string | null,
    statut: r.statut as string | null,
  }));
}

/** Comparatif inter-stations */
export async function getComparatifStations(
  stationIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<ComparatifRow[]> {
  if (!stationIds.length) return [];
  const [volumes, caData, doleancesData] = await Promise.all([
    getVolumesVendus(stationIds, dateFrom, dateTo),
    getCaBoutique(stationIds, dateFrom, dateTo),
    supabase
      .from("doleances")
      .select("station_id")
      .in("station_id", stationIds)
      .gte("envoyee_at", dateFrom)
      .lte("envoyee_at", dateTo),
  ]);

  const allStations = [
    ...new Set([
      ...volumes.map((v) => v.station_id),
      ...caData.map((c) => c.station_id),
    ]),
  ];

  const stationNomMap = new Map([
    ...volumes.map((v) => [v.station_id, v.station_nom] as [string, string]),
    ...caData.map((c) => [c.station_id, c.station_nom] as [string, string]),
  ]);

  const doleancesByStation = new Map<string, number>();
  (doleancesData.data ?? []).forEach((d: Record<string, unknown>) => {
    const sid = d.station_id as string;
    doleancesByStation.set(sid, (doleancesByStation.get(sid) ?? 0) + 1);
  });

  const totalVolumeByStation = new Map<string, number>();
  volumes.forEach((v) => {
    totalVolumeByStation.set(
      v.station_id,
      (totalVolumeByStation.get(v.station_id) ?? 0) + v.total_litres,
    );
  });

  return allStations
    .map((sid) => ({
      station_id: sid,
      station_nom: stationNomMap.get(sid) ?? sid,
      volume_litres: totalVolumeByStation.get(sid) ?? 0,
      ca_boutique: caData.find((c) => c.station_id === sid)?.ca_total ?? 0,
      nb_doleances: doleancesByStation.get(sid) ?? 0,
    }))
    .sort((a, b) => b.volume_litres - a.volume_litres);
}

/** Statistiques doléances */
export async function getDoleancesStats(
  partenaireId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DoleanceStatRow[]> {
  const { data } = await supabase
    .from("doleances")
    .select("type_incident, statut, delai_resolution_minutes")
    .eq("partenaire_id", partenaireId)
    .gte("envoyee_at", dateFrom)
    .lte("envoyee_at", dateTo);

  const map = new Map<
    string,
    { total: number; resolues: number; delais: number[] }
  >();
  (data ?? []).forEach((r: Record<string, unknown>) => {
    const type = r.type_incident as string;
    const entry = map.get(type) ?? { total: 0, resolues: 0, delais: [] };
    entry.total += 1;
    if (r.statut === "reglee") {
      entry.resolues += 1;
      if (r.delai_resolution_minutes != null)
        entry.delais.push(r.delai_resolution_minutes as number);
    }
    map.set(type, entry);
  });

  return [...map.entries()]
    .map(([type, v]) => ({
      type_incident: type,
      total: v.total,
      resolues: v.resolues,
      taux_resolution:
        v.total > 0 ? Math.round((v.resolues / v.total) * 100) : 0,
      delai_moyen_resolution_min:
        v.delais.length > 0
          ? Math.round(v.delais.reduce((a, b) => a + b, 0) / v.delais.length)
          : null,
    }))
    .sort((a, b) => b.total - a.total);
}

export function defaultDateRange() {
  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 30), "yyyy-MM-dd");
  return { from, to };
}
