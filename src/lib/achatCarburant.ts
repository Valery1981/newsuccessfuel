/**
 * Logique métier Achat carburant — Guide §10.1 / §8.5
 */

import { calculerPrixAchatCarburant } from "@/lib/prixCarburant";

export const MSG_PRIX_CARBURANT_MANQUANT =
  "Aucun prix carburant actif trouvé pour cette station et ce carburant. Veuillez d'abord définir le prix dans Structure > Prix carburant.";

export interface ReceptionLigneCalculee {
  volumeAvant: number;
  volumeApres: number;
  volumeConstate: number;
  ecartLivraison: number;
}

/**
 * Contrôle jauge par cuve — écart indicatif =
 * (volume après − volume avant) − total nominal livré (tous compartiments).
 */
export function calculerControleJaugeCuve(
  volumeAvantLitres: number,
  volumeApresLitres: number,
  totalNominalLivre: number,
): ReceptionLigneCalculee {
  const volumeConstate =
    Math.round((volumeApresLitres - volumeAvantLitres) * 1000) / 1000;
  const ecartLivraison =
    Math.round((volumeConstate - totalNominalLivre) * 1000) / 1000;
  return {
    volumeAvant: volumeAvantLitres,
    volumeApres: volumeApresLitres,
    volumeConstate,
    ecartLivraison,
  };
}

/** @deprecated Utiliser calculerControleJaugeCuve (jauge par cuve, pas par compartiment) */
export function calculerReceptionVolumes(
  _jaugeAvantCm: number,
  _jaugeApresCm: number,
  volumeNominal: number,
  volumeAvantLitres: number,
  volumeApresLitres: number,
): ReceptionLigneCalculee {
  return calculerControleJaugeCuve(
    volumeAvantLitres,
    volumeApresLitres,
    volumeNominal,
  );
}

export interface CompartimentReceptionGroupe {
  compartiment_id: string;
  compartiment_numero?: number;
  volume_nominal: number;
}

export interface ReceptionCuveGroupe {
  cuve_id: string;
  station_id: string;
  cuve_nom?: string;
  station_nom?: string;
  type_carburant_id?: string;
  type_label?: string;
  compartiments: CompartimentReceptionGroupe[];
  total_nominal_livre: number;
  jauge_avant_cm: number | null;
  jauge_apres_cm: number | null;
  volume_avant_litres: number | null;
  volume_apres_litres: number | null;
  ecart_indicatif: number | null;
}

/** Regroupe les lignes réception (1 row / compartiment) par cuve pour affichage et contrôle jauge. */
export function grouperReceptionsParCuve(
  lignes: Array<{
    cuve_id: string;
    station_id: string;
    cuve_nom?: string | null;
    station_nom?: string | null;
    compartiment_id?: string | null;
    compartiment_numero?: number | null;
    volume_nominal: number;
    jauge_avant_cm?: number | null;
    jauge_apres_cm?: number | null;
    volume_avant_litres?: number | null;
    volume_apres_litres?: number | null;
  }>,
): ReceptionCuveGroupe[] {
  const map = new Map<string, ReceptionCuveGroupe>();

  for (const l of lignes) {
    let g = map.get(l.cuve_id);
    if (!g) {
      g = {
        cuve_id: l.cuve_id,
        station_id: l.station_id,
        cuve_nom: l.cuve_nom ?? undefined,
        station_nom: l.station_nom ?? undefined,
        compartiments: [],
        total_nominal_livre: 0,
        jauge_avant_cm: l.jauge_avant_cm ?? null,
        jauge_apres_cm: l.jauge_apres_cm ?? null,
        volume_avant_litres: l.volume_avant_litres ?? null,
        volume_apres_litres: l.volume_apres_litres ?? null,
        ecart_indicatif: null,
      };
      map.set(l.cuve_id, g);
    }
    if (l.jauge_avant_cm != null && g.jauge_avant_cm == null) {
      g.jauge_avant_cm = l.jauge_avant_cm;
      g.volume_avant_litres = l.volume_avant_litres ?? null;
    }
    if (l.jauge_apres_cm != null && g.jauge_apres_cm == null) {
      g.jauge_apres_cm = l.jauge_apres_cm;
      g.volume_apres_litres = l.volume_apres_litres ?? null;
    }
    g.compartiments.push({
      compartiment_id: l.compartiment_id ?? "",
      compartiment_numero: l.compartiment_numero ?? undefined,
      volume_nominal: l.volume_nominal,
    });
    g.total_nominal_livre += l.volume_nominal;
  }

  for (const g of map.values()) {
    if (
      g.volume_avant_litres != null &&
      g.volume_apres_litres != null &&
      g.total_nominal_livre > 0
    ) {
      g.ecart_indicatif = calculerControleJaugeCuve(
        g.volume_avant_litres,
        g.volume_apres_litres,
        g.total_nominal_livre,
      ).ecartLivraison;
    }
  }

  return [...map.values()];
}

