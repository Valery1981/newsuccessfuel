import type { Database, DoleanceStatut } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type StationUpdate = Database["public"]["Tables"]["stations"]["Update"];
type StationStatus = Database["public"]["Enums"]["station_status"];
type DoleanceTypeIncident =
  Database["public"]["Tables"]["doleances"]["Row"]["type_incident"];
type PartenaireType = Database["public"]["Enums"]["partenaire_type"];

export interface AdminStats {
  stations: {
    total: number;
    validees: number;
    en_attente: number;
    suspendues: number;
  };
  entreprisesActives: number;
  partenairesActifs: number;
  abonnementsActifs: number;
  gerantsActifs: number;
}

export interface DepensePlateforme {
  id: string;
  created_at: string;
  date_depense: string;
  categorie: string;
  description: string | null;
  montant: number;
  devise: string;
  created_by: string | null;
}

export interface StationAvecRelations {
  id: string;
  nom: string;
  adresse: string | null;
  status: StationStatus;
  created_at: string;
  entreprise_id: string | null;
  partenaire_id: string | null;
  entreprises: { nom: string } | null;
  partenaires: { nom: string } | null;
}

export interface AbonnementAvecRelations {
  id: string;
  plan: string;
  montant: number | null;
  part_gerant: number | null;
  part_partenaire: number | null;
  date_debut: string;
  date_fin: string | null;
  is_active: boolean;
  created_at: string;
  entreprise_id: string | null;
  partenaire_id: string | null;
  entreprises: { nom: string } | null;
  partenaires: { nom: string } | null;
}

export interface DoleanceAvecRelations {
  id: string;
  type_incident: string;
  description: string;
  statut: string;
  envoyee_at: string;
  prise_en_charge_at: string | null;
  reglee_at: string | null;
  delai_prise_en_charge_minutes: number | null;
  delai_resolution_minutes: number | null;
  station_id: string | null;
  partenaire_id: string | null;
  stations: { nom: string } | null;
  partenaires: { nom: string } | null;
}

export interface AuditLogAvecRelations {
  id: string;
  action: string;
  table_cible: string | null;
  ip_address: string | null;
  created_at: string;
  compte_id: string | null;
  entreprise_id: string | null;
  comptes: { nom: string } | null;
  entreprises: { nom: string } | null;
}

export interface PartenaireRow {
  id: string;
  nom: string;
  logo_url: string | null;
  type: PartenaireType;
  contact_nom: string | null;
  contact_email: string | null;
  contact_telephone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CompteGerant {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  is_active: boolean;
  created_at: string;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const [stationsRes, entreprisesRes, partenairesRes, abonnementsRes] =
      await Promise.all([
        supabase.from("stations").select("status"),
        supabase
          .from("entreprises")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("partenaires")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("abonnements")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

    if (stationsRes.error) throw stationsRes.error;
    if (entreprisesRes.error) throw entreprisesRes.error;
    if (partenairesRes.error) throw partenairesRes.error;
    if (abonnementsRes.error) throw abonnementsRes.error;

    const gerantsRes = await supabase
      .from("comptes")
      .select("id", { count: "exact", head: true })
      .eq("type", "gerant")
      .eq("is_active", true);

    const stations = stationsRes.data ?? [];
    return {
      stations: {
        total: stations.length,
        validees: stations.filter((s) => s.status === "validee").length,
        en_attente: stations.filter((s) => s.status === "en_attente").length,
        suspendues: stations.filter((s) => s.status === "suspendue").length,
      },
      entreprisesActives: entreprisesRes.count ?? 0,
      partenairesActifs: partenairesRes.count ?? 0,
      abonnementsActifs: abonnementsRes.count ?? 0,
      gerantsActifs: gerantsRes.count ?? 0,
    };
  },

  async getAbonnementsParMois() {
    const { data, error } = await supabase
      .from("abonnements")
      .select("created_at, is_active")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async getStationsEnAttente(): Promise<StationAvecRelations[]> {
    const { data, error } = await supabase
      .from("stations")
      .select(
        "id, nom, adresse, status, created_at, entreprise_id, partenaire_id, entreprises(nom), partenaires(nom)",
      )
      .eq("status", "en_attente")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data ?? []) as unknown as StationAvecRelations[];
  },

  async getAllStations(
    page: number,
    pageSize: number,
    statusFilter?: StationStatus,
    partenaireFilter?: string,
  ): Promise<{ data: StationAvecRelations[]; count: number }> {
    let query = supabase
      .from("stations")
      .select(
        "id, nom, adresse, status, created_at, entreprise_id, partenaire_id, entreprises(nom), partenaires(nom)",
        { count: "exact" },
      );
    if (statusFilter) query = query.eq("status", statusFilter);
    if (partenaireFilter) query = query.eq("partenaire_id", partenaireFilter);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      data: (data ?? []) as unknown as StationAvecRelations[],
      count: count ?? 0,
    };
  },

  async updateStationStatus(
    id: string,
    status: StationStatus,
    valideParId?: string,
    motifRejet?: string,
  ) {
    const update: StationUpdate & { motif_rejet?: string } = { status };
    if (status === "validee" && valideParId) {
      update.valide_par = valideParId;
      update.valide_at = new Date().toISOString();
    }
    if (motifRejet) {
      update.motif_rejet = motifRejet;
    }
    const { data, error } = await supabase
      .from("stations")
      .update(update as StationUpdate)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Station introuvable ou accès non autorisé");
    return data;
  },

  async getDepenses(): Promise<DepensePlateforme[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from("depenses_plateforme")
      .select("*")
      .order("date_depense", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DepensePlateforme[];
  },

  async createDepense(payload: {
    date_depense: string;
    categorie: string;
    description?: string;
    montant: number;
    devise?: string;
    created_by?: string;
  }): Promise<DepensePlateforme> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from("depenses_plateforme")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as DepensePlateforme;
  },

  async getGerants(): Promise<CompteGerant[]> {
    const { data, error } = await supabase
      .from("comptes")
      .select("id, nom, email, telephone, is_active, created_at")
      .eq("type", "gerant")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as CompteGerant[]) ?? [];
  },

