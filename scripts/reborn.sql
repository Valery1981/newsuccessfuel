-- ============================================================
-- SUCCESSFUEL — SCHÉMA SQL COMPLET SUPABASE V2
-- Basé sur Guide_Document_SuccessFuel.md
-- Ajouts : materialized views, audit log, abonnements,
--          séquences auto-numérotation, RLS renforcé
-- ============================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- recherche texte optimisée

-- ============================================================
-- 1. TYPES ÉNUMÉRÉS
-- ============================================================

CREATE TYPE account_type AS ENUM ('superadmin', 'gerant', 'partenaire');
CREATE TYPE station_status AS ENUM ('en_attente', 'validee', 'suspendue');
CREATE TYPE partenaire_type AS ENUM ('officiel', 'non_officiel');
CREATE TYPE session_status AS ENUM ('active', 'suspendue');
CREATE TYPE famille_produit AS ENUM (
  'carburants', 'lubrifiants', 'gpl',
  'marchandises_generales', 'pieces_accessoires', 'services'
);
CREATE TYPE mouvement_type AS ENUM (
  'entree_initiale', 'entree_achat', 'sortie_vente',
  'sortie_vente_boutique', 'transfert_sortant', 'transfert_entrant',
  'regularisation_inventaire'
);
CREATE TYPE ecriture_statut AS ENUM ('brouillon', 'validee', 'annulee');
CREATE TYPE achat_statut AS ENUM ('brouillon', 'paye', 'recu', 'mouvemente', 'comptabilise');
CREATE TYPE shift_statut AS ENUM ('en_cours', 'cloture', 'mouvemente', 'comptabilise');
CREATE TYPE inventaire_type AS ENUM ('carburant', 'boutique');
CREATE TYPE inventaire_statut AS ENUM ('en_cours', 'enregistre', 'regularise');
CREATE TYPE motif_ecart AS ENUM ('justifie', 'excedent', 'infonde');
CREATE TYPE tiers_type AS ENUM ('fournisseur', 'client', 'employe');
CREATE TYPE doleance_statut AS ENUM ('envoyee', 'prise_en_charge', 'reglee');
CREATE TYPE notif_type AS ENUM (
  'nouvelle_doleance', 'doleance_prise_en_charge', 'stock_alerte',
  'echeance_proche', 'station_a_valider', 'doleance_reglee'
);
CREATE TYPE operation_hors_av_type AS ENUM (
  'virement_interne', 'encaissement_creance', 'reglement_dette',
  'charge_courante', 'salaire_avance', 'salaire_constatation',
  'salaire_paiement', 'charge_fiscale_sociale', 'operation_gerant',
  'acquisition_immobilisation', 'cession_immobilisation'
);

-- ============================================================
-- 2. AUTHENTIFICATION & COMPTES
-- ============================================================

CREATE TABLE comptes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type account_type NOT NULL,
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(50),
  whatsapp VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entreprises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compte_id UUID REFERENCES comptes(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  pays VARCHAR(100) NOT NULL DEFAULT 'Madagascar',
  adresse TEXT,
  nif VARCHAR(100),
  stat VARCHAR(100),
  rcs VARCHAR(100),
  telephone VARCHAR(50),
  whatsapp VARCHAR(50),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE partenaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compte_id UUID REFERENCES comptes(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  logo_url TEXT,
  type partenaire_type DEFAULT 'officiel',
  contact_nom VARCHAR(255),
  contact_email VARCHAR(255),
  contact_telephone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES comptes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abonnements (gérés par superadmin)
CREATE TABLE abonnements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  partenaire_id UUID REFERENCES partenaires(id), -- co-financeur si officiel
  plan VARCHAR(100) NOT NULL DEFAULT 'standard',
  montant DECIMAL(12, 2),
  part_gerant DECIMAL(12, 2),
  part_partenaire DECIMAL(12, 2),
  date_debut DATE NOT NULL,
  date_fin DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions_utilisateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  compte_parent_id UUID REFERENCES comptes(id) ON DELETE CASCADE,
  employe_id UUID, -- FK vers tiers (ajoutée après)
  nom VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  status session_status DEFAULT 'active',
  -- Droits granulaires JSON : { "dashboard": true, "traitement": { "achat_carburant": true, ... } }
  droits JSONB DEFAULT '{}',
  zone_geo VARCHAR(255), -- pour Territory Manager partenaire
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. STATIONS & ÉQUIPEMENTS
-- ============================================================

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  partenaire_id UUID REFERENCES partenaires(id),
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  telephone VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status station_status DEFAULT 'en_attente',
  has_boutique BOOLEAN DEFAULT false,
  has_marchandises_generales BOOLEAN DEFAULT false,
  has_lubrifiants BOOLEAN DEFAULT false,
  has_gpl BOOLEAN DEFAULT false,
  has_lavage BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  has_vulcanisation BOOLEAN DEFAULT false,
  has_autres_services BOOLEAN DEFAULT false,
  valide_par UUID REFERENCES comptes(id),
  valide_at TIMESTAMPTZ,
  initialisation_validee BOOLEAN DEFAULT false,
  initialisation_validee_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cuves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  type_carburant VARCHAR(50) NOT NULL CHECK (type_carburant IN ('SP95', 'SP91', 'GO', 'Petrole')),
  compte_stock VARCHAR(10) NOT NULL CHECK (compte_stock IN ('310', '320', '330')),
  capacite_max DECIMAL(10, 2),
  stock_actuel_litres DECIMAL(12, 3) DEFAULT 0,
  jauge_actuelle_cm DECIMAL(8, 2) DEFAULT 0,
  cmup DECIMAL(12, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calibrages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuve_id UUID REFERENCES cuves(id) ON DELETE CASCADE,
  hauteur_cm INTEGER NOT NULL CHECK (hauteur_cm BETWEEN 1 AND 300),
  volume_litres DECIMAL(10, 3) NOT NULL CHECK (volume_litres >= 0),
  UNIQUE(cuve_id, hauteur_cm)
);

CREATE TABLE pistolets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  cuve_id UUID REFERENCES cuves(id),
  numero VARCHAR(50) NOT NULL,
  type_carburant VARCHAR(50) NOT NULL,
  index_actuel DECIMAL(14, 3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE camions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  numero_immat VARCHAR(100) NOT NULL,
  transporteur VARCHAR(255),
  capacite_totale DECIMAL(10, 2),
  nombre_compartiments INTEGER DEFAULT 1 CHECK (nombre_compartiments > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compartiments_camion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camion_id UUID REFERENCES camions(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero > 0),
  volume_max DECIMAL(10, 2) NOT NULL CHECK (volume_max > 0),
  UNIQUE(camion_id, numero)
);

-- ============================================================
-- 4. PLAN COMPTABLE
-- ============================================================

-- Compteur global pour auto-numérotation sous-comptes
CREATE TABLE compteurs_comptes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  numero_parent VARCHAR(20) NOT NULL,
  dernier_numero INTEGER DEFAULT 0,
  UNIQUE(entreprise_id, numero_parent)
);

CREATE TABLE plan_comptable_standard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  libelle VARCHAR(255) NOT NULL,
  classe INTEGER NOT NULL CHECK (classe BETWEEN 1 AND 7),
  is_centralisateur BOOLEAN DEFAULT false,
  numero_parent VARCHAR(20),
  is_modifiable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_comptable_entreprise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  numero VARCHAR(20) NOT NULL,
  numero_parent VARCHAR(20) NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  classe INTEGER NOT NULL CHECK (classe BETWEEN 1 AND 2),
  is_centralisateur BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entreprise_id, numero)
);

-- ============================================================
-- 5. TIERS
-- ============================================================

-- Séquences par type et par entreprise
CREATE TABLE compteurs_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  type_tiers tiers_type NOT NULL,
  dernier_numero INTEGER DEFAULT 0,
  UNIQUE(entreprise_id, type_tiers)
);

CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  type tiers_type NOT NULL,
  nom VARCHAR(255) NOT NULL,
  compte_principal VARCHAR(20),   -- 401-001, 411-001, 421-001 (invisible frontend)
  compte_responsabilite VARCHAR(20), -- 460-001 pour employés uniquement
  telephone VARCHAR(50),
  adresse TEXT,
  email VARCHAR(255),
  nif VARCHAR(100),
  rib VARCHAR(100),
  is_partenaire_carburant BOOLEAN DEFAULT false,
  credit_autorise BOOLEAN DEFAULT false,
  poste VARCHAR(255),
  date_embauche DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK sessions_utilisateurs → tiers
ALTER TABLE sessions_utilisateurs
  ADD CONSTRAINT fk_session_employe
  FOREIGN KEY (employe_id) REFERENCES tiers(id);

-- ============================================================
-- 6. ARTICLES / PRODUITS
-- ============================================================

CREATE TABLE categories_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  famille famille_produit NOT NULL CHECK (famille IN ('marchandises_generales', 'pieces_accessoires')),
  nom VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  famille famille_produit NOT NULL,
  categorie_id UUID REFERENCES categories_articles(id),
  nom VARCHAR(255) NOT NULL,
  unite VARCHAR(50) DEFAULT 'unité',
  conditionnement VARCHAR(100),
  code_barres VARCHAR(100),
  compte_stock VARCHAR(20),
  compte_vente VARCHAR(20),
  is_service BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index texte pour recherche POS (recherche rapide par nom ou code-barres)
CREATE INDEX idx_articles_nom_trgm ON articles USING gin(nom gin_trgm_ops);
CREATE INDEX idx_articles_code_barres ON articles(code_barres) WHERE code_barres IS NOT NULL;

CREATE TABLE prix_vente_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  prix_vente DECIMAL(12, 2) NOT NULL CHECK (prix_vente >= 0),
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, station_id, date_effet)
);

-- Prix carburant historisé
CREATE TABLE prix_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  type_carburant VARCHAR(50) NOT NULL,
  prix_vente DECIMAL(10, 4) NOT NULL CHECK (prix_vente > 0),
  marge_litre DECIMAL(10, 4) NOT NULL CHECK (marge_litre >= 0),
  prix_achat DECIMAL(10, 4),
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, type_carburant, date_effet)
);

-- ============================================================
-- 7. TRÉSORERIES
-- ============================================================

CREATE TABLE compteurs_tresorerie (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  type_tresorerie VARCHAR(50) NOT NULL,
  dernier_numero INTEGER DEFAULT 0,
  UNIQUE(entreprise_id, type_tresorerie)
);

CREATE TABLE tresoreries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('banque', 'mobile_money', 'note_credit', 'caisse')),
  libelle VARCHAR(255) NOT NULL,
  numero_compte VARCHAR(20) NOT NULL, -- 512-001, 530-001... (invisible frontend)
  solde_actuel DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entreprise_id, numero_compte)
);

-- ============================================================
-- 8. OBJECTIFS & SEUILS D'ALERTE
-- ============================================================

CREATE TABLE objectifs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  -- 'carburant_global' = volume tous produits, 'carburant_specifique' = un produit, 'boutique_ca' = CA boutique
  type VARCHAR(50) NOT NULL CHECK (type IN ('carburant_global', 'carburant_specifique', 'boutique_ca')),
  type_carburant VARCHAR(50), -- null si boutique_ca ou carburant_global
  valeur DECIMAL(15, 2) NOT NULL CHECK (valeur > 0),
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  CHECK (periode_fin >= periode_debut),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seuils_alerte_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  seuil_minimum DECIMAL(12, 3) NOT NULL CHECK (seuil_minimum >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, station_id)
);

-- ============================================================
-- 9. STOCKS
-- ============================================================

CREATE TABLE stocks_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  quantite DECIMAL(12, 3) DEFAULT 0 CHECK (quantite >= 0),
  cmup DECIMAL(12, 4) DEFAULT 0 CHECK (cmup >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, station_id)
);

CREATE TABLE mouvements_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id),
  article_id UUID REFERENCES articles(id),
  cuve_id UUID REFERENCES cuves(id),
  type mouvement_type NOT NULL,
  sens VARCHAR(10) NOT NULL CHECK (sens IN ('entree', 'sortie')),
  quantite DECIMAL(12, 3) NOT NULL CHECK (quantite > 0),
  cmup_unitaire DECIMAL(12, 4) NOT NULL CHECK (cmup_unitaire >= 0),
  valeur_totale DECIMAL(15, 2) GENERATED ALWAYS AS (quantite * cmup_unitaire) STORED,
  stock_avant DECIMAL(12, 3),
  stock_apres DECIMAL(12, 3),
  reference_type VARCHAR(100),
  reference_id UUID,
  reference_numero VARCHAR(100),
  motif TEXT,
  station_destination_id UUID REFERENCES stations(id),
  date_mouvement TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Contrainte : article OU cuve obligatoire
  CHECK (article_id IS NOT NULL OR cuve_id IS NOT NULL)
);

-- ============================================================
-- 10. COMPTABILITÉ — GRAND LIVRE
-- ============================================================

CREATE TABLE ecritures_comptables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  numero_piece VARCHAR(100),
  libelle TEXT NOT NULL,
  date_ecriture DATE NOT NULL,
  statut ecriture_statut DEFAULT 'validee',
  type_operation VARCHAR(100),
  reference_id UUID,
  reference_numero VARCHAR(100),
  station_id UUID REFERENCES stations(id),
  is_central BOOLEAN DEFAULT false,
  total_debit DECIMAL(15, 2) DEFAULT 0,
  total_credit DECIMAL(15, 2) DEFAULT 0,
  is_equilibree BOOLEAN GENERATED ALWAYS AS (
    ROUND(total_debit, 2) = ROUND(total_credit, 2)
  ) STORED,
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_ecriture (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecriture_id UUID REFERENCES ecritures_comptables(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20) NOT NULL, -- stocké en base, INVISIBLE en frontend
  libelle_compte VARCHAR(255) NOT NULL, -- affiché en frontend
  tiers_id UUID REFERENCES tiers(id),
  tresorerie_id UUID REFERENCES tresoreries(id),
  debit DECIMAL(15, 2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15, 2) DEFAULT 0 CHECK (credit >= 0),
  lettre VARCHAR(10), -- lettrage rapprochement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (debit > 0 OR credit > 0), -- au moins un des deux non nul
  CHECK (NOT (debit > 0 AND credit > 0)) -- pas les deux à la fois
);

-- ============================================================
-- 11. INITIALISATION
-- ============================================================

