import { STANDARD_REGISTRY } from "@/lib/comptabilite/compteMetadata/registryStandard";
import { resolveCompte, resolveRacineStandard } from "@/lib/comptabilite/compteMetadata/resolver";
import {
  CompteMetadataError,
  type CompteDefinition,
  type CompteMetadataResolved,
  type CompteUsage,
} from "@/lib/comptabilite/compteMetadata/types";

export type TiersTypeInitialisation = "client" | "employe" | "fournisseur";

export interface TiersComptesRefs {
  type: string;
  compte_principal: string | null;
  compte_responsabilite?: string | null;
}

/** Numéro de compte à utiliser pour une créance initiale selon le type de tiers. */
export function resolveTiersCompteCreance(tiers: TiersComptesRefs): string {
  if (tiers.type === "client") {
    if (!tiers.compte_principal) {
      throw new CompteMetadataError("Client sans compte_principal", "");
    }
    return tiers.compte_principal;
  }
  if (tiers.type === "employe") {
    const numero = tiers.compte_responsabilite;
    if (!numero) {
      throw new CompteMetadataError(
        "Employé sans compte_responsabilite (460 attendu)",
        tiers.compte_principal ?? "",
      );
    }
    return numero;
  }
  throw new CompteMetadataError(
    `Type tiers « ${tiers.type} » non éligible aux créances initiales`,
    tiers.compte_principal ?? "",
  );
}

/** Numéro de compte pour une dette initiale liée à un fournisseur (401-xxx). */
export function resolveTiersCompteDetteFournisseur(tiers: TiersComptesRefs): string {
  if (tiers.type !== "fournisseur") {
    throw new CompteMetadataError(
      `Type tiers « ${tiers.type} » non éligible aux dettes fournisseurs`,
      tiers.compte_principal ?? "",
    );
  }
  if (!tiers.compte_principal) {
    throw new CompteMetadataError("Fournisseur sans compte_principal", "");
  }
  return tiers.compte_principal;
}

/** Numéro de compte pour une dette salariale initiale liée à un employé (421-xxx). */
export function resolveTiersCompteDetteEmploye(tiers: TiersComptesRefs): string {
  if (tiers.type !== "employe") {
    throw new CompteMetadataError(
      `Type tiers « ${tiers.type} » non éligible aux dettes salariales employé`,
      tiers.compte_principal ?? "",
    );
  }
  if (!tiers.compte_principal) {
    throw new CompteMetadataError(
      "Employé sans compte_principal (421 attendu)",
      "",
    );
  }
  return tiers.compte_principal;
}

/** Compte de dette initiale selon le type de tiers (fournisseur ou employé). */
export function resolveTiersCompteDette(tiers: TiersComptesRefs): string {
  if (tiers.type === "fournisseur") return resolveTiersCompteDetteFournisseur(tiers);
  if (tiers.type === "employe") return resolveTiersCompteDetteEmploye(tiers);
  throw new CompteMetadataError(
    `Type tiers « ${tiers.type} » non éligible aux dettes initiales`,
    tiers.compte_principal ?? "",
  );
}

function usageAllowed(meta: CompteMetadataResolved, usage: CompteUsage): boolean {
  const init = meta.comportement.initialisation;
  switch (usage) {
    case "INITIALISATION_CREANCE":
      return init.creance;
    case "INITIALISATION_DETTE":
      return init.dette;
    case "INITIALISATION_TRESORERIE":
      return init.tresorerie;
    case "INITIALISATION_IMMOBILISATION":
      return init.immobilisation;
    case "INITIALISATION_STOCK":
      return init.stock;
    case "INITIALISATION_CAPITAL":
      return init.capital;
    case "BILAN_ACTIF":
      return meta.comportement.bilan === "ACTIF";
    case "BILAN_PASSIF":
      return meta.comportement.bilan === "PASSIF";
    case "COMPTE_RESULTAT_CHARGE":
      return meta.comportement.resultat === "CHARGE";
    case "COMPTE_RESULTAT_PRODUIT":
      return meta.comportement.resultat === "PRODUIT";
    case "ECRITURE_DIRECTE":
      return meta.comportement.operations.peutRecevoirEcritureDirecte;
    default:
      return false;
  }
}

/** Valide qu'un numéro peut être utilisé pour un usage donné. */
export function assertCompteUsage(numeroComplet: string, usage: CompteUsage): CompteMetadataResolved {
  const meta = resolveCompte(numeroComplet);
  if (!usageAllowed(meta, usage)) {
    throw new CompteMetadataError(
      `Compte « ${numeroComplet} » (racine ${meta.heriteDe}) non autorisé pour ${usage}`,
      numeroComplet,
    );
  }
  return meta;
}

/**
 * Dettes initiales hors tiers (431, 161, 455…).
 * Exclut 401 (fournisseurs) et 421 (rémunérations dues par employé 421-xxx).
 */
export function listComptesInitialisationDetteHorsTiers(): CompteDefinition[] {
  return [...STANDARD_REGISTRY.values()].filter(
    (d) =>
      d.comportement.initialisation.dette &&
      !d.comportement.operations.lieTiersFournisseur &&
      !d.comportement.operations.lieTiersEmployeDette,
  );
}

function matchesUsage(numeroComplet: string, usage: CompteUsage): boolean {
  try {
    assertCompteUsage(numeroComplet, usage);
    return true;
  } catch {
    return false;
  }
}

/** Racines autorisées pour l'onglet immobilisations (classe 2 avec flag). */
export function isImmobilisationInit(numeroComplet: string): boolean {
  return matchesUsage(numeroComplet, "INITIALISATION_IMMOBILISATION");
}

/** Préfixe trésorerie autorisé (512, 513, 514, 530). */
export function isTresorerieInit(numeroComplet: string): boolean {
  return matchesUsage(numeroComplet, "INITIALISATION_TRESORERIE");
}

/** Stock initial 310–370. */
export function isStockInit(numeroComplet: string): boolean {
  return matchesUsage(numeroComplet, "INITIALISATION_STOCK");
}

export { resolveCompte, resolveRacineStandard, CompteMetadataError };
