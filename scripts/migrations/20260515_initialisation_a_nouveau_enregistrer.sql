-- Initialisation : A Nouveau à chaque Enregistrer (pas à la validation)
-- Référence stable : INIT:{initialisation_id}:{module}:{station_id|central}:{numero_compte}

ALTER TABLE public.initialisation
  ADD COLUMN IF NOT EXISTS date_ouverture DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.ecritures_comptables
  ADD COLUMN IF NOT EXISTS module_initialisation VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_ecritures_init_module
  ON public.ecritures_comptables (entreprise_id, type_operation, module_initialisation, station_id)
  WHERE type_operation = 'initialisation_a_nouveau';

-- Supprime toutes les écritures A Nouveau d'un module (remplacement idempotent)
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
  v_prefix TEXT;
BEGIN
  IF p_station_id IS NULL THEN
    v_prefix := 'INIT:' || p_initialisation_id::text || ':' || p_module || ':central:';
  ELSE
    v_prefix := 'INIT:' || p_initialisation_id::text || ':' || p_module || ':' || p_station_id::text || ':';
  END IF;

  DELETE FROM public.ecritures_comptables
  WHERE type_operation = 'initialisation_a_nouveau'
    AND module_initialisation = p_module
    AND reference_numero LIKE v_prefix || '%';
END;
$$;

-- Crée une écriture A Nouveau équilibrée (compte ↔ 101) par ligne de montant > 0
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