CREATE TABLE initialisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE UNIQUE,
  est_validee BOOLEAN DEFAULT false,
  validee_at TIMESTAMPTZ,
  validee_par UUID REFERENCES comptes(id),
  capital_net_calcule DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE initialisation_cuves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initialisation_id UUID REFERENCES initialisation(id) ON DELETE CASCADE,
  cuve_id UUID REFERENCES cuves(id),
  station_id UUID REFERENCES stations(id),
  jauge_initiale_cm DECIMAL(8, 2) NOT NULL CHECK (jauge_initiale_cm >= 0),
  volume_initial_litres DECIMAL(12, 3) NOT NULL CHECK (volume_initial_litres >= 0),
  prix_achat_initial DECIMAL(12, 4) NOT NULL CHECK (prix_achat_initial >= 0),
  valeur_stock DECIMAL(15, 2) GENERATED ALWAYS AS (volume_initial_litres * prix_achat_initial) STORED,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE initialisation_stocks_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initialisation_id UUID REFERENCES initialisation(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id),
  station_id UUID REFERENCES stations(id),
  quantite_initiale DECIMAL(12, 3) NOT NULL CHECK (quantite_initiale >= 0),
  prix_achat_initial DECIMAL(12, 4) NOT NULL CHECK (prix_achat_initial >= 0),
  valeur_stock DECIMAL(15, 2) GENERATED ALWAYS AS (quantite_initiale * prix_achat_initial) STORED,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE initialisation_index_pistolets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initialisation_id UUID REFERENCES initialisation(id) ON DELETE CASCADE,
  pistolet_id UUID REFERENCES pistolets(id),
  station_id UUID REFERENCES stations(id),
  index_initial DECIMAL(14, 3) NOT NULL CHECK (index_initial >= 0),
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE initialisation_comptes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initialisation_id UUID REFERENCES initialisation(id) ON DELETE CASCADE,
  numero_compte VARCHAR(20) NOT NULL,
  libelle_compte VARCHAR(255) NOT NULL,
  solde_debit DECIMAL(15, 2) DEFAULT 0 CHECK (solde_debit >= 0),
  solde_credit DECIMAL(15, 2) DEFAULT 0 CHECK (solde_credit >= 0),
  tiers_id UUID REFERENCES tiers(id),
  tresorerie_id UUID REFERENCES tresoreries(id),
  onglet VARCHAR(50) CHECK (onglet IN ('immobilisations', 'tiers', 'tresorerie', 'autres_dettes')),
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. ACHAT CARBURANT
-- ============================================================

-- Séquence pour numéro BC
CREATE SEQUENCE seq_bc_carburant START 1;

