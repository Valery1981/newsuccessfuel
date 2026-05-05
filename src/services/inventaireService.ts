import type {
  InventaireStatut,
  InventaireType,
  MotifEcart,
} from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface Inventaire {
  id: string;
  station_id: string | null;
  type: InventaireType;
  statut: InventaireStatut;
  date_inventaire: string;
  inventaire_precedent_id: string | null;
  regularise_at: string | null;
  regularise_par: string | null;
  created_by: string | null;
  created_at: string;
  station_nom?: string;
}

export interface LigneInventaireCarburant {
  id: string;
  inventaire_id: string;
  cuve_id: string;
  stock_theorique_litres: number;
  jauge_reelle_cm: number | null;
  volume_reel_litres: number | null;
  ecart_litres: number | null;
  cmup: number | null;
  valeur_ecart: number | null;
  motif: MotifEcart | null;
  responsable_id: string | null;
  ecriture_id: string | null;
  cuve_nom?: string;
  type_carburant?: string;
}

export interface LigneInventaireBoutique {
  id: string;
  inventaire_id: string;
  article_id: string;
  stock_theorique: number;
  quantite_reelle: number | null;
  ecart: number | null;
  cmup: number | null;
  valeur_ecart: number | null;
  motif: MotifEcart | null;
  motif_detail: string | null;
  responsable_id: string | null;
  ecriture_id: string | null;
  article_nom?: string;
  article_unite?: string;
}

