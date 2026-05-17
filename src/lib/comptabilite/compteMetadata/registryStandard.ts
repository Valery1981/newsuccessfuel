import { def } from "@/lib/comptabilite/compteMetadata/registryHelpers";
import type { CompteDefinition } from "@/lib/comptabilite/compteMetadata/types";

const NO_INIT = {};
const TRESO = { tresorerie: true };
const STOCK = { stock: true };
const IMMO = { immobilisation: true };
const CREANCE = { creance: true };
const DETTE = { dette: true };
const CAPITAL = { capital: true };

const TIERS_FOURN = { lieTiersFournisseur: true };
const TIERS_CLIENT = { lieTiersClient: true };
const TIERS_EMP_DETTE = { lieTiersEmployeDette: true };
const TIERS_EMP_CREANCE = { lieTiersEmployeCreance: true };
const CENTRAL = { centralisateur: true, peutRecevoirEcritureDirecte: false };

/** Plan comptable standard SuccessFuel (78 comptes — aligné fix-auth-rls-complete.sql). */
const DEFINITIONS: CompteDefinition[] = [
  // ── Classe 1 ──
  def("101", "Capital", 1, "PASSIF", "CREDIT", "CAPITAL", CAPITAL),
  def(
    "120",
    "Résultat net de l'exercice",
    1,
    "PASSIF",
    "CREDIT",
    "RESULTAT_EXERCICE",
    NO_INIT,
  ),
  def(
    "161",
    "Emprunts à long terme",
    1,
    "PASSIF",
    "CREDIT",
    "EMPRUNT_LONG_TERME",
    DETTE,
  ),
  def(
    "455",
    "Comptes courants associés",
    1,
    "PASSIF",
    "CREDIT",
    "DETTE_ASSOCIE",
    DETTE,
    { lieTiersAssocie: true },
  ),
  def(
    "457",
    "Dividendes à distribuer",
    1,
    "PASSIF",
    "CREDIT",
    "DIVIDENDE_A_PAYER",
    DETTE,
  ),

  // ── Classe 2 ──
  def("211", "Matériels et mobilier de bureau", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),
  def("215", "Matériels roulants", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),
  def("218", "Matériels informatiques", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),
  def("220", "Matériels et outillages", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),
  def("228", "Équipements spécifiques", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),
  def("240", "Cautions et dépôts de garantie", 2, "ACTIF", "DEBIT", "IMMOBILISATION", IMMO),

  // ── Classe 3 ──
  def("310", "Stock Essence (SP95/SP91)", 3, "ACTIF", "DEBIT", "STOCK_CARBURANT", STOCK),
  def("320", "Stock Gasoil", 3, "ACTIF", "DEBIT", "STOCK_CARBURANT", STOCK),
  def("330", "Stock Pétrole lampant", 3, "ACTIF", "DEBIT", "STOCK_CARBURANT", STOCK),
  def("340", "Stock Lubrifiants", 3, "ACTIF", "DEBIT", "STOCK_CARBURANT", STOCK),
  def("350", "Stock GPL", 3, "ACTIF", "DEBIT", "STOCK_CARBURANT", STOCK),
  def("360", "Stock Marchandises générales", 3, "ACTIF", "DEBIT", "STOCK_BOUTIQUE", STOCK),
  def("370", "Stock Pièces et accessoires autos", 3, "ACTIF", "DEBIT", "STOCK_BOUTIQUE", STOCK),

  // ── Classe 4 ──
  def("401", "Fournisseurs", 4, "PASSIF", "CREDIT", "DETTE_FOURNISSEUR", DETTE, TIERS_FOURN),
  def("411", "Clients", 4, "ACTIF", "DEBIT", "CREANCE_CLIENT", CREANCE, TIERS_CLIENT),
  def(
    "421",
    "Rémunérations dues",
    4,
    "PASSIF",
    "CREDIT",
    "DETTE_SALARIALE",
    DETTE,
    TIERS_EMP_DETTE,
  ),
  def("431", "CNAPS à payer", 4, "PASSIF", "CREDIT", "DETTE_SOCIALE", DETTE),
  def("432", "OSTIE à payer", 4, "PASSIF", "CREDIT", "DETTE_SOCIALE", DETTE),
  def("444", "IR à payer", 4, "PASSIF", "CREDIT", "DETTE_FISCALE", DETTE),
  def("447", "IRSA à payer", 4, "PASSIF", "CREDIT", "DETTE_FISCALE", DETTE),
  def("4454", "TVA à payer", 4, "PASSIF", "CREDIT", "DETTE_FISCALE", DETTE),
  def(
    "460",
    "Responsabilité opérationnelle",
    4,
    "ACTIF",
    "DEBIT",
    "CREANCE_EMPLOYE",
    CREANCE,
    TIERS_EMP_CREANCE,
  ),

  // ── Classe 5 ──
  def("512", "Banque", 5, "ACTIF", "DEBIT", "TRESORERIE", TRESO),
  def("513", "Mobile Money", 5, "ACTIF", "DEBIT", "TRESORERIE", TRESO),
  def("514", "Note de crédit", 5, "ACTIF", "DEBIT", "TRESORERIE", TRESO),
  def("530", "Caisse", 5, "ACTIF", "DEBIT", "TRESORERIE", TRESO),

  // ── Classe 6 ──
  def("601", "Petit outillage et accessoires divers", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("602", "Fournitures de bureau", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def(
    "603",
    "Coût des ventes (centralisateur)",
    6,
    "CHARGE",
    "DEBIT",
    "CAMV",
    NO_INIT,
    CENTRAL,
    { isCentralisateur: true },
  ),
  def("6031", "CAMV Essence", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6032", "CAMV Gasoil", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6033", "CAMV Pétrole lampant", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6034", "CAMV Marchandises générales", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6035", "CAMV Lubrifiants", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6036", "CAMV GPL", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("6037", "CAMV Pièces et accessoires", 6, "CHARGE", "DEBIT", "CAMV", NO_INIT, {}, { numeroParent: "603" }),
  def("605", "Eau et électricité", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("606", "Fournitures administratives", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("611", "Locations", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("612", "Entretien et réparations", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("613", "Primes d'assurances", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("614", "Personnel extérieur", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("615", "Consultance", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("616", "Publications, impression et marketing", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("617", "Frais de transport", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("618", "Missions et réception", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("619", "Frais de télécommunications", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("620", "Services bancaires", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("630", "Impôts et taxes diverses", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("640", "Salaires", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("651", "Écarts négatifs sur carburants", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("652", "Écarts négatifs sur articles boutique", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("653", "Pertes sur cessions d'immobilisations", 6, "CHARGE", "DEBIT", "CHARGE_EXCEPTIONNELLE"),
  def("654", "Pertes sur créances irrécouvrables", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),
  def("661", "Charges financières", 6, "CHARGE", "DEBIT", "CHARGE_FINANCIERE"),
  def("690", "Impôt sur les bénéfices", 6, "CHARGE", "DEBIT", "CHARGE_EXPLOITATION"),

  // ── Classe 7 ──
  def(
    "706",
    "Prestations de services (centralisateur)",
    7,
    "PRODUIT",
    "CREDIT",
    "PRODUIT_PRESTATION",
    NO_INIT,
    CENTRAL,
    { isCentralisateur: true },
  ),
  def("7061", "Vente Lavage", 7, "PRODUIT", "CREDIT", "PRODUIT_PRESTATION", NO_INIT, {}, { numeroParent: "706" }),
  def("7062", "Vente Vulcanisation", 7, "PRODUIT", "CREDIT", "PRODUIT_PRESTATION", NO_INIT, {}, { numeroParent: "706" }),
  def("7063", "Vente Parking", 7, "PRODUIT", "CREDIT", "PRODUIT_PRESTATION", NO_INIT, {}, { numeroParent: "706" }),
  def("7069", "Autres prestations", 7, "PRODUIT", "CREDIT", "PRODUIT_PRESTATION", NO_INIT, {}, { numeroParent: "706" }),
  def(
    "707",
    "Ventes produits (centralisateur)",
    7,
    "PRODUIT",
    "CREDIT",
    "PRODUIT_VENTE",
    NO_INIT,
    CENTRAL,
    { isCentralisateur: true },
  ),
  def("7071", "Vente Essence", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7072", "Vente Gasoil", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7073", "Vente Pétrole lampant", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7074", "Vente Marchandises générales", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7075", "Vente Lubrifiants", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7076", "Vente GPL", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("7077", "Vente Pièces et accessoires", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE", NO_INIT, {}, { numeroParent: "707" }),
  def("751", "Écarts positifs sur carburants", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE"),
  def("752", "Écarts positifs sur articles boutique", 7, "PRODUIT", "CREDIT", "PRODUIT_VENTE"),
  def("753", "Gains sur cessions d'immobilisations", 7, "PRODUIT", "CREDIT", "PRODUIT_EXCEPTIONNEL"),
  def("761", "Produits financiers", 7, "PRODUIT", "CREDIT", "PRODUIT_FINANCIER"),
];

export const STANDARD_REGISTRY: ReadonlyMap<string, CompteDefinition> = new Map(
  DEFINITIONS.map((d) => [d.numero, d]),
);

export const STANDARD_ACCOUNT_NUMEROS = DEFINITIONS.map((d) => d.numero);
