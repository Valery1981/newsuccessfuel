import { createClient } from "@/utils/supabase/client";
import type { DoleanceStatut } from "@/types/supabase";

const supabase = createClient();

export type TypeIncident =
  | "panne_pistolet"
  | "eau_dans_cuve"
  | "panne_electrique"
  | "probleme_livraison"
  | "autre";

export const TYPE_INCIDENT_LABELS: Record<TypeIncident, string> = {
  panne_pistolet: "Panne pistolet",
  eau_dans_cuve: "Eau dans cuve",
  panne_electrique: "Panne électrique",
  probleme_livraison: "Problème livraison",
  autre: "Autre",
};

export interface Doleance {
  id: string;
  station_id: string | null;
  partenaire_id: string | null;
  type_incident: TypeIncident;
  description: string;
  statut: DoleanceStatut;
  envoyee_at: string;
  prise_en_charge_at: string | null;
  prise_en_charge_par: string | null;
  reglee_at: string | null;
  reglee_par: string | null;
  delai_prise_en_charge_minutes: number | null;
  delai_resolution_minutes: number | null;
  created_at: string;
  station_nom?: string;
  partenaire_nom?: string;
}

export interface DoleanceStats {
  total: number;
  en_cours: number;
  reglees: number;
  delai_moyen_resolution_minutes: number | null;
}

export const doleanceService = {
  async getDoleancesByStations(stationIds: string[]): Promise<Doleance[]> {
    if (stationIds.length === 0) return [];
    const { data, error } = await supabase
      .from("doleances")
      .select("*, stations!station_id(nom), partenaires!partenaire_id(nom)")
      .in("station_id", stationIds)
      .order("envoyee_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const station = r.stations as Record<string, unknown> | null;
      const partenaire = r.partenaires as Record<string, unknown> | null;
      return {
        ...r,
        station_nom: station?.nom as string | undefined,
        partenaire_nom: partenaire?.nom as string | undefined,
      } as Doleance;
    });
  },

  async creerDoleance(data: {
    station_id: string;
    partenaire_id: string | null;
    type_incident: TypeIncident;
    description: string;
    created_by?: string | null;
  }): Promise<Doleance> {
    const { data: result, error } = await supabase
      .from("doleances")
      .insert({
        station_id: data.station_id,
        partenaire_id: data.partenaire_id,
        type_incident: data.type_incident,
        description: data.description,
        statut: "envoyee" as DoleanceStatut,
        envoyee_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return result as unknown as Doleance;
  },

  async marquerReglee(doleanceId: string, regleeParId: string): Promise<void> {
    const { error } = await supabase
      .from("doleances")
      .update({
        statut: "reglee" as DoleanceStatut,
        reglee_at: new Date().toISOString(),
        reglee_par: regleeParId,
      })
      .eq("id", doleanceId);
    if (error) throw error;
  },

  async marquerPriseEnCharge(
    doleanceId: string,
    priseEnChargeParId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("doleances")
      .update({
        statut: "prise_en_charge" as DoleanceStatut,
        prise_en_charge_at: new Date().toISOString(),
        prise_en_charge_par: priseEnChargeParId,
      })
      .eq("id", doleanceId);
    if (error) throw error;
  },

  computeStats(doleances: Doleance[]): DoleanceStats {
    const total = doleances.length;
    const en_cours = doleances.filter(
      (d) => d.statut === "envoyee" || d.statut === "prise_en_charge"
    ).length;
    const reglees = doleances.filter((d) => d.statut === "reglee").length;

    const regleesAvecDelai = doleances.filter(
      (d) => d.statut === "reglee" && d.delai_resolution_minutes !== null
    );
    const delai_moyen_resolution_minutes =
      regleesAvecDelai.length > 0
        ? regleesAvecDelai.reduce(
            (acc, d) => acc + (d.delai_resolution_minutes ?? 0),
            0
          ) / regleesAvecDelai.length
        : null;

    return { total, en_cours, reglees, delai_moyen_resolution_minutes };
  },
};
