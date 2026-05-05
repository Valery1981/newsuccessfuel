import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export type CompteStandard = { numero: string; libelle: string; classe: number };

export const comptesService = {
  async getChargeAccounts(entrepriseId: string): Promise<CompteStandard[]> {
    const { data: ent } = await supabase
      .from("plan_comptable_entreprise")
      .select("numero, libelle, classe")
      .eq("entreprise_id", entrepriseId)
      .gte("numero", "600")
      .lt("numero", "700")
      .eq("is_active", true)
      .eq("is_centralisateur", false)
      .order("numero");
    if (ent && ent.length > 0) return ent as CompteStandard[];
    const { data: std } = await supabase
      .from("plan_comptable_standard")
      .select("numero, libelle, classe")
      .gte("numero", "600")
      .lt("numero", "700")
      .eq("is_centralisateur", false)
      .order("numero");
    return (std ?? []) as CompteStandard[];
  },

  async getImmobilisationAccounts(): Promise<CompteStandard[]> {
    const { data } = await supabase
      .from("plan_comptable_standard")
      .select("numero, libelle, classe")
      .gte("numero", "200")
      .lt("numero", "300")
      .order("numero");
    return (data ?? []) as CompteStandard[];
  },

  async getStandardByNumero(numero: string): Promise<CompteStandard | null> {
    const { data } = await supabase
      .from("plan_comptable_standard")
      .select("numero, libelle, classe")
      .eq("numero", numero)
      .maybeSingle();
    return data as CompteStandard | null;
  },
};
