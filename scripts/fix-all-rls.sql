-- ============================================================
-- SUCCESSFUEL — CORRECTIF COMPLET RLS
-- Tables avec RLS activé mais sans policies définies
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================
-- Symptôme : "new row violates row-level security policy for table X"
-- Cause    : RLS activé sur la table sans aucune politique INSERT/SELECT/UPDATE
-- ============================================================

-- Prérequis : fonction auth_is_superadmin() (voir fix-comptes-rls.sql)
CREATE OR REPLACE FUNCTION public.auth_is_superadmin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comptes
    WHERE supabase_user_id = auth.uid() AND type = 'superadmin' AND is_active = true
  );
$$;

-- ============================================================
-- FONCTIONS HELPER SECURITY DEFINER
-- Évite la récursion et améliore les performances RLS
-- ============================================================

-- Retourne le compte_id du user connecté (gérant / partenaire / superadmin)
CREATE OR REPLACE FUNCTION public.auth_get_compte_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

-- Retourne les station_ids accessibles en écriture (gérant direct + sessions employés actifs)
-- Pas les stations partenaire (lecture seule)
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

  -- Session utilisateur actif (employé du gérant)
  SELECT s.id FROM public.stations s
  JOIN public.entreprises e ON s.entreprise_id = e.id
  JOIN public.comptes c ON c.id = e.compte_id
  JOIN public.sessions_utilisateurs su ON su.compte_parent_id = c.id
  WHERE su.supabase_user_id = auth.uid() AND su.status = 'active'
$$;

-- Retourne les entreprise_ids accessibles en écriture (gérant direct + sessions employés)
CREATE OR REPLACE FUNCTION public.auth_write_entreprise_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  -- Gérant direct
  SELECT e.id FROM public.entreprises e
  JOIN public.comptes c ON c.id = e.compte_id
  WHERE c.supabase_user_id = auth.uid()

  UNION

  -- Session utilisateur actif
  SELECT e.id FROM public.entreprises e
  JOIN public.comptes c ON c.id = e.compte_id
  JOIN public.sessions_utilisateurs su ON su.compte_parent_id = c.id
  WHERE su.supabase_user_id = auth.uid() AND su.status = 'active'
$$;

-- ============================================================
-- 1. TABLE : cuves  (station_id → stations → entreprise)
-- ============================================================
ALTER TABLE public.cuves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuves_gerant_all"            ON public.cuves;
DROP POLICY IF EXISTS "cuves_partenaire_select"     ON public.cuves;
DROP POLICY IF EXISTS "cuves_superadmin_all"        ON public.cuves;

CREATE POLICY "cuves_gerant_all" ON public.cuves
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "cuves_partenaire_select" ON public.cuves
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "cuves_superadmin_all" ON public.cuves
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 2. TABLE : pistolets  (station_id → stations → entreprise)
-- ============================================================
ALTER TABLE public.pistolets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pistolets_gerant_all"        ON public.pistolets;
DROP POLICY IF EXISTS "pistolets_partenaire_select" ON public.pistolets;
DROP POLICY IF EXISTS "pistolets_superadmin_all"    ON public.pistolets;

CREATE POLICY "pistolets_gerant_all" ON public.pistolets
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "pistolets_partenaire_select" ON public.pistolets
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "pistolets_superadmin_all" ON public.pistolets
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 3. TABLE : tiers  (entreprise_id)
-- ============================================================
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tiers_gerant_all"     ON public.tiers;
DROP POLICY IF EXISTS "tiers_superadmin_all" ON public.tiers;

CREATE POLICY "tiers_gerant_all" ON public.tiers
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "tiers_superadmin_all" ON public.tiers
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 4. TABLE : articles  (entreprise_id)
-- ============================================================
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_gerant_all"     ON public.articles;
DROP POLICY IF EXISTS "articles_superadmin_all" ON public.articles;

CREATE POLICY "articles_gerant_all" ON public.articles
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "articles_superadmin_all" ON public.articles
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 5. TABLE : tresoreries  (entreprise_id)
-- ============================================================
ALTER TABLE public.tresoreries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tresoreries_gerant_all"     ON public.tresoreries;
DROP POLICY IF EXISTS "tresoreries_superadmin_all" ON public.tresoreries;

