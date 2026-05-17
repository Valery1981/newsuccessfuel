-- Permet plusieurs changements de prix le même jour (historisation §6.5).
-- Prix courant = ligne la plus récente (date_effet DESC, created_at DESC).

ALTER TABLE public.prix_carburant
  DROP CONSTRAINT IF EXISTS prix_carburant_station_id_type_carburant_date_effet_key;

CREATE INDEX IF NOT EXISTS idx_prix_carburant_station_type_created
  ON public.prix_carburant (station_id, type_carburant, date_effet DESC, created_at DESC);
