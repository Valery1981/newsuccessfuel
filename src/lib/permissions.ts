export const MANAGER_PERMISSIONS = {
  dashboard: {
    label: "Dashboard",
    description: "Voir le tableau de bord",
    section: "Général" as const,
  },
  structure_view: {
    label: "Structure — Consulter",
    description: "Voir le plan comptable, tiers, articles, trésoreries",
    section: "Structure" as const,
  },
  traitement_achat_carburant_view: {
    label: "Achat carburant — Voir",
    description: "Consulter les bons de commande carburant",
    section: "Traitement" as const,
  },
  traitement_achat_carburant_write: {
    label: "Achat carburant — Créer BC",
    description: "Créer et modifier des bons de commande",
    section: "Traitement" as const,
  },
  traitement_achat_carburant_mouvementer: {
    label: "Achat carburant — Mouvementer",
    description: "Enregistrer les mouvements de stock carburant",
    section: "Traitement" as const,
  },
  traitement_achat_carburant_comptabiliser: {
    label: "Achat carburant — Comptabiliser",
    description: "Passer les écritures comptables après réception",
    section: "Traitement" as const,
  },
  traitement_vente_carburant_view: {
    label: "Vente carburant — Voir",
    description: "Consulter les shifts de vente carburant",
    section: "Traitement" as const,
  },
  traitement_vente_carburant_cloture: {
    label: "Vente carburant — Clôturer shift",
    description: "Clôturer et valider un shift pompiste",
    section: "Traitement" as const,
  },
  traitement_boutique_pos: {
    label: "POS Boutique — Opérer la caisse",
    description: "Enregistrer les ventes boutique au point de vente",
    section: "Traitement" as const,
  },
  traitement_boutique_achat: {
    label: "Boutique — Achats",
    description: "Créer des bons d'achat boutique",
    section: "Traitement" as const,
  },
  traitement_inventaire_view: {
    label: "Inventaire — Voir",
    description: "Consulter l'état des stocks",
    section: "Traitement" as const,
  },
  traitement_inventaire_regulariser: {
    label: "Inventaire — Régulariser",
    description: "Corriger les écarts d'inventaire",
    section: "Traitement" as const,
  },
  traitement_transfert_stock: {
    label: "Transfert de stock",
    description: "Effectuer des transferts de stock inter-stations",
    section: "Traitement" as const,
  },
  traitement_operations: {
    label: "Opérations hors vente",
    description: "Charges courantes, salaires, créances, dettes, immobilisations",
    section: "Traitement" as const,
  },
  doleances: {
    label: "Doléances — Créer & Voir",
    description: "Soumettre et suivre les doléances",
    section: "Traitement" as const,
  },
  rapports_financiers: {
    label: "Rapports financiers",
    description: "Bilan, Compte de résultat, Balance âgée",
    section: "Rapports" as const,
  },
  rapports_commerciaux: {
    label: "Rapports commerciaux",
    description: "CA par produit, par pompiste, marges",
    section: "Rapports" as const,
  },
  rapports_stocks: {
    label: "Rapports stocks",
    description: "Mouvements, valorisation, CMUP",
    section: "Rapports" as const,
  },
} as const;

export type PermissionKey = keyof typeof MANAGER_PERMISSIONS;
export type PermissionsRecord = Partial<Record<PermissionKey, boolean>>;

export const ALL_PERMISSION_KEYS = Object.keys(
  MANAGER_PERMISSIONS
) as PermissionKey[];

export const PERMISSION_SECTIONS = ["Général", "Structure", "Traitement", "Rapports"] as const;
export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];

export function permissionsBySection(section: PermissionSection): PermissionKey[] {
  return ALL_PERMISSION_KEYS.filter(
    (k) => MANAGER_PERMISSIONS[k].section === section
  );
}
