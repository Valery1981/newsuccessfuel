-- fn_audit_log : comptes n'a pas entreprise_id (lien via entreprises.compte_id)
-- Bloquait sync_initialisation_a_nouveau → INSERT ecritures_comptables

CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_session_id uuid;
  v_compte_id uuid;
  v_entreprise_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT id INTO v_session_id
  FROM public.sessions_utilisateurs
  WHERE supabase_user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT c.id INTO v_compte_id
  FROM public.comptes c
  WHERE c.supabase_user_id = v_user_id
  LIMIT 1;

  IF v_compte_id IS NOT NULL THEN
    SELECT e.id INTO v_entreprise_id
    FROM public.entreprises e
    WHERE e.compte_id = v_compte_id
    LIMIT 1;
  END IF;

  IF v_entreprise_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT e.id INTO v_entreprise_id
    FROM public.sessions_utilisateurs su
    JOIN public.entreprises e ON e.compte_id = su.compte_parent_id
    WHERE su.id = v_session_id
    LIMIT 1;
  END IF;

  IF v_entreprise_id IS NULL THEN
    v_entreprise_id := COALESCE(
      NULLIF(to_jsonb(NEW)->>'entreprise_id', '')::uuid,
      NULLIF(to_jsonb(OLD)->>'entreprise_id', '')::uuid
    );
  END IF;

  INSERT INTO public.audit_log (
    table_cible,
    record_id,
    action,
    anciennes_valeurs,
    nouvelles_valeurs,
    session_id,
    compte_id,
    entreprise_id
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_session_id,
    v_compte_id,
    v_entreprise_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
