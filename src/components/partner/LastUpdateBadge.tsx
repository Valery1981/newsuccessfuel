"use client";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";

const supabase = createClient();

/**
 * APEX 2026-05-15-06 — Badge "Dernière mise à jour" par station (DIFF.md §9).
 *
 * Affiche la date la plus récente parmi :
 * - dernier inventaire carburant validé
 * - dernier shift carburant clôturé
 * - dernière réception achat carburant
 * - dernière doléance créée
 *
 * Format : JJ/MM/AAAA HH:MM
 */
async function getLastUpdate(stationId: string): Promise<Date | null> {
  const [inv, shift, recep, dol] = await Promise.all([
    supabase
      .from("inventaires")
      .select("date_inventaire")
      .eq("station_id", stationId)
      .order("date_inventaire", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("shifts_carburant")
      .select("heure_cloture")
      .eq("station_id", stationId)
      .not("heure_cloture", "is", null)
      .order("heure_cloture", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("receptions_carburant")
      .select("created_at")
      .eq("station_id", stationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("doleances")
      .select("created_at")
      .eq("station_id", stationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const candidates = [
    inv.data?.date_inventaire,
    shift.data?.heure_cloture,
    recep.data?.created_at,
    dol.data?.created_at,
  ]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d));

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a > b ? a : b));
}

export function LastUpdateBadge({ stationId }: { stationId: string }) {
  const { data: lastUpdate } = useQuery({
    queryKey: ["last-update", stationId],
    queryFn: () => getLastUpdate(stationId),
    enabled: !!stationId,
    staleTime: 5 * 60 * 1000,
  });

  if (!lastUpdate) {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Clock className="w-3 h-3" />
        Aucune activité
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <Clock className="w-3 h-3" />
      MAJ {format(lastUpdate, "dd/MM/yyyy HH:mm", { locale: fr })}
    </Badge>
  );
}