export const inventaireService = {
  async getInventairesByEntreprise(
    entrepriseId: string,
    type?: InventaireType,
  ) {
    let query = supabase
      .from("inventaires")
      .select("*, stations!station_id(nom)")
      .order("date_inventaire", { ascending: false })
      .limit(50);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as unknown[])
      .map((row) => {
        const r = row as Record<string, unknown>;
        const station = r.stations as Record<string, unknown> | null;
        if (station && station.entreprise_id !== entrepriseId) return null;
        return {
          ...r,
          station_nom: station?.nom as string | undefined,
        } as Inventaire;
      })
      .filter(Boolean) as Inventaire[];
  },

  async getInventairesByStation(stationId: string, type?: InventaireType) {
    let query = supabase
      .from("inventaires")
      .select("*, stations!station_id(nom)")
      .eq("station_id", stationId)
      .order("date_inventaire", { ascending: false })
      .limit(50);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const station = r.stations as Record<string, unknown> | null;
      return {
        ...r,
        station_nom: station?.nom as string | undefined,
      } as Inventaire;
    });
  },

  async getInventairesByStations(stationIds: string[], type?: InventaireType) {
    let query = supabase
      .from("inventaires")
      .select("*, stations!station_id(nom)")
      .in("station_id", stationIds)
      .order("date_inventaire", { ascending: false })
      .limit(100);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const station = r.stations as Record<string, unknown> | null;
      return {
        ...r,
        station_nom: station?.nom as string | undefined,
      } as Inventaire;
    });
  },

  async creerInventaire(data: {
    station_id: string;
    type: InventaireType;
    created_by: string | null;
  }): Promise<Inventaire> {
    const { data: result, error } = await supabase
      .from("inventaires")
      .insert({
        station_id: data.station_id,
        type: data.type,
        statut: "en_cours" as InventaireStatut,
        date_inventaire: new Date().toISOString(),
        created_by: data.created_by,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return result as unknown as Inventaire;
  },

  async getLignesCarburant(
    inventaireId: string,
  ): Promise<LigneInventaireCarburant[]> {
    const { data, error } = await supabase
      .from("lignes_inventaire_carburant")
      .select("*, cuves!cuve_id(nom, type_carburant)")
      .eq("inventaire_id", inventaireId);
    if (error) throw error;
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const cuve = r.cuves as Record<string, unknown> | null;
      return {
        ...r,
        cuve_nom: cuve?.nom as string | undefined,
        type_carburant: cuve?.type_carburant as string | undefined,
      } as LigneInventaireCarburant;
    });
  },

  async getLignesBoutique(
    inventaireId: string,
  ): Promise<LigneInventaireBoutique[]> {
    const { data, error } = await supabase
      .from("lignes_inventaire_boutique")
      .select("*, articles!article_id(nom, unite)")
      .eq("inventaire_id", inventaireId);
    if (error) throw error;
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const article = r.articles as Record<string, unknown> | null;
      return {
        ...r,
        article_nom: article?.nom as string | undefined,
        article_unite: article?.unite as string | undefined,
      } as LigneInventaireBoutique;
    });
  },

  async initialiserLignesCarburant(
    inventaireId: string,
    stationId: string,
  ): Promise<void> {
    const { data: cuves, error: cuvesError } = await supabase
      .from("cuves")
      .select("id, nom, type_carburant, stock_actuel_litres, cmup")
      .eq("station_id", stationId);
    if (cuvesError) throw cuvesError;

    if (!cuves || cuves.length === 0) return;

    const lignes = cuves.map((cuve) => ({
      inventaire_id: inventaireId,
      cuve_id: cuve.id,
      stock_theorique_litres: cuve.stock_actuel_litres,
      jauge_reelle_cm: 0,
      volume_reel_litres: 0,
      cmup: cuve.cmup,
      motif: null,
      responsable_id: null,
      ecriture_id: null,
    }));

    const { error } = await supabase
      .from("lignes_inventaire_carburant")
      .insert(lignes as any[]);
    if (error) throw error;
  },

  async initialiserLignesBoutique(
    inventaireId: string,
    stationId: string,
  ): Promise<void> {
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks_boutique")
      .select("article_id, quantite, cmup, articles!article_id(nom, is_active)")
      .eq("station_id", stationId);
    if (stocksError) throw stocksError;

    if (!stocks || stocks.length === 0) return;

    const stocksFiltered = (stocks as unknown[]).filter((s) => {
      const r = s as Record<string, unknown>;
      const article = r.articles as Record<string, unknown> | null;
      return article?.is_active !== false;
    });

    if (stocksFiltered.length === 0) return;

    const lignes = (stocksFiltered as unknown[]).map((s) => {
      const r = s as Record<string, unknown>;
      return {
        inventaire_id: inventaireId,
        article_id: r.article_id as string,
        stock_theorique: r.quantite as number,
        quantite_reelle: null,
        cmup: r.cmup as number,
        motif: null,
        motif_detail: null,
        responsable_id: null,
        ecriture_id: null,
      };
    });

    const { error } = await supabase
      .from("lignes_inventaire_boutique")
      .insert(lignes as any[]);
    if (error) throw error;
  },

  async updateLigneCarburant(
    ligneId: string,
    data: { jauge_reelle_cm: number; volume_reel_litres: number },
  ): Promise<void> {
    const { error } = await supabase
      .from("lignes_inventaire_carburant")
      .update({
        jauge_reelle_cm: data.jauge_reelle_cm,
        volume_reel_litres: data.volume_reel_litres,
      })
      .eq("id", ligneId);
    if (error) throw error;
  },

  async updateLigneBoutique(
    ligneId: string,
    data: {
      quantite_reelle: number;
      motif?: MotifEcart | null;
      motif_detail?: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from("lignes_inventaire_boutique")
      .update({
        quantite_reelle: data.quantite_reelle,
        motif: data.motif ?? null,
        motif_detail: data.motif_detail ?? null,
      })
      .eq("id", ligneId);
    if (error) throw error;
  },

  async enregistrerInventaire(inventaireId: string): Promise<void> {
    const { error } = await supabase
      .from("inventaires")
      .update({ statut: "enregistre" as InventaireStatut })
      .eq("id", inventaireId);
    if (error) throw error;
  },

  async regulariserLigneCarburant(
    ligneId: string,
    data: { motif: MotifEcart; responsable_id: string | null },
  ): Promise<void> {
    const { error } = await supabase
      .from("lignes_inventaire_carburant")
      .update({ motif: data.motif, responsable_id: data.responsable_id })
      .eq("id", ligneId);
    if (error) throw error;
  },

  async regulariserLigneBoutique(
    ligneId: string,
    data: {
      motif: MotifEcart;
      motif_detail: string | null;
      responsable_id: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from("lignes_inventaire_boutique")
      .update({
        motif: data.motif,
        motif_detail: data.motif_detail,
        responsable_id: data.responsable_id,
      })
      .eq("id", ligneId);
    if (error) throw error;
  },

  async cloturerRegularisation(
    inventaireId: string,
    regulariseParId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("inventaires")
      .update({
        statut: "regularise" as InventaireStatut,
        regularise_at: new Date().toISOString(),
        regularise_par: regulariseParId,
      })
      .eq("id", inventaireId);
    if (error) throw error;
  },

  async getVolumeFromJauge(cuveId: string, jaugeCm: number): Promise<number> {
    const { data, error } = await supabase.rpc("get_volume_from_jauge", {
      p_cuve_id: cuveId,
      p_jauge_cm: jaugeCm,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