CREATE TABLE achats_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  numero_bc VARCHAR(100) UNIQUE NOT NULL DEFAULT ('BC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_bc_carburant')::TEXT, 6, '0')),
  numero_bl VARCHAR(100),
  fournisseur_id UUID REFERENCES tiers(id),
  camion_id UUID REFERENCES camions(id),
  statut achat_statut DEFAULT 'brouillon',
  date_commande DATE NOT NULL DEFAULT CURRENT_DATE,
  date_livraison DATE,
  montant_facture DECIMAL(15, 2) DEFAULT 0 CHECK (montant_facture >= 0),
  total_paye DECIMAL(15, 2) DEFAULT 0 CHECK (total_paye >= 0),
  ecart_paiement DECIMAL(15, 2) GENERATED ALWAYS AS (montant_facture - total_paye) STORED,
  mouvemente_at TIMESTAMPTZ,
  comptabilise_at TIMESTAMPTZ,
  mouvemente_par UUID REFERENCES sessions_utilisateurs(id),
  comptabilise_par UUID REFERENCES sessions_utilisateurs(id),
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_bc_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID REFERENCES achats_carburant(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id),
  type_carburant VARCHAR(50) NOT NULL,
  quantite_commandee DECIMAL(12, 3) CHECK (quantite_commandee >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements_achat_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID REFERENCES achats_carburant(id) ON DELETE CASCADE,
  tresorerie_id UUID REFERENCES tresoreries(id),
  montant DECIMAL(15, 2) NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL,
  reference VARCHAR(255),
  ecriture_id UUID REFERENCES ecritures_comptables(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receptions_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID REFERENCES achats_carburant(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id),
  cuve_id UUID REFERENCES cuves(id),
  compartiment_id UUID REFERENCES compartiments_camion(id),
  volume_nominal DECIMAL(12, 3) NOT NULL CHECK (volume_nominal > 0),
  jauge_avant_cm DECIMAL(8, 2) CHECK (jauge_avant_cm >= 0),
  jauge_apres_cm DECIMAL(8, 2) CHECK (jauge_apres_cm >= 0),
  volume_avant_litres DECIMAL(12, 3),
  volume_apres_litres DECIMAL(12, 3),
  volume_constate DECIMAL(12, 3) GENERATED ALWAYS AS (volume_apres_litres - volume_avant_litres) STORED,
  ecart_livraison DECIMAL(12, 3) GENERATED ALWAYS AS ((volume_apres_litres - volume_avant_litres) - volume_nominal) STORED,
  prix_achat_unitaire DECIMAL(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. SHIFTS CARBURANT
-- ============================================================

CREATE SEQUENCE seq_shift_carburant START 1;

CREATE TABLE shifts_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  numero_shift VARCHAR(100) UNIQUE NOT NULL DEFAULT ('SC-' || LPAD(nextval('seq_shift_carburant')::TEXT, 6, '0')),
  pompiste_id UUID REFERENCES tiers(id),
  statut shift_statut DEFAULT 'en_cours',
  date_shift DATE NOT NULL DEFAULT CURRENT_DATE,
  heure_cloture TIMESTAMPTZ,
  ca_total DECIMAL(15, 2) DEFAULT 0,
  total_paiements DECIMAL(15, 2) DEFAULT 0,
  ecart_caisse DECIMAL(15, 2) DEFAULT 0,
  cloture_par UUID REFERENCES sessions_utilisateurs(id),
  mouvemente_at TIMESTAMPTZ,
  comptabilise_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_shift_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts_carburant(id) ON DELETE CASCADE,
  pistolet_id UUID REFERENCES pistolets(id),
  cuve_id UUID REFERENCES cuves(id),
  type_carburant VARCHAR(50) NOT NULL,
  index_initial DECIMAL(14, 3) NOT NULL CHECK (index_initial >= 0),
  index_final DECIMAL(14, 3) NOT NULL CHECK (index_final >= index_initial),
  volume_vendu DECIMAL(12, 3) GENERATED ALWAYS AS (index_final - index_initial) STORED,
  prix_vente DECIMAL(10, 4) NOT NULL CHECK (prix_vente > 0),
  ca DECIMAL(15, 2) GENERATED ALWAYS AS ((index_final - index_initial) * prix_vente) STORED,
  cmup_sortie DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements_shift_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts_carburant(id) ON DELETE CASCADE,
  mode_paiement VARCHAR(50) NOT NULL CHECK (mode_paiement IN ('especes', 'cheque', 'note_credit', 'mobile_money', 'credit_client')),
  tresorerie_id UUID REFERENCES tresoreries(id),
  client_id UUID REFERENCES tiers(id),
  montant DECIMAL(15, 2) NOT NULL CHECK (montant > 0),
  echeance DATE,
  reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. SHIFTS BOUTIQUE & POS
-- ============================================================

CREATE SEQUENCE seq_shift_boutique START 1;
CREATE SEQUENCE seq_ticket_boutique START 1;

CREATE TABLE shifts_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  numero_shift VARCHAR(100) UNIQUE NOT NULL DEFAULT ('SB-' || LPAD(nextval('seq_shift_boutique')::TEXT, 6, '0')),
  session_id UUID REFERENCES sessions_utilisateurs(id),
  statut shift_statut DEFAULT 'en_cours',
  date_ouverture TIMESTAMPTZ DEFAULT NOW(),
  date_cloture TIMESTAMPTZ,
  ca_total DECIMAL(15, 2) DEFAULT 0,
  total_paiements DECIMAL(15, 2) DEFAULT 0,
  ecart_caisse DECIMAL(15, 2) DEFAULT 0,
  mouvemente_at TIMESTAMPTZ,
  comptabilise_at TIMESTAMPTZ,
  comptabilise_par UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts_boutique(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id),
  numero_ticket VARCHAR(100) UNIQUE NOT NULL DEFAULT ('TK-' || LPAD(nextval('seq_ticket_boutique')::TEXT, 8, '0')),
  client_id UUID REFERENCES tiers(id),
  is_credit BOOLEAN DEFAULT false,
  echeance DATE,
  total DECIMAL(15, 2) NOT NULL CHECK (total >= 0),
  date_vente TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_ticket_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets_boutique(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id),
  quantite DECIMAL(12, 3) NOT NULL CHECK (quantite > 0),
  prix_unitaire DECIMAL(12, 4) NOT NULL CHECK (prix_unitaire >= 0),
  total_ligne DECIMAL(15, 2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
  cmup_sortie DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements_ticket_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets_boutique(id) ON DELETE CASCADE,
  mode_paiement VARCHAR(50) NOT NULL CHECK (mode_paiement IN ('especes', 'mobile_money', 'cheque', 'credit_client')),
  tresorerie_id UUID REFERENCES tresoreries(id),
  montant DECIMAL(15, 2) NOT NULL CHECK (montant > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. ACHATS BOUTIQUE
-- ============================================================

CREATE SEQUENCE seq_achat_boutique START 1;

CREATE TABLE achats_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id),
  numero_facture VARCHAR(100),
  numero_interne VARCHAR(100) UNIQUE DEFAULT ('AB-' || LPAD(nextval('seq_achat_boutique')::TEXT, 6, '0')),
  fournisseur_id UUID REFERENCES tiers(id),
  fournisseur_non_defini BOOLEAN DEFAULT false,
  date_facture DATE NOT NULL,
  montant_total DECIMAL(15, 2) DEFAULT 0 CHECK (montant_total >= 0),
  montant_cash DECIMAL(15, 2) DEFAULT 0 CHECK (montant_cash >= 0),
  montant_credit DECIMAL(15, 2) DEFAULT 0 CHECK (montant_credit >= 0),
  echeance_credit DATE,
  statut achat_statut DEFAULT 'brouillon',
  mouvemente_at TIMESTAMPTZ,
  comptabilise_at TIMESTAMPTZ,
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Fournisseur défini OU non_défini, pas les deux
  CHECK (
    (fournisseur_non_defini = false AND fournisseur_id IS NOT NULL) OR
    (fournisseur_non_defini = true AND fournisseur_id IS NULL)
  )
);

CREATE TABLE lignes_achat_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID REFERENCES achats_boutique(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id),
  quantite DECIMAL(12, 3) NOT NULL CHECK (quantite > 0),
  prix_achat_unitaire DECIMAL(12, 4) NOT NULL CHECK (prix_achat_unitaire >= 0),
  total_ligne DECIMAL(15, 2) GENERATED ALWAYS AS (quantite * prix_achat_unitaire) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements_achat_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achat_id UUID REFERENCES achats_boutique(id) ON DELETE CASCADE,
  tresorerie_id UUID REFERENCES tresoreries(id),
  montant DECIMAL(15, 2) NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. TRANSFERTS DE STOCK
-- ============================================================

CREATE TABLE transferts_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  station_origine_id UUID REFERENCES stations(id),
  station_destination_id UUID REFERENCES stations(id),
  article_id UUID REFERENCES articles(id),
  quantite DECIMAL(12, 3) NOT NULL CHECK (quantite > 0),
  cmup_origine DECIMAL(12, 4) NOT NULL CHECK (cmup_origine >= 0),
  valeur_transfert DECIMAL(15, 2) GENERATED ALWAYS AS (quantite * cmup_origine) STORED,
  date_transfert DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (station_origine_id <> station_destination_id)
);

-- ============================================================
-- 17. INVENTAIRES
-- ============================================================

CREATE TABLE inventaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  type inventaire_type NOT NULL,
  statut inventaire_statut DEFAULT 'en_cours',
  date_inventaire TIMESTAMPTZ DEFAULT NOW(),
  inventaire_precedent_id UUID REFERENCES inventaires(id),
  regularise_at TIMESTAMPTZ,
  regularise_par UUID REFERENCES sessions_utilisateurs(id),
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_inventaire_carburant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventaire_id UUID REFERENCES inventaires(id) ON DELETE CASCADE,
  cuve_id UUID REFERENCES cuves(id),
  stock_theorique_litres DECIMAL(12, 3) NOT NULL,
  jauge_reelle_cm DECIMAL(8, 2) NOT NULL CHECK (jauge_reelle_cm >= 0),
  volume_reel_litres DECIMAL(12, 3) NOT NULL CHECK (volume_reel_litres >= 0),
  ecart_litres DECIMAL(12, 3) GENERATED ALWAYS AS (volume_reel_litres - stock_theorique_litres) STORED,
  cmup DECIMAL(12, 4) NOT NULL,
  valeur_ecart DECIMAL(15, 2) GENERATED ALWAYS AS (ABS(volume_reel_litres - stock_theorique_litres) * cmup) STORED,
  motif motif_ecart,
  responsable_id UUID REFERENCES tiers(id),
  ecriture_id UUID REFERENCES ecritures_comptables(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lignes_inventaire_boutique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventaire_id UUID REFERENCES inventaires(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id),
  stock_theorique DECIMAL(12, 3) NOT NULL,
  quantite_reelle DECIMAL(12, 3) NOT NULL CHECK (quantite_reelle >= 0),
  ecart DECIMAL(12, 3) GENERATED ALWAYS AS (quantite_reelle - stock_theorique) STORED,
  cmup DECIMAL(12, 4) NOT NULL,
  valeur_ecart DECIMAL(15, 2) GENERATED ALWAYS AS (ABS(quantite_reelle - stock_theorique) * cmup) STORED,
  motif motif_ecart,
  motif_detail VARCHAR(100) CHECK (motif_detail IN ('perime', 'casse', 'perte', 'autre')),
  responsable_id UUID REFERENCES tiers(id),
  ecriture_id UUID REFERENCES ecritures_comptables(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. OPÉRATIONS HORS ACHAT & VENTE
-- ============================================================

CREATE TABLE operations_hors_av (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  type operation_hors_av_type NOT NULL,
  libelle TEXT NOT NULL,
  date_operation DATE NOT NULL,
  montant DECIMAL(15, 2) NOT NULL CHECK (montant > 0),
  station_id UUID REFERENCES stations(id),
  is_central BOOLEAN DEFAULT false,
  tiers_id UUID REFERENCES tiers(id),
  tresorerie_id UUID REFERENCES tresoreries(id),
  tresorerie_destination_id UUID REFERENCES tresoreries(id),
  echeance DATE,
  ecriture_id UUID REFERENCES ecritures_comptables(id),
  created_by UUID REFERENCES sessions_utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE creances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  tiers_id UUID REFERENCES tiers(id),
  type_creance VARCHAR(50) NOT NULL CHECK (type_creance IN ('client_facture', 'employe_460')),
  reference_id UUID,
  reference_numero VARCHAR(100),
  montant_initial DECIMAL(15, 2) NOT NULL CHECK (montant_initial > 0),
  montant_recouvre DECIMAL(15, 2) DEFAULT 0 CHECK (montant_recouvre >= 0),
  solde DECIMAL(15, 2) GENERATED ALWAYS AS (montant_initial - montant_recouvre) STORED,
  echeance DATE,
  is_soldee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dettes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
  fournisseur_id UUID REFERENCES tiers(id),
  type_dette VARCHAR(50) NOT NULL CHECK (type_dette IN ('fournisseur_boutique', 'charge', 'fiscal', 'social', 'immobilisation')),
  reference_id UUID,
  reference_numero VARCHAR(100),
  montant_initial DECIMAL(15, 2) NOT NULL CHECK (montant_initial > 0),
  montant_regle DECIMAL(15, 2) DEFAULT 0 CHECK (montant_regle >= 0),
  solde DECIMAL(15, 2) GENERATED ALWAYS AS (montant_initial - montant_regle) STORED,
  echeance DATE,
  is_soldee BOOLEAN DEFAULT false,
  is_partenaire_carburant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. DOLÉANCES
-- ============================================================

CREATE TABLE doleances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  partenaire_id UUID REFERENCES partenaires(id),
  type_incident VARCHAR(100) NOT NULL CHECK (
    type_incident IN ('panne_pistolet', 'eau_dans_cuve', 'panne_electrique', 'probleme_livraison', 'autre')
  ),
  description TEXT NOT NULL,
  statut doleance_statut DEFAULT 'envoyee',
  envoyee_at TIMESTAMPTZ DEFAULT NOW(),
  prise_en_charge_at TIMESTAMPTZ,
  prise_en_charge_par UUID REFERENCES sessions_utilisateurs(id),
  reglee_at TIMESTAMPTZ,
  reglee_par UUID REFERENCES sessions_utilisateurs(id),
  delai_prise_en_charge_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN prise_en_charge_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (prise_en_charge_at - envoyee_at))::INTEGER / 60
    ELSE NULL END
  ) STORED,
  delai_resolution_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN reglee_at IS NOT NULL AND prise_en_charge_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (reglee_at - prise_en_charge_at))::INTEGER / 60
    ELSE NULL END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 20. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinataire_compte_id UUID REFERENCES comptes(id),
  destinataire_session_id UUID REFERENCES sessions_utilisateurs(id),
  type notif_type NOT NULL,
  titre VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type VARCHAR(100),
  is_lue BOOLEAN DEFAULT false,
  lue_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 21. AUDIT LOG (exigé par le document — sécurité & traçabilité)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  session_id UUID REFERENCES sessions_utilisateurs(id),
  compte_id UUID REFERENCES comptes(id),
  action VARCHAR(100) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  table_cible VARCHAR(100),
  record_id UUID,
  anciennes_valeurs JSONB,
  nouvelles_valeurs JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 22. FONCTIONS SQL
-- ============================================================

-- Conversion jauge → volume (interpolation linéaire)
CREATE OR REPLACE FUNCTION get_volume_from_jauge(
  p_cuve_id UUID,
  p_jauge_cm DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_lower_h INTEGER; v_upper_h INTEGER;
  v_lower_v DECIMAL; v_upper_v DECIMAL;
BEGIN
  SELECT hauteur_cm, volume_litres INTO v_lower_h, v_lower_v
  FROM calibrages WHERE cuve_id = p_cuve_id AND hauteur_cm <= p_jauge_cm
  ORDER BY hauteur_cm DESC LIMIT 1;

  SELECT hauteur_cm, volume_litres INTO v_upper_h, v_upper_v
  FROM calibrages WHERE cuve_id = p_cuve_id AND hauteur_cm >= p_jauge_cm
  ORDER BY hauteur_cm ASC LIMIT 1;

  IF v_lower_h IS NULL THEN RETURN v_upper_v; END IF;
  IF v_upper_h IS NULL THEN RETURN v_lower_v; END IF;
  IF v_lower_h = v_upper_h THEN RETURN v_lower_v; END IF;

  RETURN ROUND(
    v_lower_v + (v_upper_v - v_lower_v) * (p_jauge_cm - v_lower_h) / (v_upper_h - v_lower_h),
    3
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Calcul CMUP
CREATE OR REPLACE FUNCTION calculer_cmup(
  p_stock_actuel DECIMAL,
  p_cmup_actuel DECIMAL,
  p_quantite_entree DECIMAL,
  p_prix_achat DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF (p_stock_actuel + p_quantite_entree) = 0 THEN RETURN p_cmup_actuel; END IF;
  RETURN ROUND(
    (p_stock_actuel * p_cmup_actuel + p_quantite_entree * p_prix_achat) /
    (p_stock_actuel + p_quantite_entree), 4
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vérification partie double
CREATE OR REPLACE FUNCTION verifier_partie_double(p_ecriture_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_debit DECIMAL; v_credit DECIMAL;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
  INTO v_debit, v_credit
  FROM lignes_ecriture WHERE ecriture_id = p_ecriture_id;
  RETURN ROUND(v_debit, 2) = ROUND(v_credit, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Auto-numérotation tiers
CREATE OR REPLACE FUNCTION generer_numero_tiers(
  p_entreprise_id UUID,
  p_type tiers_type
) RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR; v_numero INTEGER; v_compte VARCHAR;
BEGIN
  CASE p_type
    WHEN 'fournisseur' THEN v_prefix := '401';
    WHEN 'client' THEN v_prefix := '411';
    WHEN 'employe' THEN v_prefix := '421';
  END CASE;

  INSERT INTO compteurs_tiers (entreprise_id, type_tiers, dernier_numero)
  VALUES (p_entreprise_id, p_type, 1)
  ON CONFLICT (entreprise_id, type_tiers)
  DO UPDATE SET dernier_numero = compteurs_tiers.dernier_numero + 1
  RETURNING dernier_numero INTO v_numero;

  RETURN v_prefix || '-' || LPAD(v_numero::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-numérotation trésorerie
CREATE OR REPLACE FUNCTION generer_numero_tresorerie(
  p_entreprise_id UUID,
  p_type VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR; v_numero INTEGER;
BEGIN
  CASE p_type
    WHEN 'banque' THEN v_prefix := '512';
    WHEN 'mobile_money' THEN v_prefix := '513';
    WHEN 'note_credit' THEN v_prefix := '514';
    WHEN 'caisse' THEN v_prefix := '530';
  END CASE;

  INSERT INTO compteurs_tresorerie (entreprise_id, type_tresorerie, dernier_numero)
  VALUES (p_entreprise_id, p_type, 1)
  ON CONFLICT (entreprise_id, type_tresorerie)
  DO UPDATE SET dernier_numero = compteurs_tresorerie.dernier_numero + 1
  RETURNING dernier_numero INTO v_numero;

  RETURN v_prefix || '-' || LPAD(v_numero::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-numérotation sous-comptes (classes 1 & 2)
CREATE OR REPLACE FUNCTION generer_numero_sous_compte(
  p_entreprise_id UUID,
  p_numero_parent VARCHAR
) RETURNS VARCHAR AS $$
DECLARE v_numero INTEGER;
BEGIN
  INSERT INTO compteurs_comptes (entreprise_id, numero_parent, dernier_numero)
  VALUES (p_entreprise_id, p_numero_parent, 1)
  ON CONFLICT (entreprise_id, numero_parent)
  DO UPDATE SET dernier_numero = compteurs_comptes.dernier_numero + 1
  RETURNING dernier_numero INTO v_numero;

  RETURN p_numero_parent || '-' || LPAD(v_numero::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Calcul capital net (pour validation initialisation)
CREATE OR REPLACE FUNCTION calculer_capital_net(p_initialisation_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_actif DECIMAL := 0;
  v_total_passif DECIMAL := 0;
BEGIN
  -- Total actif (comptes débiteurs : 2, 3, 4 débiteur, 5)
  SELECT COALESCE(SUM(solde_debit - solde_credit), 0) INTO v_total_actif
  FROM initialisation_comptes
  WHERE initialisation_id = p_initialisation_id
  AND LEFT(numero_compte, 1) IN ('2', '3', '5')
  AND solde_debit > solde_credit;

  -- Stocks cuves
  SELECT v_total_actif + COALESCE(SUM(valeur_stock), 0) INTO v_total_actif
  FROM initialisation_cuves WHERE initialisation_id = p_initialisation_id;

  -- Stocks boutique
  SELECT v_total_actif + COALESCE(SUM(valeur_stock), 0) INTO v_total_actif
  FROM initialisation_stocks_boutique WHERE initialisation_id = p_initialisation_id;

  -- Créances clients (411 débiteur)
  SELECT v_total_actif + COALESCE(SUM(solde_debit - solde_credit), 0) INTO v_total_actif
  FROM initialisation_comptes
  WHERE initialisation_id = p_initialisation_id
  AND LEFT(numero_compte, 3) = '411' AND solde_debit > solde_credit;

  -- Total dettes (passif : 4 créditeur hors 411, dettes LT)
  SELECT COALESCE(SUM(solde_credit - solde_debit), 0) INTO v_total_passif
  FROM initialisation_comptes
  WHERE initialisation_id = p_initialisation_id
  AND LEFT(numero_compte, 1) IN ('4')
  AND LEFT(numero_compte, 3) NOT IN ('411')
  AND solde_credit > solde_debit;

  RETURN ROUND(v_total_actif - v_total_passif, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 23. TRIGGERS
-- ============================================================

-- Calcul automatique prix_achat = prix_vente - marge_litre
CREATE OR REPLACE FUNCTION fn_compute_prix_achat() RETURNS TRIGGER AS $$
BEGIN
  NEW.prix_achat = NEW.prix_vente - NEW.marge_litre;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_compute_prix_achat
BEFORE INSERT OR UPDATE ON prix_carburant
FOR EACH ROW EXECUTE FUNCTION fn_compute_prix_achat();

-- Mise à jour totaux écriture comptable
CREATE OR REPLACE FUNCTION fn_update_ecriture_totaux() RETURNS TRIGGER AS $$
BEGIN
  UPDATE ecritures_comptables SET
    total_debit  = (SELECT COALESCE(SUM(debit),  0) FROM lignes_ecriture WHERE ecriture_id = COALESCE(NEW.ecriture_id, OLD.ecriture_id)),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM lignes_ecriture WHERE ecriture_id = COALESCE(NEW.ecriture_id, OLD.ecriture_id))
  WHERE id = COALESCE(NEW.ecriture_id, OLD.ecriture_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_ecriture_totaux
AFTER INSERT OR UPDATE OR DELETE ON lignes_ecriture
FOR EACH ROW EXECUTE FUNCTION fn_update_ecriture_totaux();

-- Mise à jour stock boutique après mouvement
CREATE OR REPLACE FUNCTION fn_update_stock_boutique() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.article_id IS NULL OR NEW.station_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO stocks_boutique (article_id, station_id, quantite, cmup)
  VALUES (NEW.article_id, NEW.station_id, 0, 0)
  ON CONFLICT (article_id, station_id) DO NOTHING;

  IF NEW.sens = 'entree' THEN
    UPDATE stocks_boutique SET
      cmup = calculer_cmup(quantite, cmup, NEW.quantite, NEW.cmup_unitaire),
      quantite = quantite + NEW.quantite,
      updated_at = NOW()
    WHERE article_id = NEW.article_id AND station_id = NEW.station_id;
  ELSE
    UPDATE stocks_boutique SET
      quantite = GREATEST(0, quantite - NEW.quantite),
      updated_at = NOW()
    WHERE article_id = NEW.article_id AND station_id = NEW.station_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_stock_boutique
AFTER INSERT ON mouvements_stock
FOR EACH ROW EXECUTE FUNCTION fn_update_stock_boutique();

-- Mise à jour stock cuve après mouvement carburant
CREATE OR REPLACE FUNCTION fn_update_stock_cuve() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cuve_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.sens = 'entree' THEN
    UPDATE cuves SET
      cmup = calculer_cmup(stock_actuel_litres, cmup, NEW.quantite, NEW.cmup_unitaire),
      stock_actuel_litres = stock_actuel_litres + NEW.quantite,
      updated_at = NOW()
    WHERE id = NEW.cuve_id;
  ELSE
    UPDATE cuves SET
      stock_actuel_litres = GREATEST(0, stock_actuel_litres - NEW.quantite),
      updated_at = NOW()
    WHERE id = NEW.cuve_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_stock_cuve
AFTER INSERT ON mouvements_stock
FOR EACH ROW EXECUTE FUNCTION fn_update_stock_cuve();

-- Mise à jour solde trésorerie après écriture
CREATE OR REPLACE FUNCTION fn_update_solde_tresorerie() RETURNS TRIGGER AS $$
DECLARE v_tresorerie_id UUID;
BEGIN
  v_tresorerie_id := COALESCE(NEW.tresorerie_id, OLD.tresorerie_id);
  IF v_tresorerie_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE tresoreries SET
    solde_actuel = (
      SELECT COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)
      FROM lignes_ecriture le
      JOIN ecritures_comptables ec ON le.ecriture_id = ec.id
      WHERE le.tresorerie_id = v_tresorerie_id AND ec.statut = 'validee'
    ),
    updated_at = NOW()
  WHERE id = v_tresorerie_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_solde_tresorerie
AFTER INSERT OR UPDATE ON lignes_ecriture
FOR EACH ROW EXECUTE FUNCTION fn_update_solde_tresorerie();

-- Alerte stock sous seuil
CREATE OR REPLACE FUNCTION fn_check_alerte_stock() RETURNS TRIGGER AS $$
DECLARE v_seuil DECIMAL; v_compte_id UUID; v_article_nom VARCHAR;
BEGIN
  SELECT seuil_minimum INTO v_seuil
  FROM seuils_alerte_stock WHERE article_id = NEW.article_id AND station_id = NEW.station_id;

  IF v_seuil IS NULL OR NEW.quantite > v_seuil THEN RETURN NEW; END IF;

  SELECT a.nom INTO v_article_nom FROM articles a WHERE a.id = NEW.article_id;

  SELECT e.compte_id INTO v_compte_id
  FROM stations s JOIN entreprises e ON s.entreprise_id = e.id WHERE s.id = NEW.station_id;

  INSERT INTO notifications (destinataire_compte_id, type, titre, message, reference_id, reference_type)
  VALUES (v_compte_id, 'stock_alerte', 'Stock sous seuil',
    'Le stock de ' || v_article_nom || ' est sous le seuil minimum.', NEW.article_id, 'article')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_check_alerte_stock
AFTER UPDATE ON stocks_boutique
FOR EACH ROW WHEN (NEW.quantite < OLD.quantite)
EXECUTE FUNCTION fn_check_alerte_stock();

-- Audit automatique sur les tables critiques
CREATE OR REPLACE FUNCTION fn_audit_log() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_cible, record_id, action, anciennes_valeurs, nouvelles_valeurs)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Audit sur les tables critiques
CREATE TRIGGER trig_audit_ecritures
AFTER INSERT OR UPDATE OR DELETE ON ecritures_comptables
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trig_audit_mouvements
AFTER INSERT ON mouvements_stock
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trig_audit_shifts
AFTER INSERT OR UPDATE ON shifts_carburant
FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- updated_at automatique
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_updated_at_comptes BEFORE UPDATE ON comptes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_entreprises BEFORE UPDATE ON entreprises FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_stations BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_tiers BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_articles BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_tresoreries BEFORE UPDATE ON tresoreries FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_cuves BEFORE UPDATE ON cuves FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trig_updated_at_shifts_carb BEFORE UPDATE ON shifts_carburant FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- 24. VUES STANDARDS
-- ============================================================

CREATE VIEW vue_grand_livre AS
SELECT
  ec.entreprise_id, ec.date_ecriture, ec.numero_piece,
  ec.libelle AS libelle_ecriture, le.numero_compte, le.libelle_compte,
  t.nom AS tiers_nom, tr.libelle AS tresorerie_libelle,
  le.debit, le.credit, ec.station_id, ec.is_central,
  ec.type_operation, ec.reference_numero
FROM lignes_ecriture le
JOIN ecritures_comptables ec ON le.ecriture_id = ec.id
LEFT JOIN tiers t ON le.tiers_id = t.id
LEFT JOIN tresoreries tr ON le.tresorerie_id = tr.id
WHERE ec.statut = 'validee'
ORDER BY ec.entreprise_id, le.numero_compte, ec.date_ecriture;

CREATE VIEW vue_balance AS
SELECT
  ec.entreprise_id, le.numero_compte, le.libelle_compte,
  SUM(le.debit) AS total_debit, SUM(le.credit) AS total_credit,
  GREATEST(SUM(le.debit) - SUM(le.credit), 0) AS solde_debiteur,
  GREATEST(SUM(le.credit) - SUM(le.debit), 0) AS solde_crediteur
FROM lignes_ecriture le
JOIN ecritures_comptables ec ON le.ecriture_id = ec.id
WHERE ec.statut = 'validee'
GROUP BY ec.entreprise_id, le.numero_compte, le.libelle_compte
ORDER BY ec.entreprise_id, le.numero_compte;

CREATE VIEW vue_creances_en_cours AS
SELECT cr.*, t.nom AS tiers_nom, t.type AS tiers_type,
  CASE WHEN cr.echeance < CURRENT_DATE THEN 'depasse'
       WHEN cr.echeance <= CURRENT_DATE + 7 THEN 'urgent'
       ELSE 'normal' END AS urgence
FROM creances cr JOIN tiers t ON cr.tiers_id = t.id
WHERE cr.is_soldee = false ORDER BY cr.echeance ASC NULLS LAST;

CREATE VIEW vue_dettes_en_cours AS
SELECT d.*, t.nom AS fournisseur_nom,
  CASE WHEN d.echeance < CURRENT_DATE THEN 'depasse'
       WHEN d.echeance <= CURRENT_DATE + 7 THEN 'urgent'
       ELSE 'normal' END AS urgence
FROM dettes d JOIN tiers t ON d.fournisseur_id = t.id
WHERE d.is_soldee = false ORDER BY d.echeance ASC NULLS LAST;

CREATE VIEW vue_mouvements_stock AS
SELECT ms.*, s.nom AS station_nom, a.nom AS article_nom,
  a.famille AS famille_produit, c.nom AS cuve_nom, c.type_carburant
FROM mouvements_stock ms
LEFT JOIN stations s ON ms.station_id = s.id
LEFT JOIN articles a ON ms.article_id = a.id
LEFT JOIN cuves c ON ms.cuve_id = c.id
ORDER BY ms.date_mouvement DESC;

-- ============================================================
-- 25. MATERIALIZED VIEWS (rapports lourds — doc ami)
-- ============================================================

CREATE MATERIALIZED VIEW mv_ca_mensuel AS
SELECT
  ec.entreprise_id,
  ec.station_id,
  s.nom AS station_nom,
  DATE_TRUNC('month', ec.date_ecriture) AS mois,
  SUM(CASE WHEN le.numero_compte IN ('701','702','703','704','705') THEN le.credit - le.debit ELSE 0 END) AS ca_carburant,
  SUM(CASE WHEN le.numero_compte LIKE '706%' THEN le.credit - le.debit ELSE 0 END) AS ca_boutique_services,
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '7' THEN le.credit - le.debit ELSE 0 END) AS ca_total,
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '6' THEN le.debit - le.credit ELSE 0 END) AS total_charges,
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '7' THEN le.credit - le.debit ELSE 0 END) -
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '6' THEN le.debit - le.credit ELSE 0 END) AS marge_brute
FROM lignes_ecriture le
JOIN ecritures_comptables ec ON le.ecriture_id = ec.id
JOIN stations s ON ec.station_id = s.id
WHERE ec.statut = 'validee'
GROUP BY ec.entreprise_id, ec.station_id, s.nom, DATE_TRUNC('month', ec.date_ecriture)
WITH DATA;

CREATE UNIQUE INDEX idx_mv_ca_mensuel ON mv_ca_mensuel(entreprise_id, station_id, mois);

CREATE MATERIALIZED VIEW mv_capitaux_propres AS
SELECT
  e.id AS entreprise_id,
  COALESCE(SUM(CASE WHEN le.numero_compte LIKE '101%' THEN le.credit - le.debit ELSE 0 END), 0) AS capital_101,
  COALESCE(SUM(CASE WHEN LEFT(le.numero_compte,1)='7' AND EXTRACT(YEAR FROM ec.date_ecriture)=EXTRACT(YEAR FROM NOW())
    THEN le.credit - le.debit ELSE 0 END) -
  SUM(CASE WHEN LEFT(le.numero_compte,1)='6' AND EXTRACT(YEAR FROM ec.date_ecriture)=EXTRACT(YEAR FROM NOW())
    THEN le.debit - le.credit ELSE 0 END), 0) AS resultat_ytd,
  COALESCE(SUM(CASE WHEN le.numero_compte LIKE '101%' THEN le.credit - le.debit ELSE 0 END), 0) +
  COALESCE(SUM(CASE WHEN LEFT(le.numero_compte,1)='7' AND EXTRACT(YEAR FROM ec.date_ecriture)=EXTRACT(YEAR FROM NOW())
    THEN le.credit - le.debit ELSE 0 END) -
  SUM(CASE WHEN LEFT(le.numero_compte,1)='6' AND EXTRACT(YEAR FROM ec.date_ecriture)=EXTRACT(YEAR FROM NOW())
    THEN le.debit - le.credit ELSE 0 END), 0) AS capitaux_propres_nets
FROM entreprises e
LEFT JOIN ecritures_comptables ec ON ec.entreprise_id = e.id AND ec.statut = 'validee'
LEFT JOIN lignes_ecriture le ON le.ecriture_id = ec.id
GROUP BY e.id
WITH DATA;

CREATE UNIQUE INDEX idx_mv_capitaux ON mv_capitaux_propres(entreprise_id);

CREATE MATERIALIZED VIEW mv_stocks_valorises AS
SELECT
  sb.station_id, s.nom AS station_nom, sb.article_id,
  a.nom AS article_nom, a.famille, sb.quantite, sb.cmup,
  ROUND(sb.quantite * sb.cmup, 2) AS valeur_stock, sb.updated_at
FROM stocks_boutique sb
JOIN stations s ON sb.station_id = s.id
JOIN articles a ON sb.article_id = a.id
WITH DATA;

CREATE UNIQUE INDEX idx_mv_stocks ON mv_stocks_valorises(station_id, article_id);

-- Fonction de refresh des materialized views (à appeler périodiquement)
CREATE OR REPLACE FUNCTION refresh_materialized_views() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ca_mensuel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_capitaux_propres;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stocks_valorises;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 26. ROW LEVEL SECURITY
-- ============================================================

-- ── Table comptes ────────────────────────────────────────────
-- Fonction SECURITY DEFINER pour éviter la récursion infinie dans les policies
-- qui vérifient si l'utilisateur est superadmin via la table comptes elle-même.
CREATE OR REPLACE FUNCTION public.auth_is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comptes
    WHERE supabase_user_id = auth.uid()
      AND type = 'superadmin'
      AND is_active = true
  );
$$;

ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur peut lire son propre compte
CREATE POLICY "users_select_own_compte" ON comptes
  FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Gérant peut insérer son compte lors du signup (supabase_user_id = auth.uid())
CREATE POLICY "users_insert_own_compte" ON comptes
  FOR INSERT
  WITH CHECK (supabase_user_id = auth.uid());

-- Chaque utilisateur peut modifier son propre compte (hors changement de type)
CREATE POLICY "users_update_own_compte" ON comptes
  FOR UPDATE
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

-- Superadmin : accès complet à tous les comptes (gestion partenaires & sessions)
CREATE POLICY "superadmin_all_comptes" ON comptes
  FOR ALL
  USING (public.auth_is_superadmin());

-- ── Autres tables ─────────────────────────────────────────────
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tresoreries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecritures_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_ecriture ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks_boutique ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuves ENABLE ROW LEVEL SECURITY;
ALTER TABLE pistolets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts_carburant ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts_boutique ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_boutique ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats_carburant ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats_boutique ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE doleances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creances ENABLE ROW LEVEL SECURITY;
ALTER TABLE dettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Gérant : accès à ses propres entreprises
CREATE POLICY "gerant_own_entreprises" ON entreprises
  FOR ALL USING (compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1));

CREATE POLICY "gerant_own_stations" ON stations
  FOR ALL USING (
    entreprise_id IN (SELECT id FROM entreprises WHERE compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1))
  );

-- Partenaire : lecture seule des stations de son réseau (données opérationnelles)
CREATE POLICY "partenaire_read_stations" ON stations
  FOR SELECT USING (
    partenaire_id IN (SELECT id FROM partenaires WHERE compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1))
  );

-- Superadmin : accès total (politique permissive)
CREATE POLICY "superadmin_full_access" ON entreprises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM comptes WHERE supabase_user_id = auth.uid() AND type = 'superadmin')
  );

-- Notifications : chaque utilisateur voit les siennes
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (
    destinataire_compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
  );

-- Audit log : lecture seule pour superadmin
CREATE POLICY "superadmin_audit_read" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM comptes WHERE supabase_user_id = auth.uid() AND type = 'superadmin')
  );

