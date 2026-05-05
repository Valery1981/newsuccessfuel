import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

const supabase = createClient();

type CamionRow = Database["public"]["Tables"]["camions"]["Row"];
type CamionInsert = Database["public"]["Tables"]["camions"]["Insert"];
type CamionUpdate = Database["public"]["Tables"]["camions"]["Update"];

export interface CompartimentForm {
  numero: number;
  volume_max: number;
}

export interface CamionAvecCompartiments extends CamionRow {
  compartiments: Array<{ id: string; numero: number; volume_max: number }>;
}

export const camionService = {
  async getCamionsByEntreprise(entrepriseId: string): Promise<CamionAvecCompartiments[]> {
    const { data, error } = await supabase
      .from("camions")
      .select("*, compartiments_camion(*)")
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((c) => {
      const { compartiments_camion, ...camion } = c as typeof c & {
        compartiments_camion: Array<{ id: string; numero: number; volume_max: number }>;
      };
      return {
        ...camion,
        compartiments: (compartiments_camion ?? []).sort((a, b) => a.numero - b.numero),
      };
    });
  },

  async createCamion(
    data: CamionInsert,
    compartiments: CompartimentForm[]
  ): Promise<CamionRow> {
    const { data: camion, error } = await supabase
      .from("camions")
      .insert(data)
      .select()
      .single();
    if (error) throw error;

    if (compartiments.length > 0) {
      const { error: compError } = await supabase
        .from("compartiments_camion")
        .insert(compartiments.map((c) => ({ camion_id: camion.id, numero: c.numero, volume_max: c.volume_max })));
      if (compError) throw compError;
    }
    return camion;
  },

  async updateCamion(
    id: string,
    data: CamionUpdate,
    compartiments: CompartimentForm[]
  ): Promise<CamionRow> {
    const { data: camion, error } = await supabase
      .from("camions")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("compartiments_camion").delete().eq("camion_id", id);
    if (compartiments.length > 0) {
      const { error: compError } = await supabase
        .from("compartiments_camion")
        .insert(compartiments.map((c) => ({ camion_id: id, numero: c.numero, volume_max: c.volume_max })));
      if (compError) throw compError;
    }
    return camion;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("camions")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  },
};
