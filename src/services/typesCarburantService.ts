import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

/**
 * Référentiel des types de carburant.
 * - Types globaux : `partenaire_id IS NULL` (gérés par le superadmin, visibles par tous).
 * - Types spécifiques partenaire : `partenaire_id` rempli, visibles uniquement par le
 *   partenaire concerné et les gérants des stations sous sa tutelle.
 *
 * Seul le superadmin peut créer/modifier/supprimer (cf. RLS `types_carburant_*`).
 */
export type TypeCarburantRow =
  Database["public"]["Tables"]["types_carburant"]["Row"];

export interface CreateTypeCarburantInput {
  code: string;
  label: string;
  partenaire_id?: string | null;
  compte_stock: string;
  compte_vente: string;
  ordre?: number;
}

export interface UpdateTypeCarburantInput {
  code?: string;
  label?: string;
  partenaire_id?: string | null;
  compte_stock?: string;
  compte_vente?: string;
  ordre?: number;
  actif?: boolean;
}

export const typesCarburantService = {
  /** Liste tous les types visibles (RLS filtre selon le rôle). */
  async list(): Promise<TypeCarburantRow[]> {
    const { data, error } = await supabase
      .from("types_carburant")
      .select("*")
      .order("partenaire_id", { ascending: true, nullsFirst: true })
      .order("ordre", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Liste les types actifs uniquement (pour les selects). */
  async listActive(): Promise<TypeCarburantRow[]> {
    const { data, error } = await supabase
      .from("types_carburant")
      .select("*")
      .eq("actif", true)
      .order("partenaire_id", { ascending: true, nullsFirst: true })
      .order("ordre", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Récupère un type par id. */
  async getById(id: string): Promise<TypeCarburantRow | null> {
    const { data, error } = await supabase
      .from("types_carburant")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Création (superadmin uniquement, contrôlé par RLS). */
  async create(input: CreateTypeCarburantInput): Promise<TypeCarburantRow> {
    const payload: Database["public"]["Tables"]["types_carburant"]["Insert"] = {
      code: input.code.toUpperCase().trim(),
      label: input.label.trim(),
      partenaire_id: input.partenaire_id ?? null,
      compte_stock: input.compte_stock,
      compte_vente: input.compte_vente,
      ordre: input.ordre ?? 0,
    };
    const { data, error } = await supabase
      .from("types_carburant")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Mise à jour (superadmin uniquement, contrôlé par RLS). */
  async update(
    id: string,
    input: UpdateTypeCarburantInput,
  ): Promise<TypeCarburantRow> {
    const payload: Database["public"]["Tables"]["types_carburant"]["Update"] = {
      ...input,
      ...(input.code ? { code: input.code.toUpperCase().trim() } : {}),
      ...(input.label ? { label: input.label.trim() } : {}),
    };
    const { data, error } = await supabase
      .from("types_carburant")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Désactivation (soft delete). */
  async setActif(id: string, actif: boolean): Promise<TypeCarburantRow> {
    return this.update(id, { actif });
  },

  /** Suppression dure (superadmin uniquement). À éviter si des FK pointent dessus. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("types_carburant")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
