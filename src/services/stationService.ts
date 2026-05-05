import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type StationInsert = Database["public"]["Tables"]["stations"]["Insert"];
type StationUpdate = Database["public"]["Tables"]["stations"]["Update"];

export const stationService = {
  async createStation(data: StationInsert) {
    const { data: result, error } = await supabase
      .from("stations")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateStation(id: string, data: StationUpdate) {
    const { data: result, error } = await supabase
      .from("stations")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getStationsByEntreprise(entrepriseId: string) {
    const { data, error } = await supabase
      .from("stations")
      .select("*, partenaires(nom, logo_url)")
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getStationById(id: string) {
    const { data, error } = await supabase
      .from("stations")
      .select("*, partenaires(nom, logo_url)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async validateStation(id: string, valideParId: string) {
    const { data, error } = await supabase
      .from("stations")
      .update({
        status: "validee",
        valide_par: valideParId,
        valide_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStationsEnAttente() {
    const { data, error } = await supabase
      .from("stations")
      .select("*, entreprises(nom), partenaires(nom)")
      .eq("status", "en_attente")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getStationsByPartenaire(partenaireId: string) {
    const { data, error } = await supabase
      .from("stations")
      .select("*, entreprises(nom)")
      .eq("partenaire_id", partenaireId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getIncompleteOnboarding(entrepriseId: string) {
    const { data, error } = await supabase
      .from("stations")
      .select("id, nom, onboarding_step")
      .eq("entreprise_id", entrepriseId)
      .neq("onboarding_step", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as { id: string; nom: string; onboarding_step: string } | null;
  },

  async setOnboardingStep(
    stationId: string,
    step: "station_info" | "cuves" | "pistolets" | "boutique" | "complete",
  ) {
    const { error } = await supabase
      .from("stations")
      .update({ onboarding_step: step })
      .eq("id", stationId);
    if (error) throw error;
  },

  async deleteStation(id: string) {
    const { error } = await supabase.from("stations").delete().eq("id", id);
    if (error) throw error;
  },
};
