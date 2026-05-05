import type { AccountsBundle } from "@/components/manager/initialisation/CompanyInitialisationPage";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export const initialisationService = {
  async getOrCreateInitialisation(entrepriseId: string) {
    // Try to get existing
    const { data: existing } = await supabase
      .from("initialisation")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .single();

    if (existing) return existing;

    // Create new
    const { data, error } = await supabase
      .from("initialisation")
      .insert({ entreprise_id: entrepriseId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async saveInitialisationCuves(
    initialisationId: string,
    entries: Array<{
      cuve_id: string;
      station_id: string;
      jauge_initiale_cm: number;
      volume_initial_litres: number;
      prix_achat_initial: number;
    }>,
  ) {
    // Delete existing for this initialisation
    await supabase
      .from("initialisation_cuves")
      .delete()
      .eq("initialisation_id", initialisationId);

    if (entries.length === 0) return;

    const { error } = await supabase
      .from("initialisation_cuves")
      .insert(
        entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
      );
    if (error) throw error;
  },

  async saveInitialisationIndexPistolets(
    initialisationId: string,
    entries: Array<{
      pistolet_id: string;
      station_id: string;
      index_initial: number;
    }>,
  ) {
    await supabase
      .from("initialisation_index_pistolets")
      .delete()
      .eq("initialisation_id", initialisationId);

    if (entries.length === 0) return;

    const { error } = await supabase
      .from("initialisation_index_pistolets")
      .insert(
        entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
      );
    if (error) throw error;
  },

  async saveInitialisationStocksBoutique(
    initialisationId: string,
    entries: Array<{
      article_id: string;
      station_id: string;
      quantite_initiale: number;
      prix_achat_initial: number;
    }>,
  ) {
    await supabase
      .from("initialisation_stocks_boutique")
      .delete()
      .eq("initialisation_id", initialisationId);

    if (entries.length === 0) return;

    const { error } = await supabase
      .from("initialisation_stocks_boutique")
      .insert(
        entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
      );
    if (error) throw error;
  },

  async saveInitialisationComptes(
    initialisationId: string,
    entries: Array<{
      numero_compte: string;
      libelle_compte: string;
      solde_debit: number;
      solde_credit: number;
      tiers_id?: string;
      tresorerie_id?: string;
      onglet: "immobilisations" | "tiers" | "tresorerie" | "autres_dettes";
    }>,
  ) {
    await supabase
      .from("initialisation_comptes")
      .delete()
      .eq("initialisation_id", initialisationId);

    if (entries.length === 0) return;

    const { error } = await supabase
      .from("initialisation_comptes")
      .insert(
        entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
      );
    if (error) throw error;
  },

  async validerInitialisation(initialisationId: string, compteId: string) {
    // Calculate capital net
    const { data: capitalNet } = await supabase.rpc("calculer_capital_net", {
      p_initialisation_id: initialisationId,
    });

    // Mark as validated
    const { data, error } = await supabase
      .from("initialisation")
      .update({
        est_validee: true,
        validee_at: new Date().toISOString(),
        validee_par: compteId,
        capital_net_calcule: capitalNet as number,
      })
      .eq("id", initialisationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getInitialisationData(initialisationId: string) {
    const [cuves, pistolets, stocks, comptes] = await Promise.all([
      supabase
        .from("initialisation_cuves")
        .select("*, cuves(nom, type_carburant)")
        .eq("initialisation_id", initialisationId),
      supabase
        .from("initialisation_index_pistolets")
        .select("*, pistolets(numero, type_carburant)")
        .eq("initialisation_id", initialisationId),
      supabase
        .from("initialisation_stocks_boutique")
        .select("*, articles(nom, unite)")
        .eq("initialisation_id", initialisationId),
      supabase
        .from("initialisation_comptes")
        .select("*")
        .eq("initialisation_id", initialisationId),
    ]);

    return {
      cuves: cuves.data ?? [],
      pistolets: pistolets.data ?? [],
      stocks: stocks.data ?? [],
      comptes: comptes.data ?? [],
    };
  },

  async getOpeningBalanceSummary(_entrepriseId: string) {
    // This RPC function may not exist yet - return empty structure for now
    // TODO: Implement compute_opening_balance_summary RPC in Supabase
    return {
      treasury: 0,
      receivable: 0,
      payable: 0,
      fixed_assets: 0,
      fuel: 0,
      boutique: 0,
      asset: 0,
      totalActif: 0,
      totalPassif: 0,
      capitalNet: 0,
    };
  },

  async getInitialisationAccountsBundle(
    entrepriseId: string,
  ): Promise<AccountsBundle> {
    const [treasury, receivable, payable, fixedAssets] = await Promise.all([
      supabase
        .from("tresoreries")
        .select("id, numero_compte, libelle, solde_actuel")
        .eq("entreprise_id", entrepriseId)
        .eq("is_active", true),
      supabase
        .from("tiers")
        .select("id, compte_principal, nom, type")
        .eq("entreprise_id", entrepriseId)
        .eq("is_active", true)
        .in("type", ["client", "employe"]),
      supabase
        .from("tiers")
        .select("id, compte_principal, nom, type")
        .eq("entreprise_id", entrepriseId)
        .eq("is_active", true)
        .in("type", ["fournisseur"]),
      supabase
        .from("plan_comptable_standard")
        .select("numero, libelle")
        .gte("numero", "200")
        .lt("numero", "300"),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treasury: (treasury.data ?? []).map((t: any) => ({
        id: t.id,
        numero_compte: t.numero_compte,
        libelle: t.libelle,
        solde_actuel: t.solde_actuel,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      receivable: (receivable.data ?? []).map((t: any) => ({
        id: t.id,
        account_id: t.compte_principal,
        label: t.nom,
        type: t.type,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payable: (payable.data ?? []).map((t: any) => ({
        id: t.id,
        account_id: t.compte_principal,
        label: t.nom,
        type: t.type,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fixed_assets: (fixedAssets.data ?? []).map((a: any) => ({
        account_id: a.numero,
        label: a.libelle,
      })),
    };
  },

  async getBoutiqueInitItems(entrepriseId: string) {
    const { data, error } = await supabase
      .from("articles")
      .select("id, nom, famille")
      .eq("entreprise_id", entrepriseId)
      .eq("is_active", true)
      .neq("famille", "carburants");
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((a: any) => ({
      product_id: a.id,
      product_name: a.nom,
      family_name: a.famille,
      purchase_price: 0,
    }));
  },

  async getFuelInitItems(stationId: string) {
    const { data, error } = await supabase
      .from("cuves")
      .select("id, nom, type_carburant, capacite_max")
      .eq("station_id", stationId);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((c: any) => ({
      tank_id: c.id,
      tank_name: c.nom,
      product_name: c.type_carburant,
      gauge_unit: "cm",
      purchase_price: 0,
    }));
  },
};
