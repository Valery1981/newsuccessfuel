-- ============================================================
-- SUCCESSFUEL — CORRECTIF COMPLET AUTH & RLS
-- Version : 2026-05-03
-- Couvre :
--   1. Fonctions helper SECURITY DEFINER
--   2. Fonction signup SECURITY DEFINER (corrige timing email confirmation)
--   3. RLS entreprises + stations améliorés (helpers)
--   4. Colonne must_change_password (idempotent)
--   5. Consolidation RLS toutes tables manquantes
--   6. Plan comptable correct (selon Guide_Document_SuccessFuel.md)
--   7. Materialized views corrigées (nouveaux numéros de comptes)
-- ============================================================
-- IMPORTANT : Script idempotent — DROP IF EXISTS avant chaque CREATE
-- NE modifie PAS les tables, triggers, ni les fonctions métier existantes
-- ============================================================


-- ============================================================
-- SECTION 1 : FONCTIONS HELPER SECURITY DEFINER
-- Évite la récursion RLS et améliore les performances
-- ============================================================

-- Vérifie si l'utilisateur connecté est superadmin
CREATE OR REPLACE FUNCTION public.auth_is_superadmin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comptes
    WHERE supabase_user_id = auth.uid()
      AND type = 'superadmin'
      AND is_active = true
  );
$$;

-- Retourne le compte_id du user connecté
CREATE OR REPLACE FUNCTION public.auth_get_compte_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT id FROM public.comptes
  WHERE supabase_user_id = auth.uid()
  LIMIT 1;
$$;

-- Retourne les station_ids accessibles en écriture (gérant + sessions employés actifs)
CREATE OR REPLACE FUNCTION public.auth_write_station_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  -- Gérant direct
  SELECT s.id FROM public.stations s
  JOIN public.entreprises e ON s.entreprise_id = e.id
  JOIN public.comptes c ON c.id = e.compte_id
  WHERE c.supabase_user_id = auth.uid()
  UNION
  -- Session utilisateur actif (employé)
  SELECT s.id FROM public.stations s
  JOIN public.entreprises e ON s.entreprise_id = e.id
  JOIN public.comptes c ON c.id = e.compte_id
  JOIN public.sessions_utilisateurs su ON su.compte_parent_id = c.id
  WHERE su.supabase_user_id = auth.uid() AND su.status = 'active'
$$;

-- Retourne les entreprise_ids accessibles en écriture (gérant + sessions employés actifs)
CREATE OR REPLACE FUNCTION public.auth_write_entreprise_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  -- Gérant direct
  SELECT e.id FROM public.entreprises e
  JOIN public.comptes c ON c.id = e.compte_id
  WHERE c.supabase_user_id = auth.uid()
  UNION
  -- Session utilisateur actif (employé)
  SELECT e.id FROM public.entreprises e
  JOIN public.comptes c ON c.id = e.compte_id
  JOIN public.sessions_utilisateurs su ON su.compte_parent_id = c.id
  WHERE su.supabase_user_id = auth.uid() AND su.status = 'active'
$$;


-- ============================================================
-- SECTION 2 : FONCTION SIGNUP SECURITY DEFINER
-- Corrige le timing : si email confirmation activée, auth.uid()
-- est NULL après signUp() → INSERT direct échoue.
-- La RPC 'create_compte_gerant' bypass RLS via SECURITY DEFINER.
-- authService.ts doit appeler supabase.rpc('create_compte_gerant', ...)
-- au lieu d'un INSERT direct dans comptes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_compte_gerant(
  p_user_id   UUID,
  p_nom       TEXT,
  p_email     TEXT,
  p_telephone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_compte_id UUID;
BEGIN
  -- Vérifie que l'utilisateur Supabase existe (sécurité)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur Supabase introuvable : %', p_user_id;
  END IF;

  -- Vérifie qu'aucun compte n'existe déjà pour cet utilisateur
  IF EXISTS (SELECT 1 FROM public.comptes WHERE supabase_user_id = p_user_id) THEN
    SELECT id INTO v_compte_id FROM public.comptes WHERE supabase_user_id = p_user_id;
    RETURN v_compte_id;
  END IF;

  INSERT INTO public.comptes (supabase_user_id, type, nom, email, telephone)
  VALUES (p_user_id, 'gerant', p_nom, p_email, p_telephone)
  RETURNING id INTO v_compte_id;

  RETURN v_compte_id;
END;
$$;

-- Permissions : accessible aux utilisateurs authentifiés et anonymes
-- (nécessaire car appelé juste après signUp avant que la session soit active)
GRANT EXECUTE ON FUNCTION public.create_compte_gerant(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_compte_gerant(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ============================================================
-- SECTION 3 : RLS TABLE comptes (idempotent)
-- ============================================================

ALTER TABLE public.comptes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_compte"  ON public.comptes;
DROP POLICY IF EXISTS "users_insert_own_compte"  ON public.comptes;
DROP POLICY IF EXISTS "users_update_own_compte"  ON public.comptes;
DROP POLICY IF EXISTS "superadmin_all_comptes"   ON public.comptes;

-- Chaque user lit son propre compte
CREATE POLICY "users_select_own_compte" ON public.comptes
  FOR SELECT USING (supabase_user_id = auth.uid());

-- INSERT uniquement si session active (fallback — la RPC est préférée)
CREATE POLICY "users_insert_own_compte" ON public.comptes
  FOR INSERT WITH CHECK (supabase_user_id = auth.uid());

-- Chaque user modifie son propre compte
CREATE POLICY "users_update_own_compte" ON public.comptes
  FOR UPDATE
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

-- Superadmin : accès complet
CREATE POLICY "superadmin_all_comptes" ON public.comptes
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());


-- ============================================================
-- SECTION 4 : RLS TABLE entreprises (améliorée avec helpers)
-- ============================================================

ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gerant_own_entreprises"      ON public.entreprises;
DROP POLICY IF EXISTS "superadmin_full_access"      ON public.entreprises;
DROP POLICY IF EXISTS "entreprises_gerant_all"      ON public.entreprises;
DROP POLICY IF EXISTS "entreprises_superadmin_all"  ON public.entreprises;

-- Gérant : gestion complète de ses entreprises
CREATE POLICY "entreprises_gerant_all" ON public.entreprises
  FOR ALL
  USING  (compte_id = public.auth_get_compte_id())
  WITH CHECK (compte_id = public.auth_get_compte_id());

-- Superadmin : accès total (via SECURITY DEFINER)
CREATE POLICY "entreprises_superadmin_all" ON public.entreprises
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());


