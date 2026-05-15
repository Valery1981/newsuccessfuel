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

  async createModificationRequest(
    stationId: string,
    requestedBy: string,
    servicesDemandes: Record<string, boolean>,
  ) {
    const { data, error } = await supabase
      .from("station_modification_requests" as never)
      .insert({
        station_id: stationId,
        requested_by: requestedBy,
        services_demandes: servicesDemandes,
        statut: "en_attente",
      } as never)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPendingRequestsByStation(stationId: string) {
    const { data, error } = await supabase
      .from("station_modification_requests" as never)
      .select("*")
      .eq("station_id" as never, stationId)
      .eq("statut" as never, "en_attente")
      .order("created_at" as never, { ascending: false });
    if (error) throw error;
    return (data ?? []) as ModificationRequest[];
  },

  async getPendingRequestsByEntreprise(stationIds: string[]) {
    if (stationIds.length === 0) return [];
    const { data, error } = await supabase
      .from("station_modification_requests" as never)
      .select("*")
      .in("station_id" as never, stationIds)
      .eq("statut" as never, "en_attente");
    if (error) throw error;
    return (data ?? []) as ModificationRequest[];
  },

  async validateModificationRequest(
    requestId: string,
    statut: "validee" | "rejetee",
    validatedBy: string,
    commentaire?: string,
  ) {
    const { data: req, error: fetchErr } = await supabase
      .from("station_modification_requests" as never)
      .select("*")
      .eq("id" as never, requestId)
      .single();
    if (fetchErr) throw fetchErr;
    const r = req as ModificationRequest;

    if (statut === "validee") {
      await supabase
        .from("stations")
        .update(r.services_demandes as StationUpdate)
        .eq("id", r.station_id);
    }

    const { error } = await supabase
      .from("station_modification_requests" as never)
      .update({
        statut,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        commentaire: commentaire ?? null,
      } as never)
      .eq("id" as never, requestId);
    if (error) throw error;
  },

  async getPartnerPendingRequests(partenaireId: string) {
    const { data: stationsData, error: stErr } = await supabase
      .from("stations")
      .select("id")
      .eq("partenaire_id", partenaireId);
    if (stErr) throw stErr;
    const ids = (stationsData ?? []).map((s) => s.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("station_modification_requests" as never)
      .select("*")
      .in("station_id" as never, ids)
      .eq("statut" as never, "en_attente")
      .order("created_at" as never, { ascending: false });
    if (error) throw error;
    return (data ?? []) as ModificationRequest[];
  },
};

export type ModificationRequest = {
  id: string;
  station_id: string;
  requested_by: string;
  services_demandes: Record<string, boolean>;
  statut: "en_attente" | "validee" | "rejetee";
  commentaire: string | null;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
};