-- ── Partenaires & abonnements (création admin, lecture gérant / partenaire) ──
ALTER TABLE partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partenaires_superadmin_all" ON partenaires
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

CREATE POLICY "partenaires_gerant_select" ON partenaires
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM comptes c
      WHERE c.supabase_user_id = auth.uid() AND c.type = 'gerant' AND c.is_active = true
    )
  );

CREATE POLICY "partenaire_select_own_partenaire" ON partenaires
  FOR SELECT
  USING (
    compte_id IS NOT NULL
    AND compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "abonnements_superadmin_all" ON abonnements
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

CREATE POLICY "abonnements_gerant_select" ON abonnements
  FOR SELECT
  USING (
    entreprise_id IN (
      SELECT id FROM entreprises
      WHERE compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "abonnements_partenaire_select" ON abonnements
  FOR SELECT
  USING (
    partenaire_id IN (
      SELECT id FROM partenaires
      WHERE compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

-- Superadmin : gestion de toutes les stations (admin UI)
CREATE POLICY "stations_superadmin_all" ON stations
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- Doléances : accès métier (sinon RLS activé sans policy = aucun accès)
CREATE POLICY "doleances_superadmin_all" ON doleances
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

CREATE POLICY "doleances_gerant_all" ON doleances
  FOR ALL
  USING (
    station_id IN (
      SELECT s.id FROM stations s
      INNER JOIN entreprises e ON e.id = s.entreprise_id
      WHERE e.compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "doleances_partenaire_all" ON doleances
  FOR ALL
  USING (
    partenaire_id IN (
      SELECT id FROM partenaires
      WHERE compte_id = (SELECT id FROM comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

-- ============================================================
-- 27. INDEX DE PERFORMANCE
-- ============================================================

CREATE INDEX idx_mouvements_stock_station_date ON mouvements_stock(station_id, date_mouvement DESC);
CREATE INDEX idx_mouvements_stock_article ON mouvements_stock(article_id, date_mouvement DESC);
CREATE INDEX idx_mouvements_stock_cuve ON mouvements_stock(cuve_id, date_mouvement DESC);
CREATE INDEX idx_mouvements_stock_type ON mouvements_stock(type, sens);
CREATE INDEX idx_ecritures_entreprise_date ON ecritures_comptables(entreprise_id, date_ecriture DESC);
CREATE INDEX idx_ecritures_station ON ecritures_comptables(station_id, date_ecriture DESC);
CREATE INDEX idx_ecritures_statut ON ecritures_comptables(statut) WHERE statut = 'validee';
CREATE INDEX idx_lignes_ecriture_compte ON lignes_ecriture(numero_compte, ecriture_id);
CREATE INDEX idx_lignes_ecriture_tiers ON lignes_ecriture(tiers_id) WHERE tiers_id IS NOT NULL;
CREATE INDEX idx_lignes_ecriture_tresorerie ON lignes_ecriture(tresorerie_id) WHERE tresorerie_id IS NOT NULL;
CREATE INDEX idx_shifts_carb_station_date ON shifts_carburant(station_id, date_shift DESC);
CREATE INDEX idx_shifts_carb_pompiste ON shifts_carburant(pompiste_id, date_shift DESC);
CREATE INDEX idx_shifts_boutique_station ON shifts_boutique(station_id, date_ouverture DESC);
CREATE INDEX idx_tickets_shift ON tickets_boutique(shift_id, date_vente DESC);
CREATE INDEX idx_calibrages_cuve_hauteur ON calibrages(cuve_id, hauteur_cm);
CREATE INDEX idx_prix_carburant_station_type ON prix_carburant(station_id, type_carburant, date_effet DESC);
CREATE INDEX idx_prix_vente_articles ON prix_vente_articles(article_id, station_id, date_effet DESC);
CREATE INDEX idx_stocks_boutique_station ON stocks_boutique(station_id, article_id);
CREATE INDEX idx_creances_entreprise_soldee ON creances(entreprise_id, is_soldee, echeance) WHERE is_soldee = false;
CREATE INDEX idx_dettes_entreprise_soldee ON dettes(entreprise_id, is_soldee, echeance) WHERE is_soldee = false;
CREATE INDEX idx_notifs_destinataire ON notifications(destinataire_compte_id, is_lue, created_at DESC);
CREATE INDEX idx_doleances_partenaire ON doleances(partenaire_id, statut, envoyee_at DESC);
CREATE INDEX idx_audit_log_table ON audit_log(table_cible, created_at DESC);
CREATE INDEX idx_tiers_entreprise_type ON tiers(entreprise_id, type, is_active);
CREATE INDEX idx_articles_entreprise ON articles(entreprise_id, famille, is_active);
CREATE INDEX idx_objectifs_station ON objectifs(station_id, periode_debut, periode_fin);

-- ============================================================
-- 28. DONNÉES INITIALES — PLAN COMPTABLE STANDARD
-- ============================================================

INSERT INTO plan_comptable_standard (numero, libelle, classe, is_modifiable) VALUES
('101', 'Capital', 1, false),
('12', 'Résultat net de l''exercice', 1, false),
('455', 'Comptes courants associés', 1, false),
('457', 'Dividendes à distribuer', 1, false),
('215', 'Matériels roulants', 2, true),
('218', 'Autres immobilisations corporelles', 2, true),
('232', 'Immobilisations incorporelles', 2, true),
('310', 'Stock Essence (SP95/SP91)', 3, false),
('320', 'Stock Gasoil', 3, false),
('330', 'Stock Pétrole lampant', 3, false),
('340', 'Stock Lubrifiants', 3, false),
('350', 'Stock GPL', 3, false),
('360', 'Stock Marchandises générales', 3, false),
('370', 'Stock Pièces et accessoires autos', 3, false),
('401', 'Fournisseurs', 4, false),
('411', 'Clients', 4, false),
('421', 'Rémunérations dues', 4, false),
('431', 'CNAPS à payer', 4, false),
('432', 'OSTIE à payer', 4, false),
('444', 'IR à payer', 4, false),
('447', 'IRSA à payer', 4, false),
('4454', 'TVA à payer', 4, false),
('460', 'Responsabilité opérationnelle', 4, false),
('512', 'Banque', 5, false),
('513', 'Mobile Money', 5, false),
('514', 'Note de crédit', 5, false),
('530', 'Caisse', 5, false),
('601', 'Achats consommés — Coût des ventes', 6, false),
('631', 'Charges fiscales', 6, false),
('632', 'Charges sociales', 6, false),
('641', 'Charges de personnel', 6, false),
('652', 'Pertes sur stocks', 6, false),
('653', 'Pertes sur cessions d''immobilisations', 6, false),
('690', 'Impôt sur les bénéfices', 6, false),
('701', 'Ventes Essence SP', 7, false),
('702', 'Ventes Gasoil', 7, false),
('703', 'Ventes Pétrole lampant', 7, false),
('704', 'Ventes Lubrifiants', 7, false),
('705', 'Ventes GPL', 7, false),
('706', 'Ventes Marchandises générales', 7, false),
('7061', 'Produits Lavage auto', 7, false),
('7062', 'Produits Vulcanisation', 7, false),
('7063', 'Produits Parking', 7, false),
('7064', 'Produits Autres services', 7, false),
('707', 'Ventes Pièces et accessoires', 7, false),
('752', 'Gains sur écarts inventaire', 7, false),
('753', 'Gains sur cessions d''immobilisations', 7, false);

-- ============================================================
-- FIN DU SCHÉMA SUCCESSFUEL V2
-- ============================================================
