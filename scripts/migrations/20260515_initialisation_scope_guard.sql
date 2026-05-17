-- Garde-fous architecture station vs entreprise (initialisation A Nouveau)

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
  v_count INTEGER := 0;
  v_station_key TEXT;
  v_capital_libelle TEXT := 'Capital social';
  v_enterprise_modules TEXT[] := ARRAY[
    'tresorerie', 'creances', 'dettes', 'immobilisations', 'autres_dettes'
  ];
  v_station_modules TEXT[] := ARRAY['cuves', 'stock_boutique'];
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

    v_ref := 'INIT:' || p_initialisation_id::text || ':' || p_module || ':'
      || v_station_key || ':' || v_numero_compte;

    INSERT INTO public.ecritures_comptables (
      entreprise_id, numero_piece, libelle, date_ecriture, statut,
      type_operation, reference_numero, station_id, is_central,
      module_initialisation, created_by
    ) VALUES (
      p_entreprise_id,
      v_ref,
      'A Nouveau - Initialisation - ' || p_module,
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

    IF v_sens = 'credit' THEN
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES
        (v_ecriture_id, v_numero_compte, v_libelle_compte,
         NULLIF(v_ligne->>'tiers_id', '')::uuid,
         NULLIF(v_ligne->>'tresorerie_id', '')::uuid,
         0, v_montant),
        (v_ecriture_id, '101', v_capital_libelle,
         NULL, NULL, v_montant, 0);
    ELSE
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES
        (v_ecriture_id, v_numero_compte, v_libelle_compte,
         NULLIF(v_ligne->>'tiers_id', '')::uuid,
         NULLIF(v_ligne->>'tresorerie_id', '')::uuid,
         v_montant, 0),
        (v_ecriture_id, '101', v_capital_libelle,
         NULL, NULL, 0, v_montant);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
