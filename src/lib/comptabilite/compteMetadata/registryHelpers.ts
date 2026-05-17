import type {
  CategorieComptable,
  ComportementComptable,
  ComportementInitialisation,
  ComportementOperations,
  CompteDefinition,
  NatureComptable,
  SensNormal,
} from "@/lib/comptabilite/compteMetadata/types";

type InitFlags = Partial<ComportementInitialisation>;
type OpFlags = Partial<ComportementOperations>;

function defaultBilan(nature: NatureComptable) {
  if (nature === "ACTIF") return "ACTIF" as const;
  if (nature === "PASSIF") return "PASSIF" as const;
  return null;
}

function defaultResultat(nature: NatureComptable) {
  if (nature === "CHARGE") return "CHARGE" as const;
  if (nature === "PRODUIT") return "PRODUIT" as const;
  return null;
}

export function buildComportement(
  nature: NatureComptable,
  init: InitFlags = {},
  ops: OpFlags = {},
): ComportementComptable {
  const initialisation: ComportementInitialisation = {
    immobilisation: init.immobilisation ?? false,
    stock: init.stock ?? false,
    tresorerie: init.tresorerie ?? false,
    creance: init.creance ?? false,
    dette: init.dette ?? false,
    capital: init.capital ?? false,
  };
  const operations: ComportementOperations = {
    lieTiersFournisseur: ops.lieTiersFournisseur ?? false,
    lieTiersClient: ops.lieTiersClient ?? false,
    lieTiersEmployeDette: ops.lieTiersEmployeDette ?? false,
    lieTiersEmployeCreance: ops.lieTiersEmployeCreance ?? false,
    lieTiersAssocie: ops.lieTiersAssocie ?? false,
    centralisateur: ops.centralisateur ?? false,
    peutRecevoirEcritureDirecte: ops.peutRecevoirEcritureDirecte ?? true,
  };
  return {
    bilan: defaultBilan(nature),
    resultat: defaultResultat(nature),
    initialisation,
    operations,
  };
}

export function def(
  numero: string,
  libelle: string,
  classe: CompteDefinition["classe"],
  nature: NatureComptable,
  sensNormal: SensNormal,
  categorie: CategorieComptable,
  init: InitFlags = {},
  ops: OpFlags = {},
  extra?: { isCentralisateur?: boolean; numeroParent?: string | null },
): CompteDefinition {
  return {
    numero,
    libelle,
    classe,
    nature,
    sensNormal,
    categorie,
    comportement: buildComportement(nature, init, ops),
    isCentralisateur: extra?.isCentralisateur,
    numeroParent: extra?.numeroParent ?? null,
  };
}
