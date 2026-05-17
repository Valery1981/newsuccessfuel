/**
 * Logique métier prix carburant — §6.5 / Guide §8.5.
 */

export const PRIX_CARBURANT_CONFIRM_WARNINGS = [
  "Chaque enregistrement crée une nouvelle ligne historisée — les prix passés ne sont jamais modifiés ni supprimés.",
  "Les ventes, shifts et opérations déjà enregistrés conservent le prix qui était en vigueur à leur date.",
  "Le nouveau prix s'appliquera aux opérations futures à partir de la date d'effet (aujourd'hui).",
  "Le prix d'achat est calculé automatiquement (prix de vente − marge) et ne peut pas être saisi manuellement.",
] as const;

export interface PrixCarburantConfirmSummary {
  stationNom: string;
  typeLabel: string;
  prixVente: number;
  margeLitre: number;
  prixAchat: number;
  dateEffetLabel: string;
}

export function calculerPrixAchatCarburant(
  prixVente: number,
  margeLitre: number,
): number {
  return prixVente - margeLitre;
}

export function formatDateEffetAujourdhui(locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(),
  );
}

export function buildPrixCarburantConfirmSummary(params: {
  stationNom: string;
  typeLabel: string;
  prixVente: number;
  margeLitre: number;
  dateEffetLabel?: string;
}): PrixCarburantConfirmSummary {
  return {
    stationNom: params.stationNom,
    typeLabel: params.typeLabel,
    prixVente: params.prixVente,
    margeLitre: params.margeLitre,
    prixAchat: calculerPrixAchatCarburant(params.prixVente, params.margeLitre),
    dateEffetLabel: params.dateEffetLabel ?? formatDateEffetAujourdhui(),
  };
}

/** Avertissement si un prix existe déjà pour ce type à la date du jour. */
export function getPrixDejaEnregistreAujourdhuiWarning(
  hasPrixToday: boolean,
): string | null {
  if (!hasPrixToday) return null;
  return "Un prix a déjà été enregistré aujourd'hui pour ce type de carburant : un nouvel enregistrement sera ajouté à l'historique (le précédent du jour reste consultable).";
}

export function hasPrixCarburantPourDate(
  rows: Array<{ type_carburant_id: string | null; date_effet: string }>,
  typeCarburantId: string,
  dateIso: string,
): boolean {
  return rows.some(
    (r) =>
      r.type_carburant_id === typeCarburantId &&
      r.date_effet.startsWith(dateIso),
  );
}

export const PRIX_CARBURANT_ACHAT_MANQUANT =
  "Aucun prix carburant actif trouvé pour cette station et ce carburant. Veuillez d'abord définir le prix dans Structure > Prix carburant.";

export interface PrixCarburantHistoriqueRow {
  type_carburant_id: string | null;
  date_effet: string;
  prix_vente: number;
  marge_litre: number;
  prix_achat?: number | null;
  created_at?: string | null;
}

export interface PrixAchatCarburantResolu {
  prixAchat: number;
  prixVente: number;
  margeLitre: number;
  dateEffet: string;
}

/** Dernier prix actif à la date de référence (date_effet ≤ dateReference). */
export function selectPrixCarburantActifPourDate(
  rows: PrixCarburantHistoriqueRow[],
  typeCarburantId: string,
  dateReference: string,
): PrixAchatCarburantResolu | null {
  const ref = dateReference.slice(0, 10);
  const candidates = rows
    .filter(
      (r) =>
        r.type_carburant_id === typeCarburantId &&
        r.date_effet.slice(0, 10) <= ref,
    )
    .sort((a, b) => {
      const d = b.date_effet.localeCompare(a.date_effet);
      if (d !== 0) return d;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  const row = candidates[0];
  if (!row) return null;
  const prixAchat =
    row.prix_achat != null && Number.isFinite(row.prix_achat)
      ? row.prix_achat
      : calculerPrixAchatCarburant(row.prix_vente, row.marge_litre);
  if (prixAchat <= 0) return null;
  return {
    prixAchat,
    prixVente: row.prix_vente,
    margeLitre: row.marge_litre,
    dateEffet: row.date_effet.slice(0, 10),
  };
}

export function calculerMontantLigneAchatCarburant(
  quantiteLitres: number,
  prixAchatUnitaire: number,
): number {
  if (quantiteLitres <= 0 || prixAchatUnitaire <= 0) return 0;
  return Math.round(quantiteLitres * prixAchatUnitaire * 100) / 100;
}
