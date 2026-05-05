import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type Partenaire = Database["public"]["Tables"]["partenaires"]["Row"];
type Station = Database["public"]["Tables"]["stations"]["Row"];
type Doleance = Database["public"]["Tables"]["doleances"]["Row"];
type Objectif = Database["public"]["Tables"]["objectifs"]["Row"];

export type StationWithEntreprise = Station & {
  entreprises: { nom: string; compte_id: string | null } | null;
};

export type DoleanceWithStation = Doleance & {
  stations: { nom: string } | null;
};

export type ObjectifRow = Objectif;

export const partnerService = {
  async getPartenaireByCompteId(compteId: string): Promise<Partenaire> {
    const { data, error } = await supabase
      .from("partenaires")
      .select("*")
      .eq("compte_id", compteId)
      .single();
    if (error) throw error;
    return data;
  },

  async getStationsByPartenaire(
    partenaireId: string,
  ): Promise<StationWithEntreprise[]> {
    const { data, error } = await supabase
      .from("stations")
      .select("*, entreprises(nom, compte_id)")
      .eq("partenaire_id", partenaireId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as StationWithEntreprise[];
  },

  async getDoleancesByPartenaire(
    partenaireId: string,
  ): Promise<DoleanceWithStation[]> {
    const { data, error } = await supabase
      .from("doleances")
      .select("*, stations(nom)")
      .eq("partenaire_id", partenaireId)
      .order("envoyee_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DoleanceWithStation[];
  },

  async getObjectifsByStation(stationId: string): Promise<ObjectifRow[]> {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("objectifs")
      .select("*")
      .eq("station_id", stationId)
      .lte("periode_debut", today)
      .gte("periode_fin", today)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async validerStation(
    stationId: string,
    valideParId: string,
  ): Promise<Station> {
    const { data, error } = await supabase
      .from("stations")
      .update({
        status: "validee",
        valide_par: valideParId,
        valide_at: new Date().toISOString(),
      })
      .eq("id", stationId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Station introuvable ou accès non autorisé");
    return data;
  },

  async priseEnChargeDoleance(
    doleanceId: string,
    compteId: string,
  ): Promise<Doleance> {
    const { data, error } = await supabase
      .from("doleances")
      .update({
        statut: "prise_en_charge",
        prise_en_charge_at: new Date().toISOString(),
        prise_en_charge_par: compteId,
      })
      .eq("id", doleanceId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Doléance introuvable ou accès non autorisé");
    return data;
  },
};