  async updateCompteActif(id: string, is_active: boolean) {
    const { data, error } = await supabase
      .from("comptes")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getPartenaires(): Promise<PartenaireRow[]> {
    const { data, error } = await supabase
      .from("partenaires")
      .select(
        "id, nom, logo_url, type, contact_nom, contact_email, contact_telephone, is_active, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as PartenaireRow[]) ?? [];
  },

  async createPartenaire(payload: {
    nom: string;
    type: PartenaireType;
    contact_nom?: string;
    contact_email: string;
    contact_telephone?: string;
  }): Promise<{
    partenaire: PartenaireRow;
    oneTimePassword: string;
    loginEmail: string;
  }> {
    const res = await fetch("/api/admin/partenaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!res.ok) {
      const msg =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : text || res.statusText;
      throw new Error(msg);
    }
    return body as {
      partenaire: PartenaireRow;
      oneTimePassword: string;
      loginEmail: string;
    };
  },

  async updatePartenaireActif(id: string, is_active: boolean) {
    const { data, error } = await supabase
      .from("partenaires")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllAbonnements(
    page: number,
    pageSize: number,
    activeFilter?: boolean,
  ): Promise<{ data: AbonnementAvecRelations[]; count: number }> {
    let query = supabase
      .from("abonnements")
      .select(
        "id, plan, montant, part_gerant, part_partenaire, date_debut, date_fin, is_active, created_at, entreprise_id, partenaire_id, entreprises(nom), partenaires(nom)",
        { count: "exact" },
      );
    if (activeFilter !== undefined) query = query.eq("is_active", activeFilter);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      data: (data ?? []) as unknown as AbonnementAvecRelations[],
      count: count ?? 0,
    };
  },

  async getAllEntreprises() {
    const { data, error } = await supabase
      .from("entreprises")
      .select("id, nom")
      .eq("is_active", true)
      .order("nom");
    if (error) throw error;
    return data ?? [];
  },

  async createAbonnement(payload: {
    entreprise_id: string;
    partenaire_id?: string;
    plan: string;
    montant?: number;
    part_gerant?: number;
    part_partenaire?: number;
    date_debut: string;
    date_fin?: string;
  }) {
    const { data, error } = await supabase
      .from("abonnements")
      .insert({ ...payload, is_active: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAbonnement(
    id: string,
    payload: {
      plan?: string;
      montant?: number;
      part_gerant?: number;
      part_partenaire?: number;
      date_fin?: string;
      is_active?: boolean;
    },
  ) {
    const { data, error } = await supabase
      .from("abonnements")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAuditLogs(
    page: number,
    pageSize: number,
    actionFilter?: string,
    dateDebut?: string,
    dateFin?: string,
  ): Promise<{ data: AuditLogAvecRelations[]; count: number }> {
    let query = supabase
      .from("audit_log")
      .select(
        "id, action, table_cible, ip_address, created_at, compte_id, entreprise_id, comptes(nom), entreprises(nom)",
        { count: "exact" },
      );
    if (actionFilter) query = query.eq("action", actionFilter);
    if (dateDebut) query = query.gte("created_at", dateDebut);
    if (dateFin) query = query.lte("created_at", dateFin + "T23:59:59");
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      data: (data ?? []) as unknown as AuditLogAvecRelations[],
      count: count ?? 0,
    };
  },

  async getDoleances(
    page: number,
    pageSize: number,
    statutFilter?: DoleanceStatut,
    typeFilter?: DoleanceTypeIncident,
  ): Promise<{ data: DoleanceAvecRelations[]; count: number }> {
    let query = supabase
      .from("doleances")
      .select(
        "id, type_incident, description, statut, envoyee_at, prise_en_charge_at, reglee_at, delai_prise_en_charge_minutes, delai_resolution_minutes, station_id, partenaire_id, stations(nom), partenaires(nom)",
        { count: "exact" },
      );
    if (statutFilter) query = query.eq("statut", statutFilter);
    if (typeFilter) query = query.eq("type_incident", typeFilter);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order("envoyee_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      data: (data ?? []) as unknown as DoleanceAvecRelations[],
      count: count ?? 0,
    };
  },

  async getDoleancesStats() {
    const { data, error } = await supabase
      .from("doleances")
      .select(
        "type_incident, statut, delai_prise_en_charge_minutes, delai_resolution_minutes",
      );
    if (error) throw error;
    return data ?? [];
  },
};
