-- ============================================================
-- SUCCESSFUEL — CORRECTIF RLS : TABLES ENFANTS (child tables)
-- À exécuter après fix-all-rls.sql
-- ============================================================
-- Concerne les tables sans colonne entreprise_id / station_id directe
-- mais liées à une table parent déjà couverte.
-- Le script est idempotent (DROP IF EXISTS avant chaque CREATE).
-- ============================================================

-- Prérequis : les fonctions helper doivent déjà exister
-- (créées par fix-all-rls.sql)
--   public.auth_is_superadmin()
--   public.auth_write_station_ids()
--   public.auth_write_entreprise_ids()
--   public.auth_get_compte_id()

-- ============================================================
-- 1. calibrages  (cuve_id → cuves → station_id)
-- ============================================================
ALTER TABLE public.calibrages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calibrages_gerant_all"        ON public.calibrages;
DROP POLICY IF EXISTS "calibrages_partenaire_select" ON public.calibrages;
DROP POLICY IF EXISTS "calibrages_superadmin_all"    ON public.calibrages;

CREATE POLICY "calibrages_gerant_all" ON public.calibrages
  FOR ALL
  USING (
    cuve_id IN (
      SELECT id FROM public.cuves
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    cuve_id IN (
      SELECT id FROM public.cuves
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "calibrages_partenaire_select" ON public.calibrages
  FOR SELECT
  USING (
    cuve_id IN (
      SELECT c.id FROM public.cuves c
      JOIN public.stations s ON s.id = c.station_id
      WHERE s.partenaire_id IN (
        SELECT id FROM public.partenaires
        WHERE compte_id = public.auth_get_compte_id()
      )
    )
  );

CREATE POLICY "calibrages_superadmin_all" ON public.calibrages
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 2. lignes_bc_carburant  (achat_id → achats_carburant → entreprise_id)
-- ============================================================
ALTER TABLE public.lignes_bc_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_bc_gerant_all"     ON public.lignes_bc_carburant;
DROP POLICY IF EXISTS "lignes_bc_superadmin_all" ON public.lignes_bc_carburant;

CREATE POLICY "lignes_bc_gerant_all" ON public.lignes_bc_carburant
  FOR ALL
  USING (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "lignes_bc_superadmin_all" ON public.lignes_bc_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 3. paiements_achat_carburant  (achat_id → achats_carburant)
-- ============================================================
ALTER TABLE public.paiements_achat_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmt_achat_carb_gerant_all"     ON public.paiements_achat_carburant;
DROP POLICY IF EXISTS "pmt_achat_carb_superadmin_all" ON public.paiements_achat_carburant;

CREATE POLICY "pmt_achat_carb_gerant_all" ON public.paiements_achat_carburant
  FOR ALL
  USING (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "pmt_achat_carb_superadmin_all" ON public.paiements_achat_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 4. receptions_carburant  (achat_id → achats_carburant)
-- ============================================================
ALTER TABLE public.receptions_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receptions_carb_gerant_all"     ON public.receptions_carburant;
DROP POLICY IF EXISTS "receptions_carb_superadmin_all" ON public.receptions_carburant;

CREATE POLICY "receptions_carb_gerant_all" ON public.receptions_carburant
  FOR ALL
  USING (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    achat_id IN (
      SELECT id FROM public.achats_carburant
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "receptions_carb_superadmin_all" ON public.receptions_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 5. lignes_shift_carburant  (shift_id → shifts_carburant → station_id)
-- ============================================================
ALTER TABLE public.lignes_shift_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_shift_carb_gerant_all"     ON public.lignes_shift_carburant;
DROP POLICY IF EXISTS "lignes_shift_carb_superadmin_all" ON public.lignes_shift_carburant;

CREATE POLICY "lignes_shift_carb_gerant_all" ON public.lignes_shift_carburant
  FOR ALL
  USING (
    shift_id IN (
      SELECT id FROM public.shifts_carburant
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    shift_id IN (
      SELECT id FROM public.shifts_carburant
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "lignes_shift_carb_superadmin_all" ON public.lignes_shift_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 6. paiements_shift_carburant  (shift_id → shifts_carburant)
-- ============================================================
ALTER TABLE public.paiements_shift_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmt_shift_carb_gerant_all"     ON public.paiements_shift_carburant;
DROP POLICY IF EXISTS "pmt_shift_carb_superadmin_all" ON public.paiements_shift_carburant;

CREATE POLICY "pmt_shift_carb_gerant_all" ON public.paiements_shift_carburant
  FOR ALL
  USING (
    shift_id IN (
      SELECT id FROM public.shifts_carburant
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    shift_id IN (
      SELECT id FROM public.shifts_carburant
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "pmt_shift_carb_superadmin_all" ON public.paiements_shift_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 7. lignes_ticket_boutique  (ticket_id → tickets_boutique → station_id)
-- ============================================================
ALTER TABLE public.lignes_ticket_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_ticket_gerant_all"     ON public.lignes_ticket_boutique;
DROP POLICY IF EXISTS "lignes_ticket_superadmin_all" ON public.lignes_ticket_boutique;

CREATE POLICY "lignes_ticket_gerant_all" ON public.lignes_ticket_boutique
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets_boutique
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets_boutique
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "lignes_ticket_superadmin_all" ON public.lignes_ticket_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 8. paiements_ticket_boutique  (ticket_id → tickets_boutique)
-- ============================================================
ALTER TABLE public.paiements_ticket_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmt_ticket_gerant_all"     ON public.paiements_ticket_boutique;
DROP POLICY IF EXISTS "pmt_ticket_superadmin_all" ON public.paiements_ticket_boutique;

CREATE POLICY "pmt_ticket_gerant_all" ON public.paiements_ticket_boutique
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets_boutique
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets_boutique
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "pmt_ticket_superadmin_all" ON public.paiements_ticket_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 9. lignes_achat_boutique  (achat_id → achats_boutique → entreprise_id)
-- ============================================================
ALTER TABLE public.lignes_achat_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_achat_bq_gerant_all"     ON public.lignes_achat_boutique;
DROP POLICY IF EXISTS "lignes_achat_bq_superadmin_all" ON public.lignes_achat_boutique;

CREATE POLICY "lignes_achat_bq_gerant_all" ON public.lignes_achat_boutique
  FOR ALL
  USING (
    achat_id IN (
      SELECT id FROM public.achats_boutique
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    achat_id IN (
      SELECT id FROM public.achats_boutique
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "lignes_achat_bq_superadmin_all" ON public.lignes_achat_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 10. paiements_achat_boutique  (achat_id → achats_boutique)
-- ============================================================
ALTER TABLE public.paiements_achat_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pmt_achat_bq_gerant_all"     ON public.paiements_achat_boutique;
DROP POLICY IF EXISTS "pmt_achat_bq_superadmin_all" ON public.paiements_achat_boutique;

CREATE POLICY "pmt_achat_bq_gerant_all" ON public.paiements_achat_boutique
  FOR ALL
  USING (
    achat_id IN (
      SELECT id FROM public.achats_boutique
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  )
  WITH CHECK (
    achat_id IN (
      SELECT id FROM public.achats_boutique
      WHERE entreprise_id IN (SELECT public.auth_write_entreprise_ids())
    )
  );

CREATE POLICY "pmt_achat_bq_superadmin_all" ON public.paiements_achat_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 11. lignes_inventaire_carburant  (inventaire_id → inventaires → station_id)
-- ============================================================
ALTER TABLE public.lignes_inventaire_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_inv_carb_gerant_all"     ON public.lignes_inventaire_carburant;
DROP POLICY IF EXISTS "lignes_inv_carb_superadmin_all" ON public.lignes_inventaire_carburant;

CREATE POLICY "lignes_inv_carb_gerant_all" ON public.lignes_inventaire_carburant
  FOR ALL
  USING (
    inventaire_id IN (
      SELECT id FROM public.inventaires
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    inventaire_id IN (
      SELECT id FROM public.inventaires
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "lignes_inv_carb_superadmin_all" ON public.lignes_inventaire_carburant
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- 12. lignes_inventaire_boutique  (inventaire_id → inventaires)
-- ============================================================
ALTER TABLE public.lignes_inventaire_boutique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_inv_bq_gerant_all"     ON public.lignes_inventaire_boutique;
DROP POLICY IF EXISTS "lignes_inv_bq_superadmin_all" ON public.lignes_inventaire_boutique;

CREATE POLICY "lignes_inv_bq_gerant_all" ON public.lignes_inventaire_boutique
  FOR ALL
  USING (
    inventaire_id IN (
      SELECT id FROM public.inventaires
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  )
  WITH CHECK (
    inventaire_id IN (
      SELECT id FROM public.inventaires
      WHERE station_id IN (SELECT public.auth_write_station_ids())
    )
  );

CREATE POLICY "lignes_inv_bq_superadmin_all" ON public.lignes_inventaire_boutique
  FOR ALL
  USING  (public.auth_is_superadmin())
  WITH CHECK (public.auth_is_superadmin());

-- ============================================================
-- VÉRIFICATION : lister toutes les policies après exécution
-- ============================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
