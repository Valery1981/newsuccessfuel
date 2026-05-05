import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

const supabase = createClient();

type PistoletInsert = Database["public"]["Tables"]["pistolets"]["Insert"];
type PistoletUpdate = Database["public"]["Tables"]["pistolets"]["Update"];

export const pistoletService = {
  async createPistolet(data: PistoletInsert) {
    const { data: result, error } = await supabase
      .from("pistolets")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getPistoletsByStation(stationId: string) {
    const { data, error } = await supabase
      .from("pistolets")
      .select("*, cuves(nom, type_carburant)")
      .eq("station_id", stationId)
      .eq("is_active", true)
      .order("numero");
    if (error) throw error;
    return data ?? [];
  },

  async updatePistolet(id: string, data: PistoletUpdate) {
    const { data: result, error } = await supabase
      .from("pistolets")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateIndex(id: string, indexFinal: number) {
    const { data, error } = await supabase
      .from("pistolets")
      .update({ index_actuel: indexFinal })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePistolet(id: string) {
    const { error } = await supabase
      .from("pistolets")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },
};