CREATE POLICY "tresoreries_gerant_all" ON public.tresoreries
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "tresoreries_superadmin_all" ON public.tresoreries
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 6. TABLE : ecritures_comptables  (entreprise_id)
-- ============================================================
ALTER TABLE public.ecritures_comptables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecritures_gerant_all"     ON public.ecritures_comptables;
DROP POLICY IF EXISTS "ecritures_superadmin_all" ON public.ecritures_comptables;

CREATE POLICY "ecritures_gerant_all" ON public.ecritures_comptables
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "ecritures_superadmin_all" ON public.ecritures_comptables
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 7. TABLE : lignes_ecriture  (via ecriture_id → ecritures_comptables)
-- ============================================================
ALTER TABLE public.lignes_ecriture ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_ecriture_gerant_all"     ON public.lignes_ecriture;
DROP POLICY IF EXISTS "lignes_ecriture_superadmin_all" ON public.lignes_ecriture;

CREATE POLICY "lignes_ecriture_gerant_all" ON public.lignes_ecriture
  FOR ALL
  USING (
    ecriture_id IN (
      SELECT id FROM public.ecritures_comptables
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    ecriture_id IN (
      SELECT id FROM public.ecritures_comptables
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "lignes_ecriture_superadmin_all" ON public.lignes_ecriture
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 8. TABLE : mouvements_stock  (entreprise_id)
-- ============================================================
ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mouvements_stock_gerant_all"        ON public.mouvements_stock;
DROP POLICY IF EXISTS "mouvements_stock_partenaire_select" ON public.mouvements_stock;
DROP POLICY IF EXISTS "mouvements_stock_superadmin_all"    ON public.mouvements_stock;

CREATE POLICY "mouvements_stock_gerant_all" ON public.mouvements_stock
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "mouvements_stock_partenaire_select" ON public.mouvements_stock
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "mouvements_stock_superadmin_all" ON public.mouvements_stock
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 9. TABLE : stocks_boutique  (station_id)
-- ============================================================
ALTER TABLE public.stocks_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stocks_boutique_gerant_all"        ON public.stocks_boutique;
DROP POLICY IF EXISTS "stocks_boutique_partenaire_select" ON public.stocks_boutique;
DROP POLICY IF EXISTS "stocks_boutique_superadmin_all"    ON public.stocks_boutique;

CREATE POLICY "stocks_boutique_gerant_all" ON public.stocks_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "stocks_boutique_partenaire_select" ON public.stocks_boutique
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "stocks_boutique_superadmin_all" ON public.stocks_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 10. TABLE : shifts_carburant  (station_id)
-- ============================================================
ALTER TABLE public.shifts_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_carb_gerant_all"        ON public.shifts_carburant;
DROP POLICY IF EXISTS "shifts_carb_partenaire_select" ON public.shifts_carburant;
DROP POLICY IF EXISTS "shifts_carb_superadmin_all"    ON public.shifts_carburant;

CREATE POLICY "shifts_carb_gerant_all" ON public.shifts_carburant
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "shifts_carb_partenaire_select" ON public.shifts_carburant
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "shifts_carb_superadmin_all" ON public.shifts_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 11. TABLE : shifts_boutique  (station_id)
-- ============================================================
ALTER TABLE public.shifts_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_boutique_gerant_all"     ON public.shifts_boutique;
DROP POLICY IF EXISTS "shifts_boutique_superadmin_all" ON public.shifts_boutique;

CREATE POLICY "shifts_boutique_gerant_all" ON public.shifts_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "shifts_boutique_superadmin_all" ON public.shifts_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 12. TABLE : tickets_boutique  (station_id)
-- ============================================================
ALTER TABLE public.tickets_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_boutique_gerant_all"     ON public.tickets_boutique;
DROP POLICY IF EXISTS "tickets_boutique_superadmin_all" ON public.tickets_boutique;

CREATE POLICY "tickets_boutique_gerant_all" ON public.tickets_boutique
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "tickets_boutique_superadmin_all" ON public.tickets_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 13. TABLE : achats_carburant  (entreprise_id)
-- ============================================================
ALTER TABLE public.achats_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achats_carb_gerant_all"     ON public.achats_carburant;
DROP POLICY IF EXISTS "achats_carb_superadmin_all" ON public.achats_carburant;

CREATE POLICY "achats_carb_gerant_all" ON public.achats_carburant
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "achats_carb_superadmin_all" ON public.achats_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 14. TABLE : achats_boutique  (entreprise_id)
-- ============================================================
ALTER TABLE public.achats_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achats_boutique_gerant_all"     ON public.achats_boutique;
DROP POLICY IF EXISTS "achats_boutique_superadmin_all" ON public.achats_boutique;

CREATE POLICY "achats_boutique_gerant_all" ON public.achats_boutique
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "achats_boutique_superadmin_all" ON public.achats_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 15. TABLE : inventaires  (station_id)
-- ============================================================
ALTER TABLE public.inventaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventaires_gerant_all"        ON public.inventaires;
DROP POLICY IF EXISTS "inventaires_partenaire_select" ON public.inventaires;
DROP POLICY IF EXISTS "inventaires_superadmin_all"    ON public.inventaires;

CREATE POLICY "inventaires_gerant_all" ON public.inventaires
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "inventaires_partenaire_select" ON public.inventaires
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "inventaires_superadmin_all" ON public.inventaires
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 16. TABLE : creances  (entreprise_id)
-- ============================================================
ALTER TABLE public.creances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creances_gerant_all"     ON public.creances;
DROP POLICY IF EXISTS "creances_superadmin_all" ON public.creances;

CREATE POLICY "creances_gerant_all" ON public.creances
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "creances_superadmin_all" ON public.creances
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 17. TABLE : dettes  (entreprise_id)
-- ============================================================
ALTER TABLE public.dettes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dettes_gerant_all"     ON public.dettes;
DROP POLICY IF EXISTS "dettes_superadmin_all" ON public.dettes;

CREATE POLICY "dettes_gerant_all" ON public.dettes
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "dettes_superadmin_all" ON public.dettes
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- TABLES SUPPLÉMENTAIRES : RLS activé + policies manquantes
-- ============================================================

-- ── sessions_utilisateurs ──────────────────────────────────
-- Chaque session peut lire/modifier sa propre ligne (connexion employé)
-- Le gérant propriétaire peut gérer toutes ses sessions
ALTER TABLE public.sessions_utilisateurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_own_read"       ON public.sessions_utilisateurs;
DROP POLICY IF EXISTS "sessions_gerant_all"     ON public.sessions_utilisateurs;
DROP POLICY IF EXISTS "sessions_superadmin_all" ON public.sessions_utilisateurs;

-- Session utilisateur : lecture de sa propre ligne (pour savoir ses droits)
CREATE POLICY "sessions_own_read" ON public.sessions_utilisateurs
  FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Gérant propriétaire : gestion complète de ses sessions
CREATE POLICY "sessions_gerant_all" ON public.sessions_utilisateurs
  FOR ALL
  USING  (compte_parent_id = public.auth_get_compte_id())
  WITH CHECK (compte_parent_id = public.auth_get_compte_id());

CREATE POLICY "sessions_superadmin_all" ON public.sessions_utilisateurs
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── initialisation ────────────────────────────────────────
-- Accessible uniquement par le gérant (cf. Guide section 5)
ALTER TABLE public.initialisation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "initialisation_gerant_all"     ON public.initialisation;
DROP POLICY IF EXISTS "initialisation_superadmin_all" ON public.initialisation;

CREATE POLICY "initialisation_gerant_all" ON public.initialisation
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "initialisation_superadmin_all" ON public.initialisation
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_cuves ──────────────────────────────────
ALTER TABLE public.initialisation_cuves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "init_cuves_gerant_all"     ON public.initialisation_cuves;
DROP POLICY IF EXISTS "init_cuves_superadmin_all" ON public.initialisation_cuves;

CREATE POLICY "init_cuves_gerant_all" ON public.initialisation_cuves
  FOR ALL
  USING (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "init_cuves_superadmin_all" ON public.initialisation_cuves
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_stocks_boutique ────────────────────────
ALTER TABLE public.initialisation_stocks_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "init_stocks_gerant_all"     ON public.initialisation_stocks_boutique;
DROP POLICY IF EXISTS "init_stocks_superadmin_all" ON public.initialisation_stocks_boutique;

CREATE POLICY "init_stocks_gerant_all" ON public.initialisation_stocks_boutique
  FOR ALL
  USING (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "init_stocks_superadmin_all" ON public.initialisation_stocks_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_index_pistolets ────────────────────────
ALTER TABLE public.initialisation_index_pistolets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "init_pistolets_gerant_all"     ON public.initialisation_index_pistolets;
DROP POLICY IF EXISTS "init_pistolets_superadmin_all" ON public.initialisation_index_pistolets;

CREATE POLICY "init_pistolets_gerant_all" ON public.initialisation_index_pistolets
  FOR ALL
  USING (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "init_pistolets_superadmin_all" ON public.initialisation_index_pistolets
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── initialisation_comptes ────────────────────────────────
ALTER TABLE public.initialisation_comptes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "init_comptes_gerant_all"     ON public.initialisation_comptes;
DROP POLICY IF EXISTS "init_comptes_superadmin_all" ON public.initialisation_comptes;

CREATE POLICY "init_comptes_gerant_all" ON public.initialisation_comptes
  FOR ALL
  USING (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    initialisation_id IN (
      SELECT id FROM public.initialisation
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "init_comptes_superadmin_all" ON public.initialisation_comptes
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── plan_comptable_entreprise ─────────────────────────────
ALTER TABLE public.plan_comptable_entreprise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_cpta_ent_gerant_all"     ON public.plan_comptable_entreprise;
DROP POLICY IF EXISTS "plan_cpta_ent_superadmin_all" ON public.plan_comptable_entreprise;

CREATE POLICY "plan_cpta_ent_gerant_all" ON public.plan_comptable_entreprise
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "plan_cpta_ent_superadmin_all" ON public.plan_comptable_entreprise
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── plan_comptable_standard ───────────────────────────────
-- Lecture publique (référentiel commun partagé)
ALTER TABLE public.plan_comptable_standard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_standard_public_read" ON public.plan_comptable_standard;
DROP POLICY IF EXISTS "plan_standard_superadmin"  ON public.plan_comptable_standard;

CREATE POLICY "plan_standard_public_read" ON public.plan_comptable_standard
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "plan_standard_superadmin" ON public.plan_comptable_standard
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── categories_articles ───────────────────────────────────
ALTER TABLE public.categories_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_articles_gerant_all"     ON public.categories_articles;
DROP POLICY IF EXISTS "cat_articles_superadmin_all" ON public.categories_articles;

CREATE POLICY "cat_articles_gerant_all" ON public.categories_articles
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "cat_articles_superadmin_all" ON public.categories_articles
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── prix_vente_articles ───────────────────────────────────
ALTER TABLE public.prix_vente_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prix_vente_gerant_all"     ON public.prix_vente_articles;
DROP POLICY IF EXISTS "prix_vente_superadmin_all" ON public.prix_vente_articles;

CREATE POLICY "prix_vente_gerant_all" ON public.prix_vente_articles
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "prix_vente_superadmin_all" ON public.prix_vente_articles
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── prix_carburant ────────────────────────────────────────
ALTER TABLE public.prix_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prix_carb_gerant_all"        ON public.prix_carburant;
DROP POLICY IF EXISTS "prix_carb_partenaire_select" ON public.prix_carburant;
DROP POLICY IF EXISTS "prix_carb_superadmin_all"    ON public.prix_carburant;

CREATE POLICY "prix_carb_gerant_all" ON public.prix_carburant
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "prix_carb_partenaire_select" ON public.prix_carburant
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "prix_carb_superadmin_all" ON public.prix_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── objectifs ─────────────────────────────────────────────
ALTER TABLE public.objectifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objectifs_gerant_all"        ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_partenaire_select" ON public.objectifs;
DROP POLICY IF EXISTS "objectifs_superadmin_all"    ON public.objectifs;

CREATE POLICY "objectifs_gerant_all" ON public.objectifs
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "objectifs_partenaire_select" ON public.objectifs
  FOR SELECT
  USING (station_id IN (
    SELECT id FROM public.stations
    WHERE partenaire_id IN (
      SELECT id FROM public.partenaires WHERE compte_id = public.auth_get_compte_id()
    )
  ));

CREATE POLICY "objectifs_superadmin_all" ON public.objectifs
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── seuils_alerte_stock ───────────────────────────────────
ALTER TABLE public.seuils_alerte_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seuils_gerant_all"     ON public.seuils_alerte_stock;
DROP POLICY IF EXISTS "seuils_superadmin_all" ON public.seuils_alerte_stock;

CREATE POLICY "seuils_gerant_all" ON public.seuils_alerte_stock
  FOR ALL
  USING  (station_id IN (SELECT public.auth_write_station_ids()))
  WITH CHECK (station_id IN (SELECT public.auth_write_station_ids()));

CREATE POLICY "seuils_superadmin_all" ON public.seuils_alerte_stock
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── camions ───────────────────────────────────────────────
ALTER TABLE public.camions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camions_gerant_all"     ON public.camions;
DROP POLICY IF EXISTS "camions_superadmin_all" ON public.camions;

CREATE POLICY "camions_gerant_all" ON public.camions
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "camions_superadmin_all" ON public.camions
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── compartiments_camion ──────────────────────────────────
ALTER TABLE public.compartiments_camion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compartiments_gerant_all"     ON public.compartiments_camion;
DROP POLICY IF EXISTS "compartiments_superadmin_all" ON public.compartiments_camion;

CREATE POLICY "compartiments_gerant_all" ON public.compartiments_camion
  FOR ALL
  USING (
    camion_id IN (
      SELECT id FROM public.camions
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    camion_id IN (
      SELECT id FROM public.camions
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "compartiments_superadmin_all" ON public.compartiments_camion
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_tiers ───────────────────────────────────────
-- Ces compteurs sont modifiés par les fonctions SQL generer_numero_tiers()
-- La fonction n'est pas SECURITY DEFINER → accès RLS nécessaire
ALTER TABLE public.compteurs_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compteurs_tiers_gerant_all"     ON public.compteurs_tiers;
DROP POLICY IF EXISTS "compteurs_tiers_superadmin_all" ON public.compteurs_tiers;

CREATE POLICY "compteurs_tiers_gerant_all" ON public.compteurs_tiers
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "compteurs_tiers_superadmin_all" ON public.compteurs_tiers
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_tresorerie ──────────────────────────────────
ALTER TABLE public.compteurs_tresorerie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compteurs_tres_gerant_all"     ON public.compteurs_tresorerie;
DROP POLICY IF EXISTS "compteurs_tres_superadmin_all" ON public.compteurs_tresorerie;

CREATE POLICY "compteurs_tres_gerant_all" ON public.compteurs_tresorerie
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "compteurs_tres_superadmin_all" ON public.compteurs_tresorerie
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── compteurs_comptes ─────────────────────────────────────
ALTER TABLE public.compteurs_comptes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compteurs_cptes_gerant_all"     ON public.compteurs_comptes;
DROP POLICY IF EXISTS "compteurs_cptes_superadmin_all" ON public.compteurs_comptes;

CREATE POLICY "compteurs_cptes_gerant_all" ON public.compteurs_comptes
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "compteurs_cptes_superadmin_all" ON public.compteurs_comptes
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── operations_hors_av ────────────────────────────────────
ALTER TABLE public.operations_hors_av ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_hors_av_gerant_all"     ON public.operations_hors_av;
DROP POLICY IF EXISTS "ops_hors_av_superadmin_all" ON public.operations_hors_av;

CREATE POLICY "ops_hors_av_gerant_all" ON public.operations_hors_av
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "ops_hors_av_superadmin_all" ON public.operations_hors_av
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── transferts_stock ──────────────────────────────────────
ALTER TABLE public.transferts_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transferts_gerant_all"     ON public.transferts_stock;
DROP POLICY IF EXISTS "transferts_superadmin_all" ON public.transferts_stock;

CREATE POLICY "transferts_gerant_all" ON public.transferts_stock
  FOR ALL
  USING  (entreprise_id IN (SELECT public.auth_write_entreprise_ids()))
  WITH CHECK (entreprise_id IN (SELECT public.auth_write_entreprise_ids()));

CREATE POLICY "transferts_superadmin_all" ON public.transferts_stock
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── abonnements : INSERT pour gérant ─────────────────────
-- La policy SELECT existe déjà (fix-rls-partenaires-admin.sql)
-- On ajoute INSERT/UPDATE pour le superadmin si pas déjà couvert
-- → déjà couvert par "abonnements_superadmin_all" FOR ALL

-- ── audit_log : INSERT pour triggers ─────────────────────
-- Les triggers (fn_audit_log) s'exécutent en tant que postgres (BYPASSRLS)
-- → aucune policy INSERT nécessaire pour les utilisateurs directs
-- La policy SELECT superadmin existe déjà dans reborn.sql

-- ============================================================
-- VÉRIFICATION RAPIDE
-- Après exécution, tester avec :
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
-- ============================================================
