-- ═══════════════════════════════════════════════════════════════════════════
-- RÉPARATION DONNÉES — UNE SEULE PIÈCE D'OUVERTURE + UNE SEULE LIGNE 101
-- Exécuter ce fichier ENTIER dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Prérequis : migrations 20260518 + 20260519 déjà appliquées.
-- Si pas encore fait, exécuter d'abord :
--   scripts/migrations/20260519_fix_single_101_audit.sql
--   scripts/migrations/20260520_audit_ouverture_structure.sql
--
-- Initialisation : d814a47e-87a3-4832-8a75-04beeac95a61
-- Entreprise     : 678a1b7f-e77a-4153-a423-97d23437db10

-- ── AVANT : état actuel (doit montrer 16 pièces si legacy) ──
SELECT
  ec.reference_numero,
  ec.libelle,
  COUNT(le.id) AS nb_lignes,
  COUNT(*) FILTER (WHERE split_part(le.numero_compte, '-', 1) = '101') AS nb_101
FROM public.ecritures_comptables ec
LEFT JOIN public.lignes_ecriture le ON le.ecriture_id = ec.id
WHERE ec.type_operation = 'initialisation_a_nouveau'
  AND ec.reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%'
GROUP BY ec.id, ec.reference_numero, ec.libelle
ORDER BY ec.reference_numero;

-- ── REBUILD : supprime TOUTES les INIT legacy + recrée 1 pièce globale ──
SELECT public.rebuild_initialisation_ouverture_globale(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid,
  '678a1b7f-e77a-4153-a423-97d23437db10'::uuid,
  (SELECT date_ouverture FROM public.initialisation WHERE id = 'd814a47e-87a3-4832-8a75-04beeac95a61'),
  NULL
) AS lignes_bilan_staging;

-- ── APRÈS : contrôles obligatoires (ok doit être true) ──
SELECT * FROM public.audit_init_lignes_101(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid
);

SELECT * FROM public.audit_initialisation_ouverture_structure(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid
);

-- Une seule pièce
SELECT id, reference_numero, libelle, module_initialisation
FROM public.ecritures_comptables
WHERE type_operation = 'initialisation_a_nouveau'
  AND reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%';

-- Toutes les lignes (101 en dernier dans l'ordre comptable)
SELECT
  le.numero_compte,
  le.libelle_compte,
  le.debit,
  le.credit,
  ec.reference_numero
FROM public.lignes_ecriture le
JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
WHERE ec.reference_numero = 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:ouverture:global'
ORDER BY
  split_part(le.numero_compte, '-', 1)::int,
  le.numero_compte;

-- Ligne 101 unique
SELECT COUNT(*) AS nb_lignes_101
FROM public.lignes_ecriture le
JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
WHERE ec.type_operation = 'initialisation_a_nouveau'
  AND ec.reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%'
  AND split_part(le.numero_compte, '-', 1) = '101';
