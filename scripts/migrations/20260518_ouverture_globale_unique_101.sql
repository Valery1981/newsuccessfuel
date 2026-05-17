-- Ouverture initialisation : UNE seule écriture globale, UNE seule ligne 101.
-- Reconstruite depuis toutes les tables initialisation_* à chaque Enregistrer.

CREATE OR REPLACE FUNCTION public.delete_all_initialisation_ouverture_ecritures(
  p_initialisation_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ecritures_comptables
  WHERE type_operation = 'initialisation_a_nouveau'
    AND reference_numero LIKE 'INIT:' || p_initialisation_id::text || ':%';
END;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_initialisation_ouverture_globale(
  p_initialisation_id UUID,
  p_entreprise_id UUID,
  p_date_ouverture DATE,
  p_created_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init RECORD;
  v_ref TEXT;
  v_ecriture_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_diff NUMERIC;
  v_ligne_count INTEGER := 0;
  v_capital_libelle TEXT := 'Capital social';
  v_row RECORD;
  v_montant NUMERIC;
  v_net NUMERIC;
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

  PERFORM public.delete_all_initialisation_ouverture_ecritures(p_initialisation_id);

  v_ref := 'INIT:' || p_initialisation_id::text || ':ouverture:global';

  CREATE TEMP TABLE IF NOT EXISTS _tmp_ouverture_lignes (
    numero_compte TEXT NOT NULL,
    libelle_compte TEXT NOT NULL,
    montant NUMERIC NOT NULL,
    sens TEXT NOT NULL,
    tiers_id UUID,
    tresorerie_id UUID
  ) ON COMMIT DROP;

  TRUNCATE _tmp_ouverture_lignes;

  -- Stocks carburant (310/320/330) agrégés
  INSERT INTO _tmp_ouverture_lignes (numero_compte, libelle_compte, montant, sens)
  SELECT
    COALESCE(c.compte_stock, '310'),
    COALESCE(pcs.libelle, 'Stock carburant'),
    ROUND(SUM(ic.valeur_stock), 2),
    'debit'
  FROM public.initialisation_cuves ic
  JOIN public.cuves c ON c.id = ic.cuve_id
  LEFT JOIN public.plan_comptable_standard pcs
    ON pcs.numero = COALESCE(c.compte_stock, '310')
  WHERE ic.initialisation_id = p_initialisation_id
    AND COALESCE(ic.valeur_stock, 0) > 0
  GROUP BY COALESCE(c.compte_stock, '310'), pcs.libelle;

  -- Stocks boutique (340–370) agrégés par famille
  INSERT INTO _tmp_ouverture_lignes (numero_compte, libelle_compte, montant, sens)
  SELECT
    v.compte,
    COALESCE(pcs.libelle, v.compte),
    ROUND(SUM(sb.valeur_stock), 2),
    'debit'
  FROM public.initialisation_stocks_boutique sb
  JOIN public.articles a ON a.id = sb.article_id
  CROSS JOIN LATERAL (
    SELECT CASE a.famille
      WHEN 'lubrifiants' THEN '340'
      WHEN 'gpl' THEN '350'
      WHEN 'marchandises_generales' THEN '360'
      WHEN 'pieces_accessoires' THEN '370'
      ELSE NULL
    END AS compte
  ) v
  LEFT JOIN public.plan_comptable_standard pcs ON pcs.numero = v.compte
  WHERE sb.initialisation_id = p_initialisation_id
    AND v.compte IS NOT NULL
    AND COALESCE(sb.valeur_stock, 0) > 0
  GROUP BY v.compte, pcs.libelle;

  -- Comptes entreprise (trésorerie, créances, dettes, immobilisations)
  FOR v_row IN
    SELECT *
    FROM public.initialisation_comptes
    WHERE initialisation_id = p_initialisation_id
  LOOP
    v_compte_root := split_part(COALESCE(v_row.numero_compte, ''), '-', 1);

    v_net := ROUND(COALESCE(v_row.solde_debit, 0) - COALESCE(v_row.solde_credit, 0), 2);

    IF v_net > 0
       AND (v_compte_root = '421' OR v_row.numero_compte LIKE '421%') THEN
      RAISE EXCEPTION
        'Créances initiales : le compte % en débit est interdit (utiliser 460 pour les employés)',
        v_row.numero_compte;
    END IF;
    IF v_net = 0 THEN
      CONTINUE;
    END IF;

    IF v_net > 0 THEN
      INSERT INTO _tmp_ouverture_lignes (
        numero_compte, libelle_compte, montant, sens, tiers_id, tresorerie_id
      ) VALUES (
        v_row.numero_compte,
        v_row.libelle_compte,
        v_net,
        'debit',
        v_row.tiers_id,
        v_row.tresorerie_id
      );
    ELSE
      INSERT INTO _tmp_ouverture_lignes (
        numero_compte, libelle_compte, montant, sens, tiers_id, tresorerie_id
      ) VALUES (
        v_row.numero_compte,
        v_row.libelle_compte,
        ABS(v_net),
        'credit',
        v_row.tiers_id,
        v_row.tresorerie_id
      );
    END IF;
  END LOOP;

  SELECT COUNT(*)::integer INTO v_ligne_count FROM _tmp_ouverture_lignes;
  IF v_ligne_count = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.ecritures_comptables (
    entreprise_id, numero_piece, libelle, date_ecriture, statut,
    type_operation, reference_numero, station_id, is_central,
    module_initialisation, created_by
  ) VALUES (
    p_entreprise_id,
    v_ref,
    'À nouveau — Ouverture',
    COALESCE(p_date_ouverture, v_init.date_ouverture, CURRENT_DATE),
    'validee',
    'initialisation_a_nouveau',
    v_ref,
    NULL,
    true,
    'ouverture',
    p_created_by
  )
  RETURNING id INTO v_ecriture_id;

  FOR v_row IN
    SELECT * FROM _tmp_ouverture_lignes ORDER BY numero_compte
  LOOP
    IF v_row.sens = 'credit' THEN
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES (
        v_ecriture_id, v_row.numero_compte, v_row.libelle_compte,
        v_row.tiers_id, v_row.tresorerie_id, 0, v_row.montant
      );
      v_total_credit := v_total_credit + v_row.montant;
    ELSE
      INSERT INTO public.lignes_ecriture (
        ecriture_id, numero_compte, libelle_compte,
        tiers_id, tresorerie_id, debit, credit
      ) VALUES (
        v_ecriture_id, v_row.numero_compte, v_row.libelle_compte,
        v_row.tiers_id, v_row.tresorerie_id, v_row.montant, 0
      );
      v_total_debit := v_total_debit + v_row.montant;
    END IF;
  END LOOP;

  -- UNE SEULE ligne 101 : Total Actif − Total Passif
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

-- sync_initialisation_a_nouveau : valide le module en cours puis reconstruit l'ouverture globale.
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
  v_ligne JSONB;
  v_numero_compte TEXT;
  v_compte_root TEXT;
  v_enterprise_modules TEXT[] := ARRAY[
    'tresorerie', 'creances', 'dettes', 'immobilisations', 'autres_dettes'
  ];
  v_station_modules TEXT[] := ARRAY['cuves', 'stock_boutique'];
BEGIN
  IF p_module = ANY (v_enterprise_modules) AND p_station_id IS NOT NULL THEN
    RAISE EXCEPTION 'Module entreprise % : station_id doit être NULL', p_module;
  END IF;

  IF p_module = ANY (v_station_modules) AND p_station_id IS NULL THEN
    RAISE EXCEPTION 'Module station % : station_id obligatoire', p_module;
  END IF;

  IF p_module = 'creances' AND p_lignes IS NOT NULL THEN
    FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
    LOOP
      v_numero_compte := v_ligne->>'numero_compte';
      v_compte_root := split_part(COALESCE(v_numero_compte, ''), '-', 1);
      IF v_compte_root = '421' OR COALESCE(v_numero_compte, '') LIKE '421%' THEN
        RAISE EXCEPTION
          'Créances initiales : le compte % est interdit (utiliser 460 pour les employés)',
          v_numero_compte;
      END IF;
    END LOOP;
  END IF;

  RETURN public.rebuild_initialisation_ouverture_globale(
    p_initialisation_id,
    p_entreprise_id,
    p_date_ouverture,
    p_created_by
  );
END;
$$;

COMMENT ON FUNCTION public.rebuild_initialisation_ouverture_globale IS
  'Reconstruit UNE écriture d''ouverture depuis tout le staging + UNE ligne 101.';

COMMENT ON FUNCTION public.sync_initialisation_a_nouveau IS
  'Valide le module puis appelle rebuild_initialisation_ouverture_globale (une seule pièce, une seule 101).';