-- Bilan d'ouverture (staging + écritures validées)
CREATE OR REPLACE FUNCTION public.get_initialisation_bilan_ouverture(p_initialisation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fuel NUMERIC := 0;
  v_boutique NUMERIC := 0;
  v_treasury NUMERIC := 0;
  v_receivable NUMERIC := 0;
  v_payable NUMERIC := 0;
  v_assets NUMERIC := 0;
  v_capital_net NUMERIC;
BEGIN
  SELECT COALESCE(SUM(valeur_stock), 0) INTO v_fuel
  FROM public.initialisation_cuves WHERE initialisation_id = p_initialisation_id;

  SELECT COALESCE(SUM(valeur_stock), 0) INTO v_boutique
  FROM public.initialisation_stocks_boutique WHERE initialisation_id = p_initialisation_id;

  SELECT COALESCE(SUM(solde_debit - solde_credit), 0) INTO v_treasury
  FROM public.initialisation_comptes
  WHERE initialisation_id = p_initialisation_id AND onglet = 'tresorerie';

  SELECT COALESCE(SUM(solde_debit - solde_credit), 0) INTO v_receivable
  FROM public.initialisation_comptes ic
  WHERE initialisation_id = p_initialisation_id
    AND onglet = 'tiers'
    AND LEFT(numero_compte, 3) IN ('411', '460')
    AND solde_debit > solde_credit;

  SELECT COALESCE(SUM(solde_credit - solde_debit), 0) INTO v_payable
  FROM public.initialisation_comptes
  WHERE initialisation_id = p_initialisation_id
    AND onglet IN ('tiers', 'autres_dettes')
    AND solde_credit > solde_debit;

  SELECT COALESCE(SUM(solde_debit - solde_credit), 0) INTO v_assets
  FROM public.initialisation_comptes
  WHERE initialisation_id = p_initialisation_id AND onglet = 'immobilisations';

  v_capital_net := public.calculer_capital_net(p_initialisation_id);

  RETURN jsonb_build_object(
    'fuel', ROUND(v_fuel, 2),
    'boutique', ROUND(v_boutique, 2),
    'treasury', ROUND(v_treasury, 2),
    'receivable', ROUND(v_receivable, 2),
    'payable', ROUND(v_payable, 2),
    'fixed_assets', ROUND(v_assets, 2),
    'totalActif', ROUND(v_fuel + v_boutique + v_treasury + v_receivable + v_assets, 2),
    'totalPassif', ROUND(v_payable, 2),
    'capitalNet', ROUND(v_capital_net, 2)
  );
END;
$$;

-- Mouvements stock initiaux boutique (remplacement par station)
CREATE OR REPLACE FUNCTION public.sync_initialisation_stock_boutique(
  p_initialisation_id UUID,
  p_station_id UUID,
  p_entreprise_id UUID,
  p_created_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init RECORD;
  v_row RECORD;
  v_count INTEGER := 0;
  v_ref_prefix TEXT;
BEGIN
  SELECT * INTO v_init FROM public.initialisation
  WHERE id = p_initialisation_id AND entreprise_id = p_entreprise_id;

  IF NOT FOUND OR v_init.est_validee THEN
    RAISE EXCEPTION 'Initialisation introuvable ou verrouillée';
  END IF;

  v_ref_prefix := 'INIT-STK:' || p_initialisation_id::text || ':' || p_station_id::text;

  DELETE FROM public.mouvements_stock
  WHERE station_id = p_station_id
    AND type = 'entree_initiale'
    AND reference_numero LIKE v_ref_prefix || '%';

  FOR v_row IN
    SELECT * FROM public.initialisation_stocks_boutique
    WHERE initialisation_id = p_initialisation_id
      AND station_id = p_station_id
      AND quantite_initiale > 0
      AND prix_achat_initial > 0
  LOOP
    INSERT INTO public.mouvements_stock (
      entreprise_id, station_id, article_id, type, sens,
      quantite, cmup_unitaire, reference_type, reference_id, reference_numero,
      date_mouvement, created_by
    ) VALUES (
      p_entreprise_id, p_station_id, v_row.article_id,
      'entree_initiale', 'entree',
      v_row.quantite_initiale, v_row.prix_achat_initial,
      'initialisation', p_initialisation_id,
      v_ref_prefix || ':' || v_row.article_id::text,
      NOW(), p_created_by
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Synchronise jauges/stock cuves depuis l'initialisation (pas de mouvement à la validation)
CREATE OR REPLACE FUNCTION public.sync_initialisation_cuves_stock(
  p_initialisation_id UUID,
  p_station_id UUID,
  p_entreprise_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init RECORD;
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_init FROM public.initialisation
  WHERE id = p_initialisation_id AND entreprise_id = p_entreprise_id;

  IF NOT FOUND OR v_init.est_validee THEN
    RAISE EXCEPTION 'Initialisation introuvable ou verrouillée';
  END IF;

  FOR v_row IN
    SELECT * FROM public.initialisation_cuves
    WHERE initialisation_id = p_initialisation_id
      AND station_id = p_station_id
      AND volume_initial_litres > 0
  LOOP
    UPDATE public.cuves SET
      stock_actuel_litres = v_row.volume_initial_litres,
      jauge_actuelle_cm = v_row.jauge_initiale_cm,
      cmup = v_row.prix_achat_initial,
      updated_at = NOW()
    WHERE id = v_row.cuve_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Index pistolets → index_actuel
CREATE OR REPLACE FUNCTION public.sync_initialisation_index_pistolets(
  p_initialisation_id UUID,
  p_station_id UUID,
  p_entreprise_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init RECORD;
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_init FROM public.initialisation
  WHERE id = p_initialisation_id AND entreprise_id = p_entreprise_id;

  IF NOT FOUND OR v_init.est_validee THEN
    RAISE EXCEPTION 'Initialisation introuvable ou verrouillée';
  END IF;

  FOR v_row IN
    SELECT * FROM public.initialisation_index_pistolets
    WHERE initialisation_id = p_initialisation_id AND station_id = p_station_id
  LOOP
    UPDATE public.pistolets SET
      index_actuel = v_row.index_initial,
      updated_at = NOW()
    WHERE id = v_row.pistolet_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Validation = verrouillage uniquement
CREATE OR REPLACE FUNCTION public.valider_initialisation_lock(
  p_initialisation_id UUID,
  p_entreprise_id UUID,
  p_compte_id UUID
)
RETURNS public.initialisation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init public.initialisation;
  v_capital NUMERIC;
BEGIN
  SELECT * INTO v_init FROM public.initialisation
  WHERE id = p_initialisation_id AND entreprise_id = p_entreprise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Initialisation introuvable';
  END IF;

  IF v_init.est_validee THEN
    RAISE EXCEPTION 'Initialisation déjà validée';
  END IF;

  v_capital := public.calculer_capital_net(p_initialisation_id);

  UPDATE public.initialisation SET
    est_validee = true,
    validee_at = NOW(),
    validee_par = p_compte_id,
    capital_net_calcule = v_capital,
    updated_at = NOW()
  WHERE id = p_initialisation_id
  RETURNING * INTO v_init;

  UPDATE public.stations SET
    initialisation_validee = true,
    initialisation_validee_at = NOW()
  WHERE entreprise_id = p_entreprise_id;

  RETURN v_init;
END;
$$;
