-- ============================================================
-- RLS : partenaires, abonnements, stations (superadmin), doléances
-- Symptôme : "new row violates row-level security policy for table partenaires"
--            ou échecs CRUD admin (abonnements, stations, doléances globales)
-- À exécuter dans : Supabase → SQL Editor (idempotent)
-- Prérequis : fonction public.auth_is_superadmin() (voir fix-comptes-rls.sql)
-- ============================================================

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

-- ── partenaires ─────────────────────────────────────────────
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partenaires_superadmin_all" ON public.partenaires;
DROP POLICY IF EXISTS "partenaires_gerant_select" ON public.partenaires;
DROP POLICY IF EXISTS "partenaire_select_own_partenaire" ON public.partenaires;

CREATE POLICY "partenaires_superadmin_all" ON public.partenaires
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- Onboarding / liste des partenaires (gérant connecté)
CREATE POLICY "partenaires_gerant_select" ON public.partenaires
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comptes c
      WHERE c.supabase_user_id = auth.uid() AND c.type = 'gerant' AND c.is_active = true
    )
  );

-- Compte partenaire : sa propre ligne (ex. jointure stations)
CREATE POLICY "partenaire_select_own_partenaire" ON public.partenaires
  FOR SELECT
  USING (
    compte_id IS NOT NULL
    AND compte_id = (SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
  );

-- ── abonnements ──────────────────────────────────────────────
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abonnements_superadmin_all" ON public.abonnements;
DROP POLICY IF EXISTS "abonnements_gerant_select" ON public.abonnements;
DROP POLICY IF EXISTS "abonnements_partenaire_select" ON public.abonnements;

CREATE POLICY "abonnements_superadmin_all" ON public.abonnements
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

CREATE POLICY "abonnements_gerant_select" ON public.abonnements
  FOR SELECT
  USING (
    entreprise_id IN (
      SELECT id FROM public.entreprises
      WHERE compte_id = (SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "abonnements_partenaire_select" ON public.abonnements
  FOR SELECT
  USING (
    partenaire_id IN (
      SELECT id FROM public.partenaires
      WHERE compte_id = (SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

-- ── stations : accès superadmin (page Admin Stations) ───────
DROP POLICY IF EXISTS "stations_superadmin_all" ON public.stations;

CREATE POLICY "stations_superadmin_all" ON public.stations
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ── doléances : politiques métier (RLS activé sans policy = tout bloqué)
DROP POLICY IF EXISTS "doleances_superadmin_all" ON public.doleances;
DROP POLICY IF EXISTS "doleances_gerant_all" ON public.doleances;
DROP POLICY IF EXISTS "doleances_partenaire_all" ON public.doleances;

CREATE POLICY "doleances_superadmin_all" ON public.doleances
  FOR ALL
  USING (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

CREATE POLICY "doleances_gerant_all" ON public.doleances
  FOR ALL
  USING (
    station_id IN (
      SELECT s.id FROM public.stations s
      INNER JOIN public.entreprises e ON e.id = s.entreprise_id
      WHERE e.compte_id = (SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "doleances_partenaire_all" ON public.doleances
  FOR ALL
  USING (
    partenaire_id IN (
      SELECT id FROM public.partenaires
      WHERE compte_id = (SELECT id FROM public.comptes WHERE supabase_user_id = auth.uid() LIMIT 1)
    )
  );
