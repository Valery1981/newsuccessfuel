import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface TM {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
}

export const tmService = {
  /**
   * Récupère tous les TMs actifs
   */
  async getTMs(): Promise<TM[]> {
    const { data, error } = await supabase
      .from("comptes")
      .select("id, nom, email, telephone")
      .eq("type", "tm")
      .eq("is_active", true)
      .order("nom");

    if (error) throw error;
    return data || [];
  },

  /**
   * Récupère les stations assignées à un TM
   */
  async getStationsByTM(tmId: string): Promise<
    Array<{
      id: string;
      nom: string;
      tm_id: string | null;
      entreprises: { nom: string } | null;
    }>
  > {
    const { data, error } = await supabase
      .from("stations")
      .select("id, nom, tm_id, entreprises!inner(nom)")
      .eq("tm_id", tmId);

    if (error) throw error;
    return (data || []) as unknown as Array<{
      id: string;
      nom: string;
      tm_id: string | null;
      entreprises: { nom: string } | null;
    }>;
  },

  /**
   * Assigner un TM à une station
   */
  async assignTMToStation(stationId: string, tmId: string): Promise<void> {
    const { error } = await supabase
      .from("stations")
      .update({ tm_id: tmId })
      .eq("id", stationId);

    if (error) throw error;
  },

  /**
   * Retirer le TM d'une station
   */
  async removeTMFromStation(stationId: string): Promise<void> {
    const { error } = await supabase
      .from("stations")
      .update({ tm_id: null })
      .eq("id", stationId);

    if (error) throw error;
  },
};
