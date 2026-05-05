import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type ObjectifInsert = Database["public"]["Tables"]["objectifs"]["Insert"];
type ObjectifUpdate = Database["public"]["Tables"]["objectifs"]["Update"];
type SeuilInsert =
  Database["public"]["Tables"]["seuils_alerte_stock"]["Insert"];
type SeuilRow = Database["public"]["Tables"]["seuils_alerte_stock"]["Row"];

export type SeuilAvecRelations = SeuilRow & {
  article: { id: string; nom: string; unite: string | null } | null;
  station: { id: string; nom: string } | null;
};

export const objectifService = {
  async getObjectifsByStations(stationIds: string[]) {
    if (stationIds.length === 0) return [];
    const { data, error } = await supabase
      .from("objectifs")
      .select("*, stations(id, nom)")
      .in("station_id", stationIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createObjectif(data: ObjectifInsert) {
    const { data: result, error } = await supabase
      .from("objectifs")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateObjectif(id: string, data: ObjectifUpdate) {
    const { data: result, error } = await supabase
      .from("objectifs")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteObjectif(id: string): Promise<void> {
    const { error } = await supabase.from("objectifs").delete().eq("id", id);
    if (error) throw error;
  },

  async getSeuilsByEntreprise(
    entrepriseId: string,
  ): Promise<SeuilAvecRelations[]> {
    const { data: articleRows, error: artErr } = await supabase
      .from("articles")
      .select("id")
      .eq("entreprise_id", entrepriseId);
    if (artErr) throw artErr;
    const articleIds = (articleRows ?? []).map((a) => a.id);
    if (articleIds.length === 0) return [];

    const { data: seuils, error } = await supabase
      .from("seuils_alerte_stock")
      .select("*")
      .in("article_id", articleIds)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: articles } = await supabase
      .from("articles")
      .select("id, nom, unite")
      .in("id", articleIds);
    const artMap = new Map((articles ?? []).map((a) => [a.id, a]));

    const stationIds = [
      ...new Set(
        (seuils ?? [])
          .map((s) => s.station_id)
          .filter((id): id is string => id != null),
      ),
    ];
    let stMap = new Map<string, { id: string; nom: string }>();
    if (stationIds.length > 0) {
      const { data: stations } = await supabase
        .from("stations")
        .select("id, nom")
        .in("id", stationIds);
      stMap = new Map((stations ?? []).map((s) => [s.id, s]));
    }

    return (seuils ?? []).map((s) => ({
      ...s,
      article: s.article_id ? (artMap.get(s.article_id) ?? null) : null,
      station: s.station_id ? (stMap.get(s.station_id) ?? null) : null,
    }));
  },

  async upsertSeuil(data: SeuilInsert) {
    const { data: result, error } = await supabase
      .from("seuils_alerte_stock")
      .upsert(data, { onConflict: "article_id,station_id" })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteSeuil(id: string): Promise<void> {
    const { error } = await supabase
      .from("seuils_alerte_stock")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
