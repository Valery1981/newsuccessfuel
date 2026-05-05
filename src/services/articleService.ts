import { createClient } from "@/utils/supabase/client";
import type { Database, FamilleProduit } from "@/types/supabase";

const supabase = createClient();

type ArticleInsert = Database["public"]["Tables"]["articles"]["Insert"];
type ArticleUpdate = Database["public"]["Tables"]["articles"]["Update"];

const FAMILLE_COMPTE_MAP: Record<string, { stock: string; vente: string }> = {
  carburants: { stock: "310", vente: "701" },
  lubrifiants: { stock: "340", vente: "704" },
  gpl: { stock: "350", vente: "705" },
  marchandises_generales: { stock: "360", vente: "706" },
  pieces_accessoires: { stock: "370", vente: "707" },
  services: { stock: "", vente: "7061" },
};

export const articleService = {
  async createArticle(data: ArticleInsert) {
    const comptes = FAMILLE_COMPTE_MAP[data.famille] ?? { stock: "", vente: "" };
    const { data: result, error } = await supabase
      .from("articles")
      .insert({
        ...data,
        compte_stock: data.compte_stock ?? comptes.stock,
        compte_vente: data.compte_vente ?? comptes.vente,
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateArticle(id: string, data: ArticleUpdate) {
    const { data: result, error } = await supabase
      .from("articles")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getArticlesByEntreprise(
    entrepriseId: string,
    famille?: FamilleProduit
  ) {
    let query = supabase
      .from("articles")
      .select("*, categories_articles(nom)")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .order("nom");

    if (famille) query = query.eq("famille", famille);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getArticleById(id: string) {
    const { data, error } = await supabase
      .from("articles")
      .select("*, categories_articles(nom)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteArticle(id: string) {
    const { error } = await supabase
      .from("articles")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  async getCategories(entrepriseId: string) {
    const { data, error } = await supabase
      .from("categories_articles")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .order("nom");
    if (error) throw error;
    return data ?? [];
  },

  async createCategorie(data: {
    entreprise_id: string;
    famille: "marchandises_generales" | "pieces_accessoires";
    nom: string;
  }) {
    const { data: result, error } = await supabase
      .from("categories_articles")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async setPrixVente(articleId: string, stationId: string, prix: number) {
    const { data, error } = await supabase
      .from("prix_vente_articles")
      .upsert({
        article_id: articleId,
        station_id: stationId,
        prix_vente: prix,
        date_effet: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async searchArticles(entrepriseId: string, search: string) {
    const { data, error } = await supabase
      .from("articles")
      .select("*, categories_articles(nom), prix_vente_articles(prix_vente, station_id)")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .ilike("nom", `%${search}%`)
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
};
