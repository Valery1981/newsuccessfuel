"use client";

import { useOnboardingResume } from "@/hooks/useOnboardingResume";
import { effectiveMustChangePassword } from "@/lib/effectiveMustChangePassword";
import { runAfterAuthCallback } from "@/lib/supabaseAuthDeferral";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";

function OnboardingResumeWatcher() {
  useOnboardingResume();
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    // Accès direct au store (stable, évite les re-runs liés aux dépendances)
    const { setLoading, setInitialized, reset } = useAuthStore.getState();

    const loadUserData = async (session: Session | null) => {
      const userId = session?.user?.id;
      if (!userId) return;

      // 1. Check comptes table (gerant / partenaire / superadmin)
      const { data: compte, error: compteError } = await supabase
        .from("comptes")
        .select(
          "id, type, nom, email, telephone, is_active, must_change_password",
        )
        .eq("supabase_user_id", userId)
        .maybeSingle<{
          id: string;
          type: "superadmin" | "gerant" | "partenaire";
          nom: string;
          email: string;
          telephone: string | undefined;
          is_active: boolean;
          must_change_password: boolean;
        }>();

      if (compteError) {
        console.error(
          "[AuthProvider] Erreur chargement compte :",
          compteError.code,
          compteError.message,
          "→ Appliquer scripts/fix-comptes-rls.sql dans Supabase SQL Editor",
        );
      }

      if (compte) {
        const mustChange = effectiveMustChangePassword(
          compte.must_change_password,
          session.user,
        );
        useAuthStore.getState().setCompte({
          ...compte,
          must_change_password: mustChange,
        });

        if (compte.type === "gerant") {
          const { data: entreprise } = await supabase
            .from("entreprises")
            .select("id, nom, pays, is_active")
            .eq("compte_id", compte.id)
            .single();

          if (entreprise)
            useAuthStore.getState().setEntreprise({
              ...entreprise,
              is_active: entreprise.is_active ?? false,
            });
        }
        return;
      }

      // 2. Fallback: check sessions_utilisateurs (employee sessions)
      const { data: sess } = await supabase
        .from("sessions_utilisateurs")
        .select(
          "id, nom, email, status, must_change_password, poste, compte_parent_id, droits",
        )
        .eq("supabase_user_id", userId)
        .maybeSingle();

      if (sess) {
        useAuthStore.getState().setCompte({
          id: sess.compte_parent_id ?? sess.id,
          session_id: sess.id,
          type: "session_gerant",
          nom: sess.nom,
          email: sess.email,
          is_active: sess.status === "active",
          must_change_password: sess.must_change_password ?? false,
          poste: sess.poste,
        });

        // Load granular permissions from droits JSONB
        const droits = sess.droits as Record<string, boolean> | null;
        useAuthStore.getState().setDroits(droits ?? {});

        // Load entreprise via parent compte
        if (sess.compte_parent_id) {
          const { data: parentCompte } = await supabase
            .from("comptes")
            .select("id")
            .eq("id", sess.compte_parent_id)
            .single();
          if (parentCompte) {
            const { data: entreprise } = await supabase
              .from("entreprises")
              .select("id, nom, pays, is_active")
              .eq("compte_id", parentCompte.id)
              .single();
            if (entreprise)
              useAuthStore.getState().setEntreprise({
                ...entreprise,
                is_active: entreprise.is_active ?? false,
              });
          }
        }
      }
    };

    // Utiliser uniquement onAuthStateChange qui émet INITIAL_SESSION dès le montage.
    // On évite ainsi le double-appel de loadUserData que causait getSession() + INITIAL_SESSION.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setUser(session?.user ?? null);

      if (event === "SIGNED_OUT") {
        reset();
        return;
      }

      // Différer tout appel Supabase hors du callback synchrone (évite deadlock global).
      runAfterAuthCallback(() => {
        void (async () => {
          try {
            if (session?.user) {
              await loadUserData(session);
            }
          } finally {
            setLoading(false);
            setInitialized(true);
          }
        })();
      });
    });

    // Fallback : si onAuthStateChange ne se déclenche pas (cas rare en SSR hydratation)
    // on marque quand même l'état comme initialisé après un délai minimal.
    const fallbackTimer = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        setLoading(false);
        setInitialized(true);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []); // deps vides : l'effet ne tourne qu'une seule fois (setters Zustand stables)

  return (
    <>
      <OnboardingResumeWatcher />
      {children}
    </>
  );
}
