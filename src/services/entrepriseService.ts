import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

const supabase = createClient();

type EntrepriseInsert = Database["public"]["Tables"]["entreprises"]["Insert"];
type EntrepriseUpdate = Database["public"]["Tables"]["entreprises"]["Update"];

export const entrepriseService = {
  async createEntreprise(data: EntrepriseInsert) {
    const { data: result, error } = await supabase
      .from("entreprises")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateEntreprise(id: string, data: EntrepriseUpdate) {
    const { data: result, error } = await supabase
      .from("entreprises")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getEntrepriseByCompte(compteId: string) {
    const { data, error } = await supabase
      .from("entreprises")
      .select("*")
      .eq("compte_id", compteId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async getEntrepriseById(id: string) {
    const { data, error } = await supabase
      .from("entreprises")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },
};
