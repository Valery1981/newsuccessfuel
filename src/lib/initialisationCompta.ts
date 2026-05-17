/**
 * Logique A Nouveau — initialisation (§9 Guide, règle Enregistrer).
 */

import { assertCompteUsage, resolveRacineStandard } from "@/lib/comptabilite/compteMetadata";

export type InitialisationModule =
  | "cuves"
  | "stock_boutique"
  | "pistolets"
  | "tresorerie"
  | "creances"
  | "dettes"
  | "immobilisations"
  | "autres_dettes";

export interface InitialisationLigneANouveau {
  numero_compte: string;
  libelle_compte: string;
  montant: number;
  sens: "debit" | "credit";
  tiers_id?: string;
  tresorerie_id?: string;
}

export const FAMILLE_STOCK_COMPTE: Record<string, string> = {
  lubrifiants: "340",
  gpl: "350",
  marchandises_generales: "360",
  pieces_accessoires: "370",
};

export const FAMILLE_STOCK_LIBELLE: Record<string, string> = {
  "310": "Stock Essence",
  "320": "Stock Gasoil",
  "330": "Stock Pétrole lampant",
  "340": "Stock Lubrifiants",
  "350": "Stock GPL",
  "360": "Stock Marchandises générales",
  "370": "Stock Pièces et accessoires autos",
};

export function calculerPrixAchatCarburant(
  prixVente: number,
  margeLitre: number,
): number {
  return Math.max(0, prixVente - margeLitre);
}

export function calculerValeurStock(
  quantite: number,
  prixUnitaire: number,
): number {
  if (quantite <= 0 || prixUnitaire <= 0) return 0;
  return Math.round(quantite * prixUnitaire * 100) / 100;
}

/** Agrège les valeurs cuves par compte stock (310/320/330). */
export function aggregateCuvesParCompteStock(
  entries: Array<{ compte_stock: string; valeur: number }>,
): InitialisationLigneANouveau[] {
  const byAccount = new Map<string, number>();
  for (const e of entries) {
    if (e.valeur <= 0 || !e.compte_stock) continue;
    byAccount.set(
      e.compte_stock,
      (byAccount.get(e.compte_stock) ?? 0) + e.valeur,
    );
  }
  return Array.from(byAccount.entries()).map(([numero, montant]) => ({
    numero_compte: numero,
    libelle_compte: FAMILLE_STOCK_LIBELLE[numero] ?? `Stock ${numero}`,
    montant: Math.round(montant * 100) / 100,
    sens: "debit" as const,
  }));
}

/** Agrège le stock boutique par compte stock (340–370). */
export function aggregateBoutiqueParCompteStock(
  entries: Array<{ famille: string; valeur: number }>,
): InitialisationLigneANouveau[] {
  const byAccount = new Map<string, number>();
  for (const e of entries) {
    if (e.valeur <= 0) continue;
    const compte = FAMILLE_STOCK_COMPTE[e.famille];
    if (!compte) continue;
    byAccount.set(compte, (byAccount.get(compte) ?? 0) + e.valeur);
  }
  return Array.from(byAccount.entries()).map(([numero, montant]) => ({
    numero_compte: numero,
    libelle_compte: FAMILLE_STOCK_LIBELLE[numero] ?? `Stock ${numero}`,
    montant: Math.round(montant * 100) / 100,
    sens: "debit" as const,
  }));
}

export function comptesToLignesANouveau(
  entries: Array<{
    numero_compte: string;
    libelle_compte: string;
    solde_debit: number;
    solde_credit: number;
    tiers_id?: string;
    tresorerie_id?: string;
  }>,
): InitialisationLigneANouveau[] {
  const lignes: InitialisationLigneANouveau[] = [];
  for (const e of entries) {
    const net = e.solde_debit - e.solde_credit;
    if (net > 0) {
      lignes.push({
        numero_compte: e.numero_compte,
        libelle_compte: e.libelle_compte,
        montant: net,
        sens: "debit",
        tiers_id: e.tiers_id,
        tresorerie_id: e.tresorerie_id,
      });
    } else if (net < 0) {
      lignes.push({
        numero_compte: e.numero_compte,
        libelle_compte: e.libelle_compte,
        montant: Math.abs(net),
        sens: "credit",
        tiers_id: e.tiers_id,
        tresorerie_id: e.tresorerie_id,
      });
    }
  }
  return lignes;
}

/** Valide les lignes A Nouveau avant envoi RPC (421 interdit en créances, etc.). */
export function validateLignesInitialisation(
  module: InitialisationModule,
  lignes: InitialisationLigneANouveau[],
): void {
  for (const l of lignes) {
    const racine = resolveRacineStandard(l.numero_compte);

    if (module === "creances") {
      if (racine === "421" || l.numero_compte.startsWith("421")) {
        throw new Error(
          `Créances : le compte ${l.numero_compte} est interdit. Utilisez le compte 460 pour les employés.`,
        );
      }
      assertCompteUsage(l.numero_compte, "INITIALISATION_CREANCE");
    } else if (module === "dettes") {
      assertCompteUsage(l.numero_compte, "INITIALISATION_DETTE");
    } else if (module === "tresorerie") {
      assertCompteUsage(l.numero_compte, "INITIALISATION_TRESORERIE");
    } else if (module === "immobilisations") {
      assertCompteUsage(l.numero_compte, "INITIALISATION_IMMOBILISATION");
    } else if (module === "cuves" || module === "stock_boutique") {
      assertCompteUsage(l.numero_compte, "INITIALISATION_STOCK");
    }
  }
}
