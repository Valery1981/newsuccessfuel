import { createClient } from "@/utils/supabase/client";
import type { Database, TiersType } from "@/types/supabase";

const supabase = createClient();

type TiersInsert = Database["public"]["Tables"]["tiers"]["Insert"];
type TiersUpdate = Database["public"]["Tables"]["tiers"]["Update"];

export const tiersService = {
  async createTiers(data: TiersInsert) {
    // Generate compte number via SQL function
    const { data: numeroCompte, error: numError } = await supabase.rpc(
      "generer_numero_tiers",
      {
        p_entreprise_id: data.entreprise_id as string,
        p_type: data.type,
      }
    );
    if (numError) throw numError;

    const insertData: TiersInsert = {
      ...data,
      compte_principal: numeroCompte as string,
    };

    // For employees, also generate compte_responsabilite (460-xxx)
    if (data.type === "employe") {
      // This is done via a separate insert or trigger in production
      insertData.compte_responsabilite = (numeroCompte as string).replace("421", "460");
    }

    const { data: result, error } = await supabase
      .from("tiers")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateTiers(id: string, data: TiersUpdate) {
    const { data: result, error } = await supabase
      .from("tiers")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getTiersByEntreprise(entrepriseId: string, type?: TiersType) {
    let query = supabase
      .from("tiers")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .order("nom");

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getTiersById(id: string) {
    const { data, error } = await supabase
      .from("tiers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTiers(id: string) {
    const { error } = await supabase
      .from("tiers")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  async getFournisseurs(entrepriseId: string) {
    return this.getTiersByEntreprise(entrepriseId, "fournisseur");
  },

  async getClients(entrepriseId: string) {
    return this.getTiersByEntreprise(entrepriseId, "client");
  },

  async getEmployes(entrepriseId: string) {
    return this.getTiersByEntreprise(entrepriseId, "employe");
  },
};
