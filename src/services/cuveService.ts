import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

const supabase = createClient();

type CuveInsert = Database["public"]["Tables"]["cuves"]["Insert"];
type CuveUpdate = Database["public"]["Tables"]["cuves"]["Update"];
type CalibrageInsert = Database["public"]["Tables"]["calibrages"]["Insert"];

export const cuveService = {
  async createCuve(data: CuveInsert) {
    const { data: result, error } = await supabase
      .from("cuves")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getCuvesByStation(stationId: string) {
    const { data, error } = await supabase
      .from("cuves")
      .select("*, calibrages(*)")
      .eq("station_id", stationId)
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  },

  async updateCuve(id: string, data: CuveUpdate) {
    const { data: result, error } = await supabase
      .from("cuves")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteCuve(id: string) {
    const { error } = await supabase.from("cuves").delete().eq("id", id);
    if (error) throw error;
  },

  async saveCalibrages(cuveId: string, calibrages: Array<{ hauteur_cm: number; volume_litres: number }>) {
    // Delete existing
    await supabase.from("calibrages").delete().eq("cuve_id", cuveId);

    if (calibrages.length === 0) return;

    const rows: CalibrageInsert[] = calibrages.map((c) => ({
      cuve_id: cuveId,
      hauteur_cm: c.hauteur_cm,
      volume_litres: c.volume_litres,
    }));

    const { error } = await supabase.from("calibrages").insert(rows);
    if (error) throw error;
  },

  async getVolumeFromJauge(cuveId: string, jaugeCm: number) {
    const { data, error } = await supabase.rpc("get_volume_from_jauge", {
      p_cuve_id: cuveId,
      p_jauge_cm: jaugeCm,
    });
    if (error) throw error;
    return data as number;
  },
};