-- ============================================================
-- SECTION 5 : RLS TABLE stations (améliorée avec helpers)
-- ============================================================

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gerant_own_stations"         ON public.stations;
DROP POLICY IF EXISTS "partenaire_read_stations"    ON public.stations;
DROP POLICY IF EXISTS "stations_superadmin_all"     ON public.stations;
DROP POLICY IF EXISTS "stations_gerant_all"         ON public.stations;
DROP POLICY IF EXISTS "stations_partenaire_select"  ON public.stations;

-- Gérant + sessions employés : écriture complète
CREATE POLICY "stations_gerant_all" ON public.stations
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

-- Partenaire : lecture seule de ses stations réseau
CREATE POLICY "stations_partenaire_select" ON public.stations
  FOR SELECT
  USING (
    partenaire_id IN (
      SELECT id FROM public.partenaires
      WHERE compte_id = public.auth_get_compte_id()
    )
  );

-- Superadmin : accès total
CREATE POLICY "stations_superadmin_all" ON public.stations
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());


-- ============================================================
-- SECTION 6 : COLONNE must_change_password (idempotent)
-- ============================================================

ALTER TABLE public.comptes
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- SECTION 7 : RLS TABLES PRINCIPALES (fix-all-rls consolidé)
-- ============================================================

-- ── cuves ────────────────────────────────────────────────────
ALTER TABLE public.cuves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cuves_gerant_all"        ON public.cuves;
DROP POLICY IF EXISTS "cuves_partenaire_select" ON public.cuves;
DROP POLICY IF EXISTS "cuves_superadmin_all"    ON public.cuves;
CREATE POLICY "cuves_gerant_all" ON public.cuves
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "cuves_partenaire_select" ON public.cuves
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "cuves_superadmin_all" ON public.cuves
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── pistolets ────────────────────────────────────────────────
ALTER TABLE public.pistolets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pistolets_gerant_all"        ON public.pistolets;
DROP POLICY IF EXISTS "pistolets_partenaire_select" ON public.pistolets;
DROP POLICY IF EXISTS "pistolets_superadmin_all"    ON public.pistolets;
CREATE POLICY "pistolets_gerant_all" ON public.pistolets
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "pistolets_partenaire_select" ON public.pistolets
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "pistolets_superadmin_all" ON public.pistolets
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── tiers ────────────────────────────────────────────────────
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tiers_gerant_all"     ON public.tiers;
DROP POLICY IF EXISTS "tiers_superadmin_all" ON public.tiers;
CREATE POLICY "tiers_gerant_all" ON public.tiers
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "tiers_superadmin_all" ON public.tiers
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── articles ─────────────────────────────────────────────────
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "articles_gerant_all"     ON public.articles;
DROP POLICY IF EXISTS "articles_superadmin_all" ON public.articles;
CREATE POLICY "articles_gerant_all" ON public.articles
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "articles_superadmin_all" ON public.articles
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── tresoreries ──────────────────────────────────────────────
ALTER TABLE public.tresoreries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tresoreries_gerant_all"     ON public.tresoreries;
DROP POLICY IF EXISTS "tresoreries_superadmin_all" ON public.tresoreries;
CREATE POLICY "tresoreries_gerant_all" ON public.tresoreries
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "tresoreries_superadmin_all" ON public.tresoreries
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── ecritures_comptables ─────────────────────────────────────
ALTER TABLE public.ecritures_comptables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecritures_gerant_all"     ON public.ecritures_comptables;
DROP POLICY IF EXISTS "ecritures_superadmin_all" ON public.ecritures_comptables;
CREATE POLICY "ecritures_gerant_all" ON public.ecritures_comptables
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "ecritures_superadmin_all" ON public.ecritures_comptables
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_ecriture ──────────────────────────────────────────
ALTER TABLE public.lignes_ecriture ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_ecriture_gerant_all"     ON public.lignes_ecriture;
DROP POLICY IF EXISTS "lignes_ecriture_superadmin_all" ON public.lignes_ecriture;
CREATE POLICY "lignes_ecriture_gerant_all" ON public.lignes_ecriture
  FOR ALL
  USING (ecriture_id IN (
    SELECT id FROM public.ecritures_comptables
    WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (ecriture_id IN (
    SELECT id FROM public.ecritures_comptables
    WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "lignes_ecriture_superadmin_all" ON public.lignes_ecriture
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── mouvements_stock ─────────────────────────────────────────
ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mouvements_stock_gerant_all"        ON public.mouvements_stock;
DROP POLICY IF EXISTS "mouvements_stock_partenaire_select" ON public.mouvements_stock;
DROP POLICY IF EXISTS "mouvements_stock_superadmin_all"    ON public.mouvements_stock;
CREATE POLICY "mouvements_stock_gerant_all" ON public.mouvements_stock
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "mouvements_stock_partenaire_select" ON public.mouvements_stock
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "mouvements_stock_superadmin_all" ON public.mouvements_stock
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── stocks_boutique ──────────────────────────────────────────
ALTER TABLE public.stocks_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stocks_boutique_gerant_all"        ON public.stocks_boutique;
DROP POLICY IF EXISTS "stocks_boutique_partenaire_select" ON public.stocks_boutique;
DROP POLICY IF EXISTS "stocks_boutique_superadmin_all"    ON public.stocks_boutique;
CREATE POLICY "stocks_boutique_gerant_all" ON public.stocks_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "stocks_boutique_partenaire_select" ON public.stocks_boutique
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "stocks_boutique_superadmin_all" ON public.stocks_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── shifts_carburant ─────────────────────────────────────────
ALTER TABLE public.shifts_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_carb_gerant_all"        ON public.shifts_carburant;
DROP POLICY IF EXISTS "shifts_carb_partenaire_select" ON public.shifts_carburant;
DROP POLICY IF EXISTS "shifts_carb_superadmin_all"    ON public.shifts_carburant;
CREATE POLICY "shifts_carb_gerant_all" ON public.shifts_carburant
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "shifts_carb_partenaire_select" ON public.shifts_carburant
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "shifts_carb_superadmin_all" ON public.shifts_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── shifts_boutique ──────────────────────────────────────────
ALTER TABLE public.shifts_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_boutique_gerant_all"     ON public.shifts_boutique;
DROP POLICY IF EXISTS "shifts_boutique_superadmin_all" ON public.shifts_boutique;
CREATE POLICY "shifts_boutique_gerant_all" ON public.shifts_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "shifts_boutique_superadmin_all" ON public.shifts_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── tickets_boutique ─────────────────────────────────────────
ALTER TABLE public.tickets_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_boutique_gerant_all"     ON public.tickets_boutique;
DROP POLICY IF EXISTS "tickets_boutique_superadmin_all" ON public.tickets_boutique;
CREATE POLICY "tickets_boutique_gerant_all" ON public.tickets_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "tickets_boutique_superadmin_all" ON public.tickets_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── achats_carburant ─────────────────────────────────────────
ALTER TABLE public.achats_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achats_carb_gerant_all"     ON public.achats_carburant;
DROP POLICY IF EXISTS "achats_carb_superadmin_all" ON public.achats_carburant;
CREATE POLICY "achats_carb_gerant_all" ON public.achats_carburant
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "achats_carb_superadmin_all" ON public.achats_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── achats_boutique ──────────────────────────────────────────
ALTER TABLE public.achats_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achats_boutique_gerant_all"     ON public.achats_boutique;
DROP POLICY IF EXISTS "achats_boutique_superadmin_all" ON public.achats_boutique;
CREATE POLICY "achats_boutique_gerant_all" ON public.achats_boutique
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "achats_boutique_superadmin_all" ON public.achats_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── inventaires ──────────────────────────────────────────────
ALTER TABLE public.inventaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventaires_gerant_all"        ON public.inventaires;
DROP POLICY IF EXISTS "inventaires_partenaire_select" ON public.inventaires;
DROP POLICY IF EXISTS "inventaires_superadmin_all"    ON public.inventaires;
CREATE POLICY "inventaires_gerant_all" ON public.inventaires
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "inventaires_partenaire_select" ON public.inventaires
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "inventaires_superadmin_all" ON public.inventaires
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── creances ─────────────────────────────────────────────────
ALTER TABLE public.creances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creances_gerant_all"     ON public.creances;
DROP POLICY IF EXISTS "creances_superadmin_all" ON public.creances;
CREATE POLICY "creances_gerant_all" ON public.creances
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "creances_superadmin_all" ON public.creances
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── dettes ───────────────────────────────────────────────────
ALTER TABLE public.dettes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dettes_gerant_all"     ON public.dettes;
DROP POLICY IF EXISTS "dettes_superadmin_all" ON public.dettes;
CREATE POLICY "dettes_gerant_all" ON public.dettes
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "dettes_superadmin_all" ON public.dettes
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── sessions_utilisateurs ────────────────────────────────────
ALTER TABLE public.sessions_utilisateurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_own_read"       ON public.sessions_utilisateurs;
DROP POLICY IF EXISTS "sessions_gerant_all"     ON public.sessions_utilisateurs;
DROP POLICY IF EXISTS "sessions_superadmin_all" ON public.sessions_utilisateurs;
-- Session : lecture de sa propre ligne (pour connaître ses droits)
CREATE POLICY "sessions_own_read" ON public.sessions_utilisateurs
  FOR SELECT USING (supabase_user_id = auth.uid());
-- Gérant : gestion complète de ses sessions
CREATE POLICY "sessions_gerant_all" ON public.sessions_utilisateurs
  FOR ALL
  USING  (compte_parent_id = public.auth_get_compte_id())
  WITH CHECK (compte_parent_id = public.auth_get_compte_id());
CREATE POLICY "sessions_superadmin_all" ON public.sessions_utilisateurs
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── plan_comptable_standard ──────────────────────────────────
ALTER TABLE public.plan_comptable_standard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_standard_public_read" ON public.plan_comptable_standard;
DROP POLICY IF EXISTS "plan_standard_superadmin"  ON public.plan_comptable_standard;
-- Référentiel commun : lecture pour tout utilisateur connecté
CREATE POLICY "plan_standard_public_read" ON public.plan_comptable_standard
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "plan_standard_superadmin" ON public.plan_comptable_standard
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── plan_comptable_entreprise ────────────────────────────────
ALTER TABLE public.plan_comptable_entreprise ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_cpta_ent_gerant_all"     ON public.plan_comptable_entreprise;
DROP POLICY IF EXISTS "plan_cpta_ent_superadmin_all" ON public.plan_comptable_entreprise;
CREATE POLICY "plan_cpta_ent_gerant_all" ON public.plan_comptable_entreprise
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "plan_cpta_ent_superadmin_all" ON public.plan_comptable_entreprise
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── categories_articles ──────────────────────────────────────
ALTER TABLE public.categories_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cat_articles_gerant_all"     ON public.categories_articles;
DROP POLICY IF EXISTS "cat_articles_superadmin_all" ON public.categories_articles;
CREATE POLICY "cat_articles_gerant_all" ON public.categories_articles
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "cat_articles_superadmin_all" ON public.categories_articles
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── prix_vente_articles ──────────────────────────────────────
ALTER TABLE public.prix_vente_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prix_vente_gerant_all"     ON public.prix_vente_articles;
DROP POLICY IF EXISTS "prix_vente_superadmin_all" ON public.prix_vente_articles;
CREATE POLICY "prix_vente_gerant_all" ON public.prix_vente_articles
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "prix_vente_superadmin_all" ON public.prix_vente_articles
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── prix_carburant ───────────────────────────────────────────
ALTER TABLE public.prix_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prix_carb_gerant_all"        ON public.prix_carburant;
DROP POLICY IF EXISTS "prix_carb_partenaire_select" ON public.prix_carburant;
DROP POLICY IF EXISTS "prix_carb_superadmin_all"    ON public.prix_carburant;
CREATE POLICY "prix_carb_gerant_all" ON public.prix_carburant
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "prix_carb_partenaire_select" ON public.prix_carburant
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "prix_carb_superadmin_all" ON public.prix_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── objectifs ────────────────────────────────────────────────
ALTER TABLE public.objectifs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "objectifs_gerant_all"        ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_partenaire_select" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_superadmin_all"    ON public.objectifs;
CREATE POLICY "objectifs_gerant_all" ON public.objectifs
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "objectifs_partenaire_select" ON public.objectifs
  FOR SELECT USING (station_id IN (
    SELECT id FROM public.stations WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));
CREATE POLICY "objectifs_superadmin_all" ON public.objectifs
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── seuils_alerte_stock ──────────────────────────────────────
ALTER TABLE public.seuils_alerte_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seuils_gerant_all"     ON public.seuils_alerte_stock;
DROP POLICY IF EXISTS "seuils_superadmin_all" ON public.seuils_alerte_stock;
CREATE POLICY "seuils_gerant_all" ON public.seuils_alerte_stock
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));
CREATE POLICY "seuils_superadmin_all" ON public.seuils_alerte_stock
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── camions ──────────────────────────────────────────────────
ALTER TABLE public.camions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camions_gerant_all"     ON public.camions;
DROP POLICY IF EXISTS "camions_superadmin_all" ON public.camions;
CREATE POLICY "camions_gerant_all" ON public.camions
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "camions_superadmin_all" ON public.camions
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── compartiments_camion ─────────────────────────────────────
ALTER TABLE public.compartiments_camion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compartiments_gerant_all"     ON public.compartiments_camion;
DROP POLICY IF EXISTS "compartiments_superadmin_all" ON public.compartiments_camion;
CREATE POLICY "compartiments_gerant_all" ON public.compartiments_camion
  FOR ALL
  USING (camion_id IN (
    SELECT id FROM public.camions
    WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (camion_id IN (
    SELECT id FROM public.camions
    WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "compartiments_superadmin_all" ON public.compartiments_camion
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_tiers ──────────────────────────────────────────
ALTER TABLE public.compteurs_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compteurs_tiers_gerant_all"     ON public.compteurs_tiers;
DROP POLICY IF EXISTS "compteurs_tiers_superadmin_all" ON public.compteurs_tiers;
CREATE POLICY "compteurs_tiers_gerant_all" ON public.compteurs_tiers
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "compteurs_tiers_superadmin_all" ON public.compteurs_tiers
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_tresorerie ─────────────────────────────────────
ALTER TABLE public.compteurs_tresorerie ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compteurs_tres_gerant_all"     ON public.compteurs_tresorerie;
DROP POLICY IF EXISTS "compteurs_tres_superadmin_all" ON public.compteurs_tresorerie;
CREATE POLICY "compteurs_tres_gerant_all" ON public.compteurs_tresorerie
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "compteurs_tres_superadmin_all" ON public.compteurs_tresorerie
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_comptes ────────────────────────────────────────
ALTER TABLE public.compteurs_comptes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compteurs_cptes_gerant_all"     ON public.compteurs_comptes;
DROP POLICY IF EXISTS "compteurs_cptes_superadmin_all" ON public.compteurs_comptes;
CREATE POLICY "compteurs_cptes_gerant_all" ON public.compteurs_comptes
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "compteurs_cptes_superadmin_all" ON public.compteurs_comptes
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── operations_hors_av ───────────────────────────────────────
ALTER TABLE public.operations_hors_av ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ops_hors_av_gerant_all"     ON public.operations_hors_av;
DROP POLICY IF EXISTS "ops_hors_av_superadmin_all" ON public.operations_hors_av;
CREATE POLICY "ops_hors_av_gerant_all" ON public.operations_hors_av
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "ops_hors_av_superadmin_all" ON public.operations_hors_av
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── transferts_stock ─────────────────────────────────────────
ALTER TABLE public.transferts_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transferts_gerant_all"     ON public.transferts_stock;
DROP POLICY IF EXISTS "transferts_superadmin_all" ON public.transferts_stock;
CREATE POLICY "transferts_gerant_all" ON public.transferts_stock
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "transferts_superadmin_all" ON public.transferts_stock
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── notifications ────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_notifications"             ON public.notifications;
DROP POLICY IF EXISTS "notifications_superadmin_all"  ON public.notifications;
CREATE POLICY "own_notifications" ON public.notifications
  FOR ALL USING (
    destinataire_compte_id = public.auth_get_compte_id()
  );
CREATE POLICY "notifications_superadmin_all" ON public.notifications
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── audit_log ────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin_audit_read"  ON public.audit_log;
CREATE POLICY "superadmin_audit_read" ON public.audit_log
  FOR SELECT USING (public.auth_is_superadmin());
-- Note : les triggers s'exécutent en tant que postgres (BYPASSRLS)
-- Aucune policy INSERT nécessaire pour les triggers d'audit

-- ── partenaires ──────────────────────────────────────────────
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partenaires_superadmin_all"           ON public.partenaires;
DROP POLICY IF EXISTS "partenaires_gerant_select"            ON public.partenaires;
DROP POLICY IF EXISTS "partenaire_select_own_partenaire"     ON public.partenaires;
CREATE POLICY "partenaires_superadmin_all" ON public.partenaires
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());
-- Gérant peut lire la liste des partenaires (onboarding, sélection station)
CREATE POLICY "partenaires_gerant_select" ON public.partenaires
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.comptes c
      WHERE c.supabase_user_id = auth.uid() AND c.type = 'gerant' AND c.is_active = true)
  );
-- Compte partenaire : lit sa propre fiche
CREATE POLICY "partenaire_select_own_partenaire" ON public.partenaires
  FOR SELECT USING (
    compte_id IS NOT NULL AND compte_id = public.auth_get_compte_id()
  );

-- ── abonnements ──────────────────────────────────────────────
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "abonnements_superadmin_all"    ON public.abonnements;
DROP POLICY IF EXISTS "abonnements_gerant_select"     ON public.abonnements;
DROP POLICY IF EXISTS "abonnements_partenaire_select" ON public.abonnements;
CREATE POLICY "abonnements_superadmin_all" ON public.abonnements
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());
CREATE POLICY "abonnements_gerant_select" ON public.abonnements
  FOR SELECT USING (
    entreprise_id IN (
      SELECT id FROM public.entreprises WHERE compte_id = public.auth_get_compte_id()
    )
  );
CREATE POLICY "abonnements_partenaire_select" ON public.abonnements
  FOR SELECT USING (
    partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  );

-- ── doléances ────────────────────────────────────────────────
ALTER TABLE public.doleances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doleances_superadmin_all"  ON public.doleances;
DROP POLICY IF EXISTS "doleances_gerant_all"      ON public.doleances;
DROP POLICY IF EXISTS "doleances_partenaire_all"  ON public.doleances;
CREATE POLICY "doleances_superadmin_all" ON public.doleances
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());
CREATE POLICY "doleances_gerant_all" ON public.doleances
  FOR ALL USING (
    station_id IN (SELECT public.auth_write_station_ids())
  );
CREATE POLICY "doleances_partenaire_all" ON public.doleances
  FOR ALL USING (
    partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  );


-- ============================================================
-- SECTION 8 : RLS TABLES ENFANTS (child tables)
-- ============================================================

-- ── calibrages ───────────────────────────────────────────────
ALTER TABLE public.calibrages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calibrages_gerant_all"        ON public.calibrages;
DROP POLICY IF EXISTS "calibrages_partenaire_select" ON public.calibrages;
DROP POLICY IF EXISTS "calibrages_superadmin_all"    ON public.calibrages;
CREATE POLICY "calibrages_gerant_all" ON public.calibrages
  FOR ALL
  USING (cuve_id IN (SELECT id FROM public.cuves WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (cuve_id IN (SELECT id FROM public.cuves WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "calibrages_partenaire_select" ON public.calibrages
  FOR SELECT USING (cuve_id IN (
    SELECT c.id FROM public.cuves c
    JOIN public.stations s ON s.id = c.station_id
    WHERE s.partenaire_id IN (SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id())
  ));
CREATE POLICY "calibrages_superadmin_all" ON public.calibrages
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── initialisation ───────────────────────────────────────────
ALTER TABLE public.initialisation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "initialisation_gerant_all"     ON public.initialisation;
DROP POLICY IF EXISTS "initialisation_superadmin_all" ON public.initialisation;
CREATE POLICY "initialisation_gerant_all" ON public.initialisation
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));
CREATE POLICY "initialisation_superadmin_all" ON public.initialisation
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_cuves ─────────────────────────────────────
ALTER TABLE public.initialisation_cuves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "init_cuves_gerant_all"     ON public.initialisation_cuves;
DROP POLICY IF EXISTS "init_cuves_superadmin_all" ON public.initialisation_cuves;
CREATE POLICY "init_cuves_gerant_all" ON public.initialisation_cuves
  FOR ALL
  USING (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "init_cuves_superadmin_all" ON public.initialisation_cuves
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_stocks_boutique ───────────────────────────
ALTER TABLE public.initialisation_stocks_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "init_stocks_gerant_all"     ON public.initialisation_stocks_boutique;
DROP POLICY IF EXISTS "init_stocks_superadmin_all" ON public.initialisation_stocks_boutique;
CREATE POLICY "init_stocks_gerant_all" ON public.initialisation_stocks_boutique
  FOR ALL
  USING (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "init_stocks_superadmin_all" ON public.initialisation_stocks_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_index_pistolets ───────────────────────────
ALTER TABLE public.initialisation_index_pistolets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "init_pistolets_gerant_all"     ON public.initialisation_index_pistolets;
DROP POLICY IF EXISTS "init_pistolets_superadmin_all" ON public.initialisation_index_pistolets;
CREATE POLICY "init_pistolets_gerant_all" ON public.initialisation_index_pistolets
  FOR ALL
  USING (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "init_pistolets_superadmin_all" ON public.initialisation_index_pistolets
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_comptes ───────────────────────────────────
ALTER TABLE public.initialisation_comptes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "init_comptes_gerant_all"     ON public.initialisation_comptes;
DROP POLICY IF EXISTS "init_comptes_superadmin_all" ON public.initialisation_comptes;
CREATE POLICY "init_comptes_gerant_all" ON public.initialisation_comptes
  FOR ALL
  USING (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ))
  WITH CHECK (initialisation_id IN (
    SELECT id FROM public.initialisation WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
  ));
CREATE POLICY "init_comptes_superadmin_all" ON public.initialisation_comptes
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_bc_carburant ──────────────────────────────────────
ALTER TABLE public.lignes_bc_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_bc_gerant_all"     ON public.lignes_bc_carburant;
DROP POLICY IF EXISTS "lignes_bc_superadmin_all" ON public.lignes_bc_carburant;
CREATE POLICY "lignes_bc_gerant_all" ON public.lignes_bc_carburant
  FOR ALL
  USING (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())))
  WITH CHECK (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())));
CREATE POLICY "lignes_bc_superadmin_all" ON public.lignes_bc_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── paiements_achat_carburant ────────────────────────────────
ALTER TABLE public.paiements_achat_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pmt_achat_carb_gerant_all"     ON public.paiements_achat_carburant;
DROP POLICY IF EXISTS "pmt_achat_carb_superadmin_all" ON public.paiements_achat_carburant;
CREATE POLICY "pmt_achat_carb_gerant_all" ON public.paiements_achat_carburant
  FOR ALL
  USING (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())))
  WITH CHECK (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())));
