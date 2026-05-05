-- Mot de passe provisoire / première connexion (partenaires invités par superadmin)
-- Idempotent

ALTER TABLE public.comptes
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.comptes.must_change_password IS
  'Vrai tant que l’utilisateur n’a pas défini son mot de passe après invitation (ex. partenaire).';
