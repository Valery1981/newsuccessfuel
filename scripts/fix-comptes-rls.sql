-- ============================================================
-- CORRECTIF : Politiques RLS manquantes sur la table `comptes`
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================
-- Symptôme : PGRST116 "Cannot coerce the result to a single JSON object"
-- Cause    : RLS activé sur `comptes` sans aucune politique SELECT
--            → toutes les lectures retournent 0 lignes
-- ============================================================

-- Étape 1 : Fonction SECURITY DEFINER pour éviter la récursion infinie
-- (nécessaire pour les policies qui vérifient si l'utilisateur est superadmin)
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

-- Étape 2 : S'assurer que RLS est bien activé
ALTER TABLE comptes ENABLE ROW LEVEL SECURITY;

-- Étape 3 : Supprimer les éventuelles politiques existantes (idempotent)
DROP POLICY IF EXISTS "users_select_own_compte"    ON comptes;
DROP POLICY IF EXISTS "users_insert_own_compte"    ON comptes;
DROP POLICY IF EXISTS "users_update_own_compte"    ON comptes;
DROP POLICY IF EXISTS "superadmin_all_comptes"     ON comptes;

-- Étape 4 : SELECT — chaque user lit son propre compte
CREATE POLICY "users_select_own_compte" ON comptes
  FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Étape 5 : INSERT — gérant peut créer son compte lors du signup
-- (supabase_user_id doit correspondre à l'utilisateur connecté)
CREATE POLICY "users_insert_own_compte" ON comptes
  FOR INSERT
  WITH CHECK (supabase_user_id = auth.uid());

-- Étape 6 : UPDATE — chaque user peut modifier son propre compte
-- (le type ne peut pas être changé par l'utilisateur lui-même)
CREATE POLICY "users_update_own_compte" ON comptes
  FOR UPDATE
  USING (supabase_user_id = auth.uid())
  WITH CHECK (supabase_user_id = auth.uid());

-- Étape 7 : Superadmin — accès complet à tous les comptes
-- Utilise la fonction SECURITY DEFINER pour éviter la récursion RLS
CREATE POLICY "superadmin_all_comptes" ON comptes
  FOR ALL
  USING (public.auth_is_superadmin());

-- ============================================================
-- Vérification : après exécution, cette requête doit retourner
-- votre compte superadmin (connectez-vous et testez dans SQL Editor)
-- ============================================================
-- SELECT * FROM comptes WHERE supabase_user_id = auth.uid();
