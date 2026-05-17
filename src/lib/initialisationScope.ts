import { resolveCompte } from "@/lib/comptabilite/compteMetadata";
import type { InitialisationModule } from "@/lib/initialisationCompta";

/** Modules rattachés à une station (écritures avec station_id). */
export const STATION_ECRITURE_MODULES = [
  "cuves",
  "stock_boutique",
] as const satisfies readonly InitialisationModule[];

/** Modules opérationnels station sans écriture comptable. */
export const STATION_OPERATIONAL_MODULES = ["pistolets"] as const;

export const STATION_MODULES = [
  ...STATION_ECRITURE_MODULES,
  ...STATION_OPERATIONAL_MODULES,
] as const;

/** Modules entreprise (écritures : station_id = NULL, is_central = true). */
export const ENTERPRISE_MODULES = [
  "tresorerie",
  "creances",
  "dettes",
  "immobilisations",
  "autres_dettes",
] as const satisfies readonly InitialisationModule[];

export type CompteInitialisationScope =
  | "tresorerie"
  | "creances"
  | "dettes"
  | "immobilisations";

export interface InitialisationCompteRow {
  onglet: string;
  numero_compte: string;
}

/** Indique si une ligne staging appartient au périmètre en cours d'enregistrement. */
export function compteRowMatchesScope(
  row: InitialisationCompteRow,
  scope: CompteInitialisationScope,
): boolean {
  try {
    const init = resolveCompte(row.numero_compte).comportement.initialisation;
    if (scope === "tresorerie") {
      return init.tresorerie && row.onglet === "tresorerie";
    }
    if (scope === "immobilisations") {
      return init.immobilisation && row.onglet === "immobilisations";
    }
    if (scope === "creances") {
      return init.creance && row.onglet === "tiers";
    }
    if (scope === "dettes") {
      return (
        init.dette &&
        (row.onglet === "tiers" || row.onglet === "autres_dettes")
      );
    }
  } catch {
    return false;
  }
  return false;
}

/** Valide la cohérence module ↔ station_id avant appel RPC. */
export function assertModuleStationScope(
  module: InitialisationModule,
  stationId: string | null,
): void {
  if (
    (ENTERPRISE_MODULES as readonly string[]).includes(module) &&
    stationId != null
  ) {
    throw new Error(
      `Module entreprise « ${module} » : les écritures doivent être centralisées (station_id = null)`,
    );
  }
  if (
    (STATION_ECRITURE_MODULES as readonly string[]).includes(module) &&
    !stationId
  ) {
    throw new Error(
      `Module station « ${module} » : station_id obligatoire`,
    );
  }
}
