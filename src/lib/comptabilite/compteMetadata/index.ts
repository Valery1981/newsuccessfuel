export * from "@/lib/comptabilite/compteMetadata/types";
export {
  STANDARD_REGISTRY,
  STANDARD_ACCOUNT_NUMEROS,
} from "@/lib/comptabilite/compteMetadata/registryStandard";
export { findParentNumero, getStandardDefinition } from "@/lib/comptabilite/compteMetadata/inheritance";
export { resolveCompte, resolveRacineStandard } from "@/lib/comptabilite/compteMetadata/resolver";
export {
  assertCompteUsage,
  resolveTiersCompteCreance,
  resolveTiersCompteDette,
  resolveTiersCompteDetteEmploye,
  resolveTiersCompteDetteFournisseur,
  listComptesInitialisationDetteHorsTiers,
  isImmobilisationInit,
  isTresorerieInit,
  isStockInit,
} from "@/lib/comptabilite/compteMetadata/usages";
