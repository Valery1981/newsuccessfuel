-- (Obsolète — utiliser scripts/repair-ouverture-EXECUTE-NOW.sql)
-- Réparation données : une seule ligne 101 INIT par initialisation
-- 1) Exécuter : scripts/migrations/20260519_fix_single_101_audit.sql
-- 2) Exécuter : scripts/migrations/20260520_audit_ouverture_structure.sql
-- 3) Exécuter : scripts/repair-ouverture-EXECUTE-NOW.sql
--
-- Initialisation cible (modifier si besoin) :
--   d814a47e-87a3-4832-8a75-04beeac95a61
--   entreprise 678a1b7f-e77a-4153-a423-97d23437db10

-- Rebuild global (supprime toutes les INIT legacy puis recrée 1 pièce)
SELECT public.rebuild_initialisation_ouverture_globale(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid,
  '678a1b7f-e77a-4153-a423-97d23437db10'::uuid,
  '2026-05-16'::date,
  NULL
) AS lignes_bilan;

-- Test obligatoire : doit retourner nb_lignes_101 = 1, ok = true
SELECT * FROM public.audit_init_lignes_101(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid
);

-- Détail des lignes 101 INIT (attendu : 1 ligne)
SELECT
  le.id,
  le.numero_compte,
  le.libelle_compte,
  le.debit,
  le.credit,
  ec.libelle AS ecriture_libelle,
  ec.reference_numero
FROM public.lignes_ecriture le
JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
WHERE ec.type_operation = 'initialisation_a_nouveau'
  AND ec.reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%'
  AND split_part(le.numero_compte, '-', 1) = '101';
