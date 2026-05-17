import {
  assertParentExists,
  findParentNumero,
  getStandardDefinition,
} from "@/lib/comptabilite/compteMetadata/inheritance";
import {
  CompteMetadataError,
  type CompteDefinition,
  type CompteMetadataResolved,
  type CompteMetadataSource,
} from "@/lib/comptabilite/compteMetadata/types";

function inheritFromParent(
  numeroComplet: string,
  parent: CompteDefinition,
  source: CompteMetadataSource,
): CompteMetadataResolved {
  const suffix = numeroComplet.slice(parent.numero.length);
  const libelle =
    suffix && suffix !== parent.numero
      ? `${parent.libelle}${suffix.startsWith("-") ? "" : " "}${suffix.replace(/^-/, " — ")}`
      : parent.libelle;

  return {
    numero: parent.numero,
    libelle,
    classe: parent.classe,
    nature: parent.nature,
    sensNormal: parent.sensNormal,
    categorie: parent.categorie,
    comportement: parent.comportement,
    isCentralisateur: parent.isCentralisateur,
    numeroParent: parent.numeroParent,
    numeroComplet,
    numeroParentEffectif: parent.numero,
    heriteDe: parent.numero,
    source,
  };
}

/**
 * Résout les métadonnées d'un numéro de compte (racine standard ou sous-compte).
 * Lance CompteMetadataError si le parent est introuvable (pas de fallback par classe).
 */
export function resolveCompte(numeroComplet: string): CompteMetadataResolved {
  const numero = numeroComplet.trim();
  if (!numero) {
    throw new CompteMetadataError("Numéro de compte vide", numeroComplet);
  }

  const exact = getStandardDefinition(numero);
  if (exact) {
    return {
      ...exact,
      numeroComplet: numero,
      numeroParentEffectif: exact.numeroParent ?? findParentNumero(numero) ?? exact.numero,
      heriteDe: exact.numero,
      source: "standard",
    };
  }

  const parentNumero = findParentNumero(numero);
  if (!parentNumero) {
    throw new CompteMetadataError(
      `Compte « ${numero} » inconnu : aucun parent dans le registre standard`,
      numero,
    );
  }

  const parent = assertParentExists(parentNumero, numero);
  return inheritFromParent(numero, parent, "prefix_inheritance");
}

/** Racine standard (sans tiret ni suffixe) à partir d'un numéro complet. */
export function resolveRacineStandard(numeroComplet: string): string {
  return resolveCompte(numeroComplet).heriteDe;
}
