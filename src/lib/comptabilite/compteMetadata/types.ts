/** Nature comptable (bilan ou résultat). */
export type NatureComptable = "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT";

/** Sens du solde normal attendu. */
export type SensNormal = "DEBIT" | "CREDIT";

/** Catégorie métier SuccessFuel. */
export type CategorieComptable =
  | "CAPITAL"
  | "RESULTAT_EXERCICE"
  | "EMPRUNT_LONG_TERME"
  | "DETTE_ASSOCIE"
  | "DIVIDENDE_A_PAYER"
  | "IMMOBILISATION"
  | "STOCK_CARBURANT"
  | "STOCK_BOUTIQUE"
  | "DETTE_FOURNISSEUR"
  | "CREANCE_CLIENT"
  | "DETTE_SALARIALE"
  | "DETTE_SOCIALE"
  | "DETTE_FISCALE"
  | "CREANCE_EMPLOYE"
  | "TRESORERIE"
  | "CAMV"
  | "CHARGE_EXPLOITATION"
  | "CHARGE_FINANCIERE"
  | "CHARGE_EXCEPTIONNELLE"
  | "PRODUIT_PRESTATION"
  | "PRODUIT_VENTE"
  | "PRODUIT_FINANCIER"
  | "PRODUIT_EXCEPTIONNEL";

export type BilanSide = "ACTIF" | "PASSIF" | "HORS_BILAN";

export interface ComportementInitialisation {
  immobilisation: boolean;
  stock: boolean;
  tresorerie: boolean;
  creance: boolean;
  dette: boolean;
  capital: boolean;
}

export interface ComportementOperations {
  lieTiersFournisseur: boolean;
  lieTiersClient: boolean;
  lieTiersEmployeDette: boolean;
  lieTiersEmployeCreance: boolean;
  lieTiersAssocie: boolean;
  centralisateur: boolean;
  peutRecevoirEcritureDirecte: boolean;
}

export interface ComportementComptable {
  bilan: BilanSide | null;
  resultat: "CHARGE" | "PRODUIT" | null;
  initialisation: ComportementInitialisation;
  operations: ComportementOperations;
}

export interface CompteDefinition {
  numero: string;
  libelle: string;
  classe: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  nature: NatureComptable;
  sensNormal: SensNormal;
  categorie: CategorieComptable;
  comportement: ComportementComptable;
  isCentralisateur?: boolean;
  numeroParent?: string | null;
}

export type CompteMetadataSource =
  | "standard"
  | "entreprise"
  | "prefix_inheritance";

export interface CompteMetadataResolved extends CompteDefinition {
  numeroComplet: string;
  numeroParentEffectif: string;
  heriteDe: string;
  source: CompteMetadataSource;
}

export type CompteUsage =
  | "INITIALISATION_CREANCE"
  | "INITIALISATION_DETTE"
  | "INITIALISATION_TRESORERIE"
  | "INITIALISATION_IMMOBILISATION"
  | "INITIALISATION_STOCK"
  | "INITIALISATION_CAPITAL"
  | "BILAN_ACTIF"
  | "BILAN_PASSIF"
  | "COMPTE_RESULTAT_CHARGE"
  | "COMPTE_RESULTAT_PRODUIT"
  | "ECRITURE_DIRECTE";

export class CompteMetadataError extends Error {
  constructor(
    message: string,
    public readonly numeroComplet: string,
  ) {
    super(message);
    this.name = "CompteMetadataError";
  }
}
