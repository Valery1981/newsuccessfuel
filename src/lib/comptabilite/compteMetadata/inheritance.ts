import { STANDARD_REGISTRY } from "@/lib/comptabilite/compteMetadata/registryStandard";
import {
  CompteMetadataError,
  type CompteDefinition,
} from "@/lib/comptabilite/compteMetadata/types";

/** Racines du registre standard, triées par longueur décroissante (préfixe le plus long d'abord). */
const REGISTRY_ROOTS_BY_LENGTH = [...STANDARD_REGISTRY.keys()].sort(
  (a, b) => b.length - a.length,
);

/**
 * Détermine le numéro parent d'un compte (racine standard ou sous-compte avec tiret).
 * Retourne null uniquement si le compte est une racine du registre sans parent explicite.
 */
export function findParentNumero(numeroComplet: string): string | null {
  const numero = numeroComplet.trim();
  if (!numero) {
    throw new CompteMetadataError("Numéro de compte vide", numeroComplet);
  }

  const exact = STANDARD_REGISTRY.get(numero);
  if (exact?.numeroParent) return exact.numeroParent;

  const dashIdx = numero.indexOf("-");
  if (dashIdx > 0) {
    return numero.slice(0, dashIdx);
  }

  if (exact) return null;

  for (const root of REGISTRY_ROOTS_BY_LENGTH) {
    if (numero !== root && numero.startsWith(root)) {
      return root;
    }
  }

  return null;
}

export function getStandardDefinition(numero: string): CompteDefinition | undefined {
  return STANDARD_REGISTRY.get(numero);
}

export function assertParentExists(parentNumero: string, numeroComplet: string): CompteDefinition {
  const parent =
    STANDARD_REGISTRY.get(parentNumero) ??
    (() => {
      const inheritedParent = findParentNumero(parentNumero);
      if (!inheritedParent) return undefined;
      return STANDARD_REGISTRY.get(inheritedParent);
    })();

  if (!parent) {
    throw new CompteMetadataError(
      `Compte parent « ${parentNumero} » introuvable pour « ${numeroComplet} »`,
      numeroComplet,
    );
  }
  return parent;
}
