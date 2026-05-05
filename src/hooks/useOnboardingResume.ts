"use client";

import { entrepriseService } from "@/services/entrepriseService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const STEP_TO_PATH: Record<string, string> = {
  station_info: "/cuves",
  cuves: "/cuves",
  pistolets: "/pistolets",
  boutique: "/boutique",
};

/**
 * Watcher côté gérant : à l'initialisation de session, vérifie si une station
 * est en cours de configuration et redirige vers la bonne étape.
 *
 * - Ne joue qu'une seule fois par session montage (ref `hasChecked`).
 * - Ne redirige PAS si l'onboarding est déjà complet (step = 'complete').
 * - Seul le gérant propriétaire de l'entreprise est concerné.
 */
export function useOnboardingResume() {
  const { entreprise, compte, isInitialized } = useAuthStore();
  const router = useRouter();
  const hasChecked = useRef(false);
  const isRouterReady = useRef(false);

  useEffect(() => {
    isRouterReady.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (hasChecked.current) return;
    if (compte?.type !== "gerant") return;
    if (!isRouterReady.current) return;

    hasChecked.current = true;

    const check = async () => {
      let entrepriseId = entreprise?.id;

      if (!entrepriseId) {
        if (!compte.id) return;
        const found = await entrepriseService.getEntrepriseByCompte(compte.id);
        if (!found) {
          router.replace("/company");
          return;
        }
        entrepriseId = found.id;
      }

      const incomplete =
        await stationService.getIncompleteOnboarding(entrepriseId);

      if (!incomplete) return;

      const path = STEP_TO_PATH[incomplete.onboarding_step];
      if (path) {
        router.replace(`${path}?station_id=${incomplete.id}`);
      }
    };

    void check();
  }, [isInitialized, entreprise, compte, router]);
}