CREATE POLICY "pmt_achat_carb_superadmin_all" ON public.paiements_achat_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── receptions_carburant ─────────────────────────────────────
ALTER TABLE public.receptions_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receptions_carb_gerant_all"     ON public.receptions_carburant;
DROP POLICY IF EXISTS "receptions_carb_superadmin_all" ON public.receptions_carburant;
CREATE POLICY "receptions_carb_gerant_all" ON public.receptions_carburant
  FOR ALL
  USING (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())))
  WITH CHECK (achat_id IN (SELECT id FROM public.achats_carburant WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())));
CREATE POLICY "receptions_carb_superadmin_all" ON public.receptions_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_shift_carburant ───────────────────────────────────
ALTER TABLE public.lignes_shift_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_shift_carb_gerant_all"     ON public.lignes_shift_carburant;
DROP POLICY IF EXISTS "lignes_shift_carb_superadmin_all" ON public.lignes_shift_carburant;
CREATE POLICY "lignes_shift_carb_gerant_all" ON public.lignes_shift_carburant
  FOR ALL
  USING (shift_id IN (SELECT id FROM public.shifts_carburant WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (shift_id IN (SELECT id FROM public.shifts_carburant WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "lignes_shift_carb_superadmin_all" ON public.lignes_shift_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── paiements_shift_carburant ────────────────────────────────
ALTER TABLE public.paiements_shift_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pmt_shift_carb_gerant_all"     ON public.paiements_shift_carburant;
DROP POLICY IF EXISTS "pmt_shift_carb_superadmin_all" ON public.paiements_shift_carburant;
CREATE POLICY "pmt_shift_carb_gerant_all" ON public.paiements_shift_carburant
  FOR ALL
  USING (shift_id IN (SELECT id FROM public.shifts_carburant WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (shift_id IN (SELECT id FROM public.shifts_carburant WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "pmt_shift_carb_superadmin_all" ON public.paiements_shift_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_ticket_boutique ───────────────────────────────────
ALTER TABLE public.lignes_ticket_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_ticket_gerant_all"     ON public.lignes_ticket_boutique;
DROP POLICY IF EXISTS "lignes_ticket_superadmin_all" ON public.lignes_ticket_boutique;
CREATE POLICY "lignes_ticket_gerant_all" ON public.lignes_ticket_boutique
  FOR ALL
  USING (ticket_id IN (SELECT id FROM public.tickets_boutique WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (ticket_id IN (SELECT id FROM public.tickets_boutique WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "lignes_ticket_superadmin_all" ON public.lignes_ticket_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── paiements_ticket_boutique ────────────────────────────────
ALTER TABLE public.paiements_ticket_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pmt_ticket_gerant_all"     ON public.paiements_ticket_boutique;
DROP POLICY IF EXISTS "pmt_ticket_superadmin_all" ON public.paiements_ticket_boutique;
CREATE POLICY "pmt_ticket_gerant_all" ON public.paiements_ticket_boutique
  FOR ALL
  USING (ticket_id IN (SELECT id FROM public.tickets_boutique WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (ticket_id IN (SELECT id FROM public.tickets_boutique WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "pmt_ticket_superadmin_all" ON public.paiements_ticket_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_achat_boutique ────────────────────────────────────
ALTER TABLE public.lignes_achat_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_achat_bq_gerant_all"     ON public.lignes_achat_boutique;
DROP POLICY IF EXISTS "lignes_achat_bq_superadmin_all" ON public.lignes_achat_boutique;
CREATE POLICY "lignes_achat_bq_gerant_all" ON public.lignes_achat_boutique
  FOR ALL
  USING (achat_id IN (SELECT id FROM public.achats_boutique WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())))
  WITH CHECK (achat_id IN (SELECT id FROM public.achats_boutique WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())));
CREATE POLICY "lignes_achat_bq_superadmin_all" ON public.lignes_achat_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── paiements_achat_boutique ─────────────────────────────────
ALTER TABLE public.paiements_achat_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pmt_achat_bq_gerant_all"     ON public.paiements_achat_boutique;
DROP POLICY IF EXISTS "pmt_achat_bq_superadmin_all" ON public.paiements_achat_boutique;
CREATE POLICY "pmt_achat_bq_gerant_all" ON public.paiements_achat_boutique
  FOR ALL
  USING (achat_id IN (SELECT id FROM public.achats_boutique WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())))
  WITH CHECK (achat_id IN (SELECT id FROM public.achats_boutique WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())));
CREATE POLICY "pmt_achat_bq_superadmin_all" ON public.paiements_achat_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_inventaire_carburant ──────────────────────────────
ALTER TABLE public.lignes_inventaire_carburant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_inv_carb_gerant_all"     ON public.lignes_inventaire_carburant;
DROP POLICY IF EXISTS "lignes_inv_carb_superadmin_all" ON public.lignes_inventaire_carburant;
CREATE POLICY "lignes_inv_carb_gerant_all" ON public.lignes_inventaire_carburant
  FOR ALL
  USING (inventaire_id IN (SELECT id FROM public.inventaires WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (inventaire_id IN (SELECT id FROM public.inventaires WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "lignes_inv_carb_superadmin_all" ON public.lignes_inventaire_carburant
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());

-- ── lignes_inventaire_boutique ───────────────────────────────
ALTER TABLE public.lignes_inventaire_boutique ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lignes_inv_bq_gerant_all"     ON public.lignes_inventaire_boutique;
DROP POLICY IF EXISTS "lignes_inv_bq_superadmin_all" ON public.lignes_inventaire_boutique;
CREATE POLICY "lignes_inv_bq_gerant_all" ON public.lignes_inventaire_boutique
  FOR ALL
  USING (inventaire_id IN (SELECT id FROM public.inventaires WHERE station_id IN (SELECT public.auth_write_station_ids())))
  WITH CHECK (inventaire_id IN (SELECT id FROM public.inventaires WHERE station_id IN (SELECT public.auth_write_station_ids())));
CREATE POLICY "lignes_inv_bq_superadmin_all" ON public.lignes_inventaire_boutique
  FOR ALL USING (public.auth_is_superadmin()) WITH CHECK (public.auth_is_superadmin());


-- ============================================================
-- SECTION 9 : PLAN COMPTABLE STANDARD CORRECT
-- Conforme à Guide_Document_SuccessFuel.md section 8.1
-- Remplace l'ancien plan (comptes 701-707 incorrects)
-- ============================================================

-- Vider et recharger (données de référence, pas de données utilisateur)
DELETE FROM public.plan_comptable_standard;

INSERT INTO public.plan_comptable_standard (numero, libelle, classe, is_centralisateur, numero_parent, is_modifiable) VALUES
-- CLASSE 1 : Capitaux
('101',  'Capital',                              1, false, NULL,  false),
('120',  'Résultat net de l''exercice',          1, false, NULL,  false),
('161',  'Emprunts à long terme',                1, false, NULL,  false),
('455',  'Comptes courants associés',            1, false, NULL,  false),
('457',  'Dividendes à distribuer',              1, false, NULL,  false),
-- CLASSE 2 : Immobilisations (personnalisables par le gérant)
('211',  'Matériels et mobilier de bureau',      2, false, NULL,  true),
('215',  'Matériels roulants',                   2, false, NULL,  true),
('218',  'Matériels informatiques',              2, false, NULL,  true),
('220',  'Matériels et outillages',              2, false, NULL,  true),
('228',  'Équipements spécifiques',              2, false, NULL,  true),
('240',  'Cautions et dépôts de garantie',       2, false, NULL,  true),
-- CLASSE 3 : Stocks (figés)
('310',  'Stock Essence (SP95/SP91)',            3, false, NULL,  false),
('320',  'Stock Gasoil',                         3, false, NULL,  false),
('330',  'Stock Pétrole lampant',                3, false, NULL,  false),
('340',  'Stock Lubrifiants',                    3, false, NULL,  false),
('350',  'Stock GPL',                            3, false, NULL,  false),
('360',  'Stock Marchandises générales',         3, false, NULL,  false),
('370',  'Stock Pièces et accessoires autos',    3, false, NULL,  false),
-- CLASSE 4 : Tiers (figés)
('401',  'Fournisseurs',                         4, false, NULL,  false),
('411',  'Clients',                              4, false, NULL,  false),
('421',  'Rémunérations dues',                   4, false, NULL,  false),
('431',  'CNAPS à payer',                        4, false, NULL,  false),
('432',  'OSTIE à payer',                        4, false, NULL,  false),
('444',  'IR à payer',                           4, false, NULL,  false),
('447',  'IRSA à payer',                         4, false, NULL,  false),
('4454', 'TVA à payer',                          4, false, NULL,  false),
('460',  'Responsabilité opérationnelle',        4, false, NULL,  false),
-- CLASSE 5 : Trésorerie (figés)
('512',  'Banque',                               5, false, NULL,  false),
('513',  'Mobile Money',                         5, false, NULL,  false),
('514',  'Note de crédit',                       5, false, NULL,  false),
('530',  'Caisse',                               5, false, NULL,  false),
-- CLASSE 6 : Charges (figés sauf note)
('601',  'Petit outillage et accessoires divers',6, false, NULL,  false),
('602',  'Fournitures de bureau',                6, false, NULL,  false),
('603',  'Coût des ventes (centralisateur)',     6, true,  NULL,  false),
('6031', 'CAMV Essence',                         6, false, '603', false),
('6032', 'CAMV Gasoil',                          6, false, '603', false),
('6033', 'CAMV Pétrole lampant',                 6, false, '603', false),
('6034', 'CAMV Marchandises générales',          6, false, '603', false),
('6035', 'CAMV Lubrifiants',                     6, false, '603', false),
('6036', 'CAMV GPL',                             6, false, '603', false),
('6037', 'CAMV Pièces et accessoires',           6, false, '603', false),
('605',  'Eau et électricité',                   6, false, NULL,  false),
('606',  'Fournitures administratives',          6, false, NULL,  false),
('611',  'Locations',                            6, false, NULL,  false),
('612',  'Entretien et réparations',             6, false, NULL,  false),
('613',  'Primes d''assurances',                 6, false, NULL,  false),
('614',  'Personnel extérieur',                  6, false, NULL,  false),
('615',  'Consultance',                          6, false, NULL,  false),
('616',  'Publications, impression et marketing',6, false, NULL,  false),
('617',  'Frais de transport',                   6, false, NULL,  false),
('618',  'Missions et réception',                6, false, NULL,  false),
('619',  'Frais de télécommunications',          6, false, NULL,  false),
('620',  'Services bancaires',                   6, false, NULL,  false),
('630',  'Impôts et taxes diverses',             6, false, NULL,  false),
('640',  'Salaires',                             6, false, NULL,  false),
('651',  'Écarts négatifs sur carburants',       6, false, NULL,  false),
('652',  'Écarts négatifs sur articles boutique',6, false, NULL,  false),
('653',  'Pertes sur cessions d''immobilisations',6, false, NULL, false),
('654',  'Pertes sur créances irrécouvrables',   6, false, NULL,  false),
('661',  'Charges financières',                  6, false, NULL,  false),
('690',  'Impôt sur les bénéfices',              6, false, NULL,  false),
-- CLASSE 7 : Produits (figés)
('706',  'Prestations de services (centralisateur)', 7, true, NULL, false),
('7061', 'Vente Lavage',                         7, false, '706', false),
('7062', 'Vente Vulcanisation',                  7, false, '706', false),
('7063', 'Vente Parking',                        7, false, '706', false),
('7069', 'Autres prestations',                   7, false, '706', false),
('707',  'Ventes produits (centralisateur)',     7, true,  NULL,  false),
('7071', 'Vente Essence',                        7, false, '707', false),
('7072', 'Vente Gasoil',                         7, false, '707', false),
('7073', 'Vente Pétrole lampant',                7, false, '707', false),
('7074', 'Vente Marchandises générales',         7, false, '707', false),
('7075', 'Vente Lubrifiants',                    7, false, '707', false),
('7076', 'Vente GPL',                            7, false, '707', false),
('7077', 'Vente Pièces et accessoires',          7, false, '707', false),
('751',  'Écarts positifs sur carburants',       7, false, NULL,  false),
('752',  'Écarts positifs sur articles boutique',7, false, NULL,  false),
('753',  'Gains sur cessions d''immobilisations',7, false, NULL,  false),
('761',  'Produits financiers',                  7, false, NULL,  false);


-- ============================================================
-- SECTION 10 : CORRECTION MATERIALIZED VIEWS
-- Rebuild avec les bons numéros de comptes (7071-7077, 706x, 6031-6037)
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_ca_mensuel;
DROP MATERIALIZED VIEW IF EXISTS mv_capitaux_propres;
DROP MATERIALIZED VIEW IF EXISTS mv_stocks_valorises;

CREATE MATERIALIZED VIEW mv_ca_mensuel AS
SELECT
  ec.entreprise_id,
  ec.station_id,
  s.nom AS station_nom,
  DATE_TRUNC('month', ec.date_ecriture) AS mois,
  -- Ventes carburant : 7071 Essence, 7072 Gasoil, 7073 Pétrole
  SUM(CASE WHEN le.numero_compte IN ('7071','7072','7073') THEN le.credit - le.debit ELSE 0 END) AS ca_carburant,
  -- Ventes boutique : 7074-7077
  SUM(CASE WHEN le.numero_compte IN ('7074','7075','7076','7077') THEN le.credit - le.debit ELSE 0 END) AS ca_boutique,
  -- Ventes services : 7061-7069
  SUM(CASE WHEN le.numero_compte LIKE '706%' THEN le.credit - le.debit ELSE 0 END) AS ca_services,
  -- CA total (classe 7)
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '7' THEN le.credit - le.debit ELSE 0 END) AS ca_total,
  -- Charges totales (classe 6)
  SUM(CASE WHEN LEFT(le.numero_compte, 1) = '6' THEN le.debit - le.credit ELSE 0 END) AS total_charges,
  -- Marge brute
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
  -- Capital 101
  COALESCE(SUM(CASE WHEN le.numero_compte LIKE '101%'
    THEN le.credit - le.debit ELSE 0 END), 0) AS capital_101,
  -- Résultat net YTD (120) : total classe 7 - classe 6 de l'année
  COALESCE(
    SUM(CASE WHEN LEFT(le.numero_compte,1)='7'
      AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM NOW())
      THEN le.credit - le.debit ELSE 0 END) -
    SUM(CASE WHEN LEFT(le.numero_compte,1)='6'
      AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM NOW())
      THEN le.debit - le.credit ELSE 0 END),
  0) AS resultat_ytd,
  -- Capitaux propres nets = 101 + résultat YTD
  COALESCE(SUM(CASE WHEN le.numero_compte LIKE '101%'
    THEN le.credit - le.debit ELSE 0 END), 0) +
  COALESCE(
    SUM(CASE WHEN LEFT(le.numero_compte,1)='7'
      AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM NOW())
      THEN le.credit - le.debit ELSE 0 END) -
    SUM(CASE WHEN LEFT(le.numero_compte,1)='6'
      AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM NOW())
      THEN le.debit - le.credit ELSE 0 END),
  0) AS capitaux_propres_nets
FROM entreprises e
LEFT JOIN ecritures_comptables ec ON ec.entreprise_id = e.id AND ec.statut = 'validee'
LEFT JOIN lignes_ecriture le ON le.ecriture_id = ec.id
GROUP BY e.id
WITH DATA;

CREATE UNIQUE INDEX idx_mv_capitaux ON mv_capitaux_propres(entreprise_id);

CREATE MATERIALIZED VIEW mv_stocks_valorises AS
SELECT
  sb.station_id, s.nom AS station_nom,
  sb.article_id, a.nom AS article_nom, a.famille,
  sb.quantite, sb.cmup,
  ROUND(sb.quantite * sb.cmup, 2) AS valeur_stock,
  sb.updated_at
FROM stocks_boutique sb
JOIN stations s ON sb.station_id = s.id
JOIN articles a ON sb.article_id = a.id
WITH DATA;

CREATE UNIQUE INDEX idx_mv_stocks ON mv_stocks_valorises(station_id, article_id);


-- ============================================================
-- SECTION 11 : VÉRIFICATION FINALE
-- À lancer après exécution pour confirmer l'état RLS
-- ============================================================
-- Requête de vérification (copier-coller dans SQL Editor séparément) :
--
-- SELECT tablename, COUNT(*) AS nb_policies
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;
--
-- Tables sans policy (si RLS activé) = accès bloqué total :
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public')
-- ORDER BY tablename;

-- ============================================================
-- FIN DU SCRIPT CORRECTIF
-- Après validation SQL → mettre à jour authService.ts
-- pour utiliser supabase.rpc('create_compte_gerant', ...)
-- ============================================================
