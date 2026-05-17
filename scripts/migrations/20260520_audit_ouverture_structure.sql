-- Audit structure pièce d'ouverture + correction 421 mal classés en débit.

CREATE OR REPLACE FUNCTION public.audit_initialisation_ouverture_structure(
  p_initialisation_id UUID
)
RETURNS TABLE (
  nb_ecritures_init BIGINT,
  nb_ecriture_globale BIGINT,
  nb_lignes_total BIGINT,
  nb_lignes_101 BIGINT,
  nb_ecritures_contenant_101 BIGINT,
  ecriture_globale_id UUID,
  total_debit NUMERIC,
  total_credit NUMERIC,
  equilibre BOOLEAN,
  ok BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ecritures AS (
    SELECT ec.id, ec.reference_numero
    FROM public.ecritures_comptables ec
    WHERE ec.type_operation = 'initialisation_a_nouveau'
      AND ec.reference_numero LIKE 'INIT:' || p_initialisation_id::text || ':%'
  ),
  global_ec AS (
    SELECT id
    FROM ecritures
    WHERE reference_numero = 'INIT:' || p_initialisation_id::text || ':ouverture:global'
    LIMIT 1
  ),
  lignes AS (
    SELECT le.*
    FROM public.lignes_ecriture le
    JOIN ecritures e ON e.id = le.ecriture_id
  ),
  agg AS (
    SELECT
      (SELECT COUNT(*) FROM ecritures)::bigint AS nb_ecritures_init,
      (SELECT COUNT(*) FROM global_ec)::bigint AS nb_ecriture_globale,
      (SELECT COUNT(*) FROM lignes)::bigint AS nb_lignes_total,
      (SELECT COUNT(*) FROM lignes WHERE split_part(numero_compte, '-', 1) = '101')::bigint AS nb_lignes_101,
      (SELECT COUNT(DISTINCT ecriture_id) FROM lignes WHERE split_part(numero_compte, '-', 1) = '101')::bigint AS nb_ecritures_contenant_101,
      (SELECT id FROM global_ec) AS ecriture_globale_id,
      COALESCE((SELECT ROUND(SUM(debit), 2) FROM lignes), 0) AS total_debit,
      COALESCE((SELECT ROUND(SUM(credit), 2) FROM lignes), 0) AS total_credit
  )
  SELECT
    nb_ecritures_init,
    nb_ecriture_globale,
    nb_lignes_total,
    nb_lignes_101,
    nb_ecritures_contenant_101,
    ecriture_globale_id,
    total_debit,
    total_credit,
    (total_debit = total_credit) AS equilibre,
    (
      nb_ecritures_init = 1
      AND nb_ecriture_globale = 1
      AND nb_lignes_101 = 1
      AND nb_ecritures_contenant_101 = 1
      AND total_debit = total_credit
      AND ecriture_globale_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM lignes l
        CROSS JOIN global_ec g
        WHERE l.ecriture_id IS DISTINCT FROM g.id
      )
    ) AS ok
  FROM agg;
$$;

COMMENT ON FUNCTION public.audit_initialisation_ouverture_structure IS
  'ok=true : 1 pièce ouverture:global, toutes lignes même ecriture_id, 1 seule 101, partie double équilibrée.';
