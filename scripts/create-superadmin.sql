-- ============================================================
-- Création du compte Superadmin SuccessFuel
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================
-- ⚠️  Ce script nécessite que l'utilisateur Auth soit créé
--     au préalable via Authentication → Users → Add User
--     (ou via le script Node.js create-superadmin.mjs)
-- ============================================================

-- Étape 1 : Créez l'utilisateur dans Authentication → Users → Add User
--   Email    : admin@successfuel.mg
--   Password : SuccessFuel@2026!
--   Cocher "Auto Confirm User"
-- Notez l'UUID généré, remplacez-le ci-dessous.

-- Étape 2 : Exécutez ce SQL en remplaçant <UUID_DE_LAUTH_USER>

DO $$
DECLARE
  v_auth_user_id UUID := '<UUID_DE_LAUTH_USER>'; -- ← remplacer ici
  v_email        TEXT := 'admin@successfuel.mg';
  v_nom          TEXT := 'SuccessFuel Admin';
  v_compte_id    UUID;
BEGIN
  -- Vérification unicité
  IF EXISTS (SELECT 1 FROM comptes WHERE email = v_email) THEN
    RAISE NOTICE 'Un compte existe déjà pour %', v_email;
    RETURN;
  END IF;

  -- Insertion dans comptes
  INSERT INTO comptes (
    supabase_user_id,
    type,
    nom,
    email,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_auth_user_id,
    'superadmin',
    v_nom,
    v_email,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_compte_id;

  RAISE NOTICE '✅ Superadmin créé — compte id: %', v_compte_id;
END;
$$;
