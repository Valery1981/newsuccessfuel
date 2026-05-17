-- Ouverture initialisation : une écriture équilibrée par module, une seule ligne 101.
-- Validation créances : 411 / 460 uniquement (jamais 421).
-- Référence stable : INIT:{initialisation_id}:{module}:{station_id|central}

CREATE OR REPLACE FUNCTION public.delete_initialisation_module_ecritures(
  p_initialisation_id UUID,
  p_module VARCHAR,
  p_station_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station_key TEXT;
  v_prefix TEXT;
BEGIN
  v_station_key := COALESCE(p_station_id::text, 'central');
  v_prefix := 'INIT:' || p_initialisation_id::text || ':' || p_module || ':' || v_station_key;

  DELETE FROM public.ecritures_comptables
  WHERE type_operation = 'initialisation_a_nouveau'
    AND module_initialisation = p_module
    AND (
      reference_numero = v_prefix
      OR reference_numero LIKE v_prefix || ':%'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_initialisation_a_nouveau(
  p_initialisation_id UUID,
  p_entreprise_id UUID,
  p_module VARCHAR,
  p_station_id UUID,
  p_date_ouverture DATE,
  p_created_by UUID,
  p_lignes JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init RECORD;
  v_ligne JSONB;
  v_montant NUMERIC;
  v_sens TEXT;
  v_numero_compte TEXT;
  v_libelle_compte TEXT;
  v_ref TEXT;
  v_ecriture_id UUID;
  v_station_key TEXT;
  v_capital_libelle TEXT := 'Capital Net Initial';
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_diff NUMERIC;
  v_ligne_count INTEGER := 0;
  v_enterprise_modules TEXT[] := ARRAY[
    'tresorerie', 'creances', 'dettes', 'immobilisations', 'autres_dettes'
  ];
  v_station_modules TEXT[] := ARRAY['cuves', 'stock_boutique'];
  v_compte_root TEXT;
BEGIN
  SELECT * INTO v_init
  FROM public.initialisation
  WHERE id = p_initialisation_id AND entreprise_id = p_entreprise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Initialisation introuvable';
  END IF;

  IF v_init.est_validee THEN
    RAISE EXCEPTION 'Initialisation verrouillée — modification impossible';
  END IF;

  IF p_module = ANY (v_enterprise_modules) AND p_station_id IS NOT NULL THEN
    RAISE EXCEPTION 'Module entreprise % : station_id doit être NULL', p_module;
  END IF;

  IF p_module = ANY (v_station_modules) AND p_station_id IS NULL THEN
    RAISE EXCEPTION 'Module station % : station_id obligatoire', p_module;
  END IF;

  v_station_key := COALESCE(p_station_id::text, 'central');

  PERFORM public.delete_initialisation_module_ecritures(
    p_initialisation_id, p_module, p_station_id
  );

  IF p_lignes IS NULL OR jsonb_array_length(p_lignes) = 0 THEN
    RETURN 0;
  END IF;

  -- Validation métier créances (460 employés, jamais 421)
  IF p_module = 'creances' THEN
    FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
    LOOP
      v_numero_compte := v_ligne->>'numero_compte';
      v_compte_root := split_part(COALESCE(v_numero_compte, ''), '-', 1);
      IF v_compte_root = '421' OR COALESCE(v_numero_compte, '') LIKE '421%' THEN
        RAISE EXCEPTION
          'Créances initiales : le compte % est interdit (utiliser 460 pour les employés)',
          v_numero_compte;
      END IF;
      IF v_compte_root NOT IN ('411', '460')
         AND COALESCE(v_numero_compte, '') NOT LIKE '411%'
         AND COALESCE(v_numero_compte, '') NOT LIKE '460%' THEN
        RAISE EXCEPTION
          'Créances initiales : compte % non autorisé (411 clients, 460 employés)',
          v_numero_compte;
      END IF;
    END LOOP;
  END IF;

  v_ref := 'INIT:' || p_initialisation_id::text || ':' || p_module || ':' || v_station_key;

  INSERT INTO public.ecritures_comptables (
    entreprise_id, numero_piece, libelle, date_ecriture, statut,
    type_operation, reference_numero, station_id, is_central,
    module_initialisation, created_by
  ) VALUES (
    p_entreprise_id,
    v_ref,
    'À nouveau — ' || p_module,
    COALESCE(p_date_ouverture, v_init.date_ouverture, CURRENT_DATE),
    'validee',
    'initialisation_a_nouveau',
    v_ref,
    p_station_id,
    (p_station_id IS NULL),
    p_module,
    p_created_by
  )
  RETURNING id INTO v_ecriture_id;

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
  LOOP
    v_montant := ROUND(COALESCE((v_ligne->>'montant')::numeric, 0), 2);
    IF v_montant <= 0 THEN
      CONTINUE;
    END IF;

    v_sens := COALESCE(v_ligne->>'sens', 'debit');
    v_numero_compte := v_ligne->>'numero_compte';
    v_libelle_compte := COALESCE(v_ligne->>'libelle_compte', v_numero_compte);

    IF v_numero_compte IS NULL OR v_numero_compte = '' THEN
      CONTINUE;
    END IF;

    IF v_sens = 'credit' THEN
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES (
        v_ecriture_id, v_numero_compte, v_libelle_compte,
        NULLIF(v_ligne->>'tiers_id', '')::uuid,
        NULLIF(v_ligne->>'tresorerie_id', '')::uuid,
        0, v_montant
      );
      v_total_credit := v_total_credit + v_montant;
    ELSE
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES (
        v_ecriture_id, v_numero_compte, v_libelle_compte,
        NULLIF(v_ligne->>'tiers_id', '')::uuid,
        NULLIF(v_ligne->>'tresorerie_id', '')::uuid,
        v_montant, 0
      );
      v_total_debit := v_total_debit + v_montant;
    END IF;

    v_ligne_count := v_ligne_count + 1;
  END LOOP;

  IF v_ligne_count = 0 THEN
    DELETE FROM public.ecritures_comptables WHERE id = v_ecriture_id;
    RETURN 0;
  END IF;

  -- Une seule ligne 101 = Total Actif − Total Passif (équilibre de l'écriture)
  v_diff := ROUND(v_total_debit - v_total_credit, 2);
  IF v_diff > 0 THEN
    INSERT INTO public.lignes_ecriture (
      ecriture_id, numero_compte, libelle_compte, debit, credit
    ) VALUES (
      v_ecriture_id, '101', v_capital_libelle, 0, v_diff
    );
  ELSIF v_diff < 0 THEN
    INSERT INTO public.lignes_ecriture (
      ecriture_id, numero_compte, libelle_compte, debit, credit
    ) VALUES (
      v_ecriture_id, '101', v_capital_libelle, ABS(v_diff), 0
    );
  END IF;

  RETURN v_ligne_count;
END;
$$;

-- Nettoyage optionnel des anciennes écritures INIT (1 ligne = 1 pièce + 101 jumelé).
-- Exécuter une fois puis ré-enregistrer chaque onglet d'initialisation.
CREATE OR REPLACE FUNCTION public.purge_initialisation_a_nouveau_legacy(
  p_initialisation_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.ecritures_comptables
    WHERE type_operation = 'initialisation_a_nouveau'
      AND reference_numero LIKE 'INIT:' || p_initialisation_id::text || ':%'
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.sync_initialisation_a_nouveau IS
  'Une écriture A Nouveau par module : toutes les lignes bilan + une seule ligne 101 Capital Net Initial.';

COMMENT ON FUNCTION public.purge_initialisation_a_nouveau_legacy IS
  'Supprime toutes les écritures INIT d''une initialisation (format ancien ou nouveau). Ré-enregistrer chaque onglet ensuite.';
