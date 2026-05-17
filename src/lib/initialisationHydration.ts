import { calculerValeurStock } from "@/lib/initialisationCompta";
import { interpolateVolume } from "@/lib/utils";

export interface CuveGaugeState {
  jauge_cm: string;
  volume_litres: string;
  prix_achat: string;
}

type CuveStagingRow = {
  cuve_id: string | null;
  station_id: string | null;
  jauge_initiale_cm: number;
  volume_initial_litres: number;
  prix_achat_initial: number;
};

type PistoletStagingRow = {
  pistolet_id: string | null;
  station_id: string | null;
  index_initial: number;
};

type StockBoutiqueStagingRow = {
  article_id: string | null;
  station_id: string | null;
  quantite_initiale: number;
  prix_achat_initial: number;
  valeur_stock: number | null;
};

type CompteStagingRow = {
  onglet: string | null;
  numero_compte: string;
  solde_debit: number | null;
  solde_credit: number | null;
  tiers_id: string | null;
  tresorerie_id: string | null;
};

export function mapStagingCuvesToState(
  rows: CuveStagingRow[],
  stationId: string,
): Record<string, CuveGaugeState> {
  const out: Record<string, CuveGaugeState> = {};
  for (const row of rows) {
    if (row.station_id !== stationId || !row.cuve_id) continue;
    out[row.cuve_id] = {
      jauge_cm: String(row.jauge_initiale_cm),
      volume_litres: String(row.volume_initial_litres),
      prix_achat: String(row.prix_achat_initial),
    };
  }
  return out;
}

export function mapStagingPistoletsToState(
  rows: PistoletStagingRow[],
  stationId: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.station_id !== stationId || !row.pistolet_id) continue;
    out[row.pistolet_id] = String(row.index_initial);
  }
  return out;
}

export function mapStagingBoutiqueToState(
  rows: StockBoutiqueStagingRow[],
  stationId: string,
): {
  stocks: Record<string, { qty: string; value: number }>;
  prixAchat: Record<string, string>;
} {
  const stocks: Record<string, { qty: string; value: number }> = {};
  const prixAchat: Record<string, string> = {};
  for (const row of rows) {
    if (row.station_id !== stationId || !row.article_id) continue;
    const pa = row.prix_achat_initial;
    const qty = row.quantite_initiale;
    prixAchat[row.article_id] = String(pa);
    stocks[row.article_id] = {
      qty: String(qty),
      value:
        row.valeur_stock != null && row.valeur_stock > 0
          ? row.valeur_stock
          : calculerValeurStock(qty, pa),
    };
  }
  return { stocks, prixAchat };
}

export function mapStagingComptesToState(rows: CompteStagingRow[]): {
  tresorerieSoldes: Record<string, string>;
  creancesSoldes: Record<string, string>;
  dettesSoldes: Record<string, string>;
  dettesComptesSoldes: Record<string, string>;
  immobilisations: Record<string, string>;
} {
  const tresorerieSoldes: Record<string, string> = {};
  const creancesSoldes: Record<string, string> = {};
  const dettesSoldes: Record<string, string> = {};
  const dettesComptesSoldes: Record<string, string> = {};
  const immobilisations: Record<string, string> = {};

  for (const row of rows) {
    const onglet = row.onglet ?? "";
    if (onglet === "tresorerie" && row.tresorerie_id) {
      const montant = Number(row.solde_debit) || 0;
      if (montant > 0) tresorerieSoldes[row.tresorerie_id] = String(montant);
      continue;
    }
    if (onglet === "tiers" && row.tiers_id) {
      const debit = Number(row.solde_debit) || 0;
      const credit = Number(row.solde_credit) || 0;
      if (debit > 0) creancesSoldes[row.tiers_id] = String(debit);
      if (credit > 0) dettesSoldes[row.tiers_id] = String(credit);
      continue;
    }
    if (onglet === "autres_dettes") {
      const credit = Number(row.solde_credit) || 0;
      if (credit > 0) dettesComptesSoldes[row.numero_compte] = String(credit);
      continue;
    }
    if (onglet === "immobilisations") {
      const montant = Number(row.solde_debit) || 0;
      if (montant > 0) immobilisations[row.numero_compte] = String(montant);
    }
  }

  return {
    tresorerieSoldes,
    creancesSoldes,
    dettesSoldes,
    dettesComptesSoldes,
    immobilisations,
  };
}

/** Volume affiché : recalcul depuis jauge si calibrée, sinon volume enregistré. */
export function getCuveDisplayVolume(
  calibrages: Array<{ hauteur_cm: number; volume_litres: number }> | undefined,
  data?: Pick<CuveGaugeState, "jauge_cm" | "volume_litres">,
): number {
  const jauge = Number(data?.jauge_cm) || 0;
  if (jauge > 0 && calibrages && calibrages.length > 0) {
    return interpolateVolume(calibrages, jauge);
  }
  return Number(data?.volume_litres) || 0;
}
