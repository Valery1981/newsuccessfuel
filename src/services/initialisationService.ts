import type { AccountsBundle } from "@/components/manager/initialisation/CompanyInitialisationPage";
import {
  listComptesInitialisationDetteHorsTiers,
  resolveTiersCompteCreance,
  resolveTiersCompteDette,
} from "@/lib/comptabilite/compteMetadata";
import type { CompteInitialisationScope } from "@/lib/initialisationScope";
import { compteRowMatchesScope } from "@/lib/initialisationScope";
import type { BilanOuverture } from "@/services/initialisationEcrituresService";
import { initialisationEcrituresService } from "@/services/initialisationEcrituresService";
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
    stationId: string,
    entries: Array<{
      cuve_id: string;
      station_id: string;
      jauge_initiale_cm: number;
      volume_initial_litres: number;
      prix_achat_initial: number;
    }>,
  ) {
    await supabase
      .from("initialisation_cuves")
      .delete()
      .eq("initialisation_id", initialisationId)
      .eq("station_id", stationId);

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
    stationId: string,
    entries: Array<{
      pistolet_id: string;
      station_id: string;
      index_initial: number;
    }>,
  ) {
    await supabase
      .from("initialisation_index_pistolets")
      .delete()
      .eq("initialisation_id", initialisationId)
      .eq("station_id", stationId);

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
    stationId: string,
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
      .eq("initialisation_id", initialisationId)
      .eq("station_id", stationId);

    if (entries.length === 0) return;

    const { error } = await supabase
      .from("initialisation_stocks_boutique")
      .insert(
        entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
      );
    if (error) throw error;
  },

  /**
   * Remplace uniquement les lignes du périmètre en cours (onglet entreprise),
   * sans effacer les autres modules entreprise déjà enregistrés.
   */
  async saveInitialisationComptes(
    initialisationId: string,
    scope: CompteInitialisationScope,
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
    const { data: existing, error: fetchError } = await supabase
      .from("initialisation_comptes")
      .select(
        "numero_compte, libelle_compte, solde_debit, solde_credit, tiers_id, tresorerie_id, onglet",
      )
      .eq("initialisation_id", initialisationId);
    if (fetchError) throw fetchError;

    const kept = (existing ?? []).filter(
      (row) =>
        !compteRowMatchesScope(
          { ...row, onglet: row.onglet ?? "" },
          scope,
        ),
    );

    await supabase
      .from("initialisation_comptes")
      .delete()
      .eq("initialisation_id", initialisationId);

    const merged = [
      ...kept.map((row) => ({
        ...row,
        initialisation_id: initialisationId,
      })),
      ...entries.map((e) => ({ ...e, initialisation_id: initialisationId })),
    ];

    if (merged.length === 0) return;

    const { error } = await supabase
      .from("initialisation_comptes")
      .insert(merged);
    if (error) throw error;
  },

  /** Verrouillage uniquement — les A Nouveau sont créés à chaque Enregistrer. */
  async validerInitialisation(
    initialisationId: string,
    entrepriseId: string,
    compteId: string,
  ) {
    return initialisationEcrituresService.validerLock(
      initialisationId,
      entrepriseId,
      compteId,
    );
  },

  async getBilanOuverture(initialisationId: string): Promise<BilanOuverture> {
    return initialisationEcrituresService.getBilanOuverture(initialisationId);
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

  async getOpeningBalanceSummary(initialisationId: string) {
    return initialisationEcrituresService.getBilanOuverture(initialisationId);
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
        .select("id, compte_principal, compte_responsabilite, nom, type")
        .eq("entreprise_id", entrepriseId)
        .eq("is_active", true)
        .in("type", ["client", "employe"]),
      supabase
        .from("tiers")
        .select("id, compte_principal, compte_responsabilite, nom, type")
        .eq("entreprise_id", entrepriseId)
        .eq("is_active", true)
        .in("type", ["fournisseur", "employe"]),
      supabase
        .from("plan_comptable_standard")
        .select("numero, libelle")
        .gte("numero", "200")
        .lt("numero", "300"),
    ]);

    const dettesHorsTiers = listComptesInitialisationDetteHorsTiers().map((d) => ({
      account_id: d.numero,
      label: d.libelle,
    }));

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
        account_id: resolveTiersCompteCreance({
          type: t.type,
          compte_principal: t.compte_principal,
          compte_responsabilite: t.compte_responsabilite,
        }),
        label: t.nom,
        type: t.type,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payable: (payable.data ?? []).map((t: any) => ({
        id: t.id,
        account_id: resolveTiersCompteDette({
          type: t.type,
          compte_principal: t.compte_principal,
          compte_responsabilite: t.compte_responsabilite,
        }),
        label: t.nom,
        type: t.type,
      })),
      dettes_comptes: dettesHorsTiers,
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
