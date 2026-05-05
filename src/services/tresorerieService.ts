import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

const supabase = createClient();

type TresorerieInsert = Database["public"]["Tables"]["tresoreries"]["Insert"];
type TresorerieUpdate = Database["public"]["Tables"]["tresoreries"]["Update"];

export const tresorerieService = {
  async createTresorerie(data: {
    entreprise_id: string;
    type: "banque" | "mobile_money" | "note_credit" | "caisse";
    libelle: string;
  }) {
    // Generate account number via SQL function
    const { data: numeroCompte, error: numError } = await supabase.rpc(
      "generer_numero_tresorerie",
      {
        p_entreprise_id: data.entreprise_id,
        p_type: data.type,
      }
    );
    if (numError) throw numError;

    const { data: result, error } = await supabase
      .from("tresoreries")
      .insert({
        ...data,
        numero_compte: numeroCompte as string,
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getTresoreriesByEntreprise(entrepriseId: string) {
    const { data, error } = await supabase
      .from("tresoreries")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .order("type");
    if (error) throw error;
    return data ?? [];
  },

  async updateTresorerie(id: string, data: TresorerieUpdate) {
    const { data: result, error } = await supabase
      .from("tresoreries")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteTresorerie(id: string) {
    const { error } = await supabase
      .from("tresoreries")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  async getSolde(id: string) {
    const { data, error } = await supabase
      .from("tresoreries")
      .select("solde_actuel")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data?.solde_actuel ?? 0;
  },
};
