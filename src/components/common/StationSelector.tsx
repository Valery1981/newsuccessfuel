"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

/**
 * Sélecteur de station global (§5.5-03 rules.md).
 * Synchronisé avec `uiStore.selectedStationId` (persisté via Zustand persist).
 * Option "Toutes les stations" (null) disponible pour les vues agrégées.
 */
export function StationSelector() {
  const { entreprise } = useAuthStore();
  const { selectedStationId, setSelectedStationId } = useUiStore();

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise
        ? stationService.getStationsByEntreprise(entreprise.id)
        : Promise.resolve([]),
    enabled: !!entreprise?.id,
    staleTime: 5 * 60 * 1000,
  });

  const options = stations ?? [];

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Select
        value={selectedStationId ?? "__all__"}
        onValueChange={(v: string | null) => {
          const val = v ?? "__all__";
          setSelectedStationId(val === "__all__" ? null : val);
        }}
      >
        <SelectTrigger className="min-w-[180px] max-w-[280px]">
          <SelectValue placeholder="Station..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Toutes les stations</SelectItem>
          {options.map((s: { id: string; nom: string }) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