export function calculerCmupAchatCarburant(
  stockAncien: number,
  cmupAncien: number,
  volumeLivre: number,
  prixAchat: number,
): number {
  const denom = stockAncien + volumeLivre;
  if (denom <= 0) return prixAchat;
  return (
    Math.round(
      ((stockAncien * cmupAncien + volumeLivre * prixAchat) / denom) * 10000,
    ) / 10000
  );
}

export function resolveCompteStockCarburant(
  compteStockCuve: string | null | undefined,
  compteStockType: string | null | undefined,
): string {
  const c = (compteStockCuve ?? compteStockType ?? "310").trim();
  return c || "310";
}

export function buildReferenceAchatCarburant(
  numeroBc: string,
  numeroBl?: string | null,
): string {
  return numeroBl ? `${numeroBc} + ${numeroBl}` : numeroBc;
}

export interface LigneComptaStockAchat {
  numeroCompte: string;
  libelleCompte: string;
  debit: number;
  credit: number;
  libelle?: string;
}

/** Comptabilisation stock : D 310/320/330 — C 401 (Guide §10.1) */
export function buildLignesComptaStockAchatCarburant(
  lignes: Array<{
    compteStock: string;
    libelleStock: string;
    montant: number;
  }>,
  compteFournisseur: string,
  libelleFournisseur: string,
  libelleEcriture: string,
): LigneComptaStockAchat[] {
  const total = lignes.reduce((s, l) => s + l.montant, 0);
  if (total <= 0) return [];

  const out: LigneComptaStockAchat[] = lignes
    .filter((l) => l.montant > 0)
    .map((l) => ({
      numeroCompte: l.compteStock,
      libelleCompte: l.libelleStock,
      debit: Math.round(l.montant * 100) / 100,
      credit: 0,
      libelle: libelleEcriture,
    }));

  out.push({
    numeroCompte: compteFournisseur,
    libelleCompte: libelleFournisseur,
    debit: 0,
    credit: Math.round(total * 100) / 100,
    libelle: libelleEcriture,
  });

  return out;
}

export function buildLignesComptaPaiementAchatCarburant(params: {
  montant: number;
  compteFournisseur: string;
  libelleFournisseur: string;
  compteTresorerie: string;
  libelleTresorerie: string;
  referenceBc: string;
}): LigneComptaStockAchat[] {
  const m = Math.round(params.montant * 100) / 100;
  return [
    {
      numeroCompte: params.compteFournisseur,
      libelleCompte: params.libelleFournisseur,
      debit: m,
      credit: 0,
      libelle: `Paiement BC ${params.referenceBc}`,
    },
    {
      numeroCompte: params.compteTresorerie,
      libelleCompte: params.libelleTresorerie,
      debit: 0,
      credit: m,
      libelle: `Paiement BC ${params.referenceBc}`,
    },
  ];
}

export function montantLigneReception(
  volumeNominal: number,
  prixAchatUnitaire: number,
): number {
  return Math.round(volumeNominal * prixAchatUnitaire * 100) / 100;
}

export function prixAchatFromRow(
  prixAchat: number | null,
  prixVente: number,
  margeLitre: number,
): number {
  if (prixAchat != null && Number.isFinite(prixAchat)) return prixAchat;
  return calculerPrixAchatCarburant(prixVente, margeLitre);
}
