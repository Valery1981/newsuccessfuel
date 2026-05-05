import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { format, subDays } from "date-fns";

const supabase = createClient();

export interface ReportStation { id: string; nom: string }

/** Retourne la liste des stations de l'entreprise connectée. */
export function useReportStations() {
  const { entreprise } = useAuthStore();
  return useQuery<ReportStation[]>({
    queryKey: ["report-stations", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("stations")
        .select("id, nom")
        .eq("entreprise_id", entreprise.id)
        .order("nom");
      return (data ?? []) as ReportStation[];
    },
    enabled: !!entreprise?.id,
    staleTime: 10 * 60 * 1000,
  });
}

/** Valeurs de filtre par défaut : 30 derniers jours, toutes stations. */
export function defaultFilterValues() {
  return {
    dateDebut: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dateFin: format(new Date(), "yyyy-MM-dd"),
    stationId: "",
  };
}
