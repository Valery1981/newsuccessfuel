-- Audit à lancer après chaque clic « Enregistrer » (initialisation)
-- Remplacer l'UUID initialisation si besoin (d814a47e-… ci-dessous).

-- Résumé structure (ok = true attendu)
SELECT * FROM public.audit_initialisation_ouverture_structure(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid
);

-- Ligne 101 unique
SELECT * FROM public.audit_init_lignes_101(
  'd814a47e-87a3-4832-8a75-04beeac95a61'::uuid
);

-- Détail 101 + équilibre
SELECT
  (SELECT COUNT(*) FROM public.ecritures_comptables
   WHERE type_operation = 'initialisation_a_nouveau'
     AND reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%') AS nb_ecritures_init,
  (SELECT COUNT(*) FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.type_operation = 'initialisation_a_nouveau'
     AND ec.reference_numero LIKE 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:%'
     AND split_part(le.numero_compte, '-', 1) = '101') AS nb_lignes_101,
  (SELECT ROUND(SUM(le.debit), 2) FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.reference_numero = 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:ouverture:global') AS total_debit,
  (SELECT ROUND(SUM(le.credit), 2) FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.reference_numero = 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:ouverture:global') AS total_credit,
  (SELECT le.debit FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.reference_numero = 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:ouverture:global'
     AND split_part(le.numero_compte, '-', 1) = '101') AS debit_101,
  (SELECT le.credit FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.reference_numero = 'INIT:d814a47e-87a3-4832-8a75-04beeac95a61:ouverture:global'
     AND split_part(le.numero_compte, '-', 1) = '101') AS credit_101;
