import type { AchatStatut } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface AchatBoutique {
  id: string;
  entreprise_id: string | null;
  station_id: string | null;
  numero_facture: string | null;
  numero_interne: string | null;
  fournisseur_id: string | null;
  fournisseur_non_defini: boolean;
  date_facture: string | null;
  montant_total: number;
  montant_cash: number;
  montant_credit: number;
  echeance_credit: string | null;
  statut: AchatStatut;
  mouvemente_at: string | null;
  comptabilise_at: string | null;
  created_by: string | null;
  created_at: string;
  station_nom?: string;
  fournisseur_nom?: string;
}

export interface LigneAchatBoutique {
  id: string;
  achat_id: string;
  article_id: string | null;
  quantite: number;
  prix_achat_unitaire: number;
  total_ligne: number | null;
  article_nom?: string;
  article_unite?: string;
}

export interface PaiementAchatBoutique {
  id: string;
  achat_id: string;
  tresorerie_id: string | null;
  montant: number;
  date_paiement: string;
}

export interface NouvelAchatBoutiqueData {
  entreprise_id: string;
  station_id: string;
  fournisseur_id: string | null;
  fournisseur_non_defini: boolean;
  numero_facture: string | null;
  date_facture: string;
  montant_cash: number;
  montant_credit: number;
  echeance_credit: string | null;
  tresorerie_id: string | null;
  created_by: string | null;
  lignes: Array<{
    article_id: string;
    quantite: number;
    prix_achat_unitaire: number;
  }>;
}

export const achatBoutiqueService = {
  async getAchatsByStations(stationIds: string[]): Promise<AchatBoutique[]> {
    if (stationIds.length === 0) return [];
    const { data, error } = await supabase
      .from("achats_boutique")
      .select("*, stations!station_id(nom), tiers!fournisseur_id(nom)")
      .in("station_id", stationIds)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const station = r.stations as Record<string, unknown> | null;
      const fournisseur = r.tiers as Record<string, unknown> | null;
      return {
        ...r,
        station_nom: station?.nom as string | undefined,
        fournisseur_nom: fournisseur?.nom as string | undefined,
      } as AchatBoutique;
    });
  },

  async getLignesAchat(achatId: string): Promise<LigneAchatBoutique[]> {
    const { data, error } = await supabase
      .from("lignes_achat_boutique")
      .select("*, articles!article_id(nom, unite)")
      .eq("achat_id", achatId);
    if (error) throw error;
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      const article = r.articles as Record<string, unknown> | null;
      return {
        ...r,
        article_nom: article?.nom as string | undefined,
        article_unite: article?.unite as string | undefined,
      } as LigneAchatBoutique;
    });
  },

  async creerAchat(data: NouvelAchatBoutiqueData): Promise<AchatBoutique> {
    const montantTotal = data.lignes.reduce(
      (acc, l) => acc + l.quantite * l.prix_achat_unitaire,
      0,
    );

    const { data: achat, error } = await supabase
      .from("achats_boutique")
      .insert({
        entreprise_id: data.entreprise_id,
        station_id: data.station_id,
        fournisseur_id: data.fournisseur_id,
        fournisseur_non_defini: data.fournisseur_non_defini,
        numero_facture: data.numero_facture,
        date_facture: data.date_facture,
        montant_total: montantTotal,
        montant_cash: data.montant_cash,
        montant_credit: data.montant_credit,
        echeance_credit: data.echeance_credit,
        statut: "brouillon" as AchatStatut,
        created_by: data.created_by,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (!achat) throw new Error("Erreur lors de la création de l'achat");

    const achatRow = achat as unknown as AchatBoutique;

    const lignesInsert = data.lignes.map((l) => ({
      achat_id: achatRow.id,
      article_id: l.article_id,
      quantite: l.quantite,
      prix_achat_unitaire: l.prix_achat_unitaire,
    }));

    const { error: lignesError } = await supabase
      .from("lignes_achat_boutique")
      .insert(lignesInsert);
    if (lignesError) throw lignesError;

    if (data.tresorerie_id && data.montant_cash > 0) {
      const { error: paieError } = await supabase
        .from("paiements_achat_boutique")
        .insert({
          achat_id: achatRow.id,
          tresorerie_id: data.tresorerie_id,
          montant: data.montant_cash,
          date_paiement: data.date_facture,
        });
      if (paieError) throw paieError;
    }

    return achatRow;
  },

  async mouvementerStock(achatId: string): Promise<void> {
    const { data: lignes, error: lignesError } = await supabase
      .from("lignes_achat_boutique")
      .select("article_id, quantite, prix_achat_unitaire")
      .eq("achat_id", achatId);
    if (lignesError) throw lignesError;

    const { data: achat, error: achatError } = await supabase
      .from("achats_boutique")
      .select("station_id")
      .eq("id", achatId)
      .single();
    if (achatError) throw achatError;

    const achatRow = achat as unknown as { station_id: string };
    const stationId = achatRow.station_id;

    for (const ligne of (lignes ?? []) as unknown as Array<{
      article_id: string;
      quantite: number;
      prix_achat_unitaire: number;
    }>) {
      const { data: stockExistant } = await supabase
        .from("stocks_boutique")
        .select("id, quantite, cmup")
        .eq("article_id", ligne.article_id)
        .eq("station_id", stationId)
        .maybeSingle();

      if (stockExistant) {
        const stockRow = stockExistant as unknown as {
          id: string;
          quantite: number;
          cmup: number;
        };
        const newQty = stockRow.quantite + ligne.quantite;
        const newCmup =
          newQty === 0
            ? ligne.prix_achat_unitaire
            : (stockRow.quantite * stockRow.cmup +
                ligne.quantite * ligne.prix_achat_unitaire) /
              newQty;

        const { error: updateError } = await supabase
          .from("stocks_boutique")
          .update({
            quantite: newQty,
            cmup: newCmup,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockRow.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("stocks_boutique")
          .insert({
            article_id: ligne.article_id,
            station_id: stationId,
            quantite: ligne.quantite,
            cmup: ligne.prix_achat_unitaire,
            updated_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
      }
    }

    const { error } = await supabase
      .from("achats_boutique")
      .update({
        statut: "mouvemente" as AchatStatut,
        mouvemente_at: new Date().toISOString(),
      })
      .eq("id", achatId);
    if (error) throw error;
  },

  async comptabiliser(achatId: string): Promise<void> {
    const { error } = await supabase
      .from("achats_boutique")
      .update({
        statut: "comptabilise" as AchatStatut,
        comptabilise_at: new Date().toISOString(),
      })
      .eq("id", achatId);
    if (error) throw error;
  },
};
