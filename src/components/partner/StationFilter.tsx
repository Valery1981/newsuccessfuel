"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface StationFilterProps {
  stations: { id: string; nom: string }[];
  selectedStationIds: string[];
  onStationToggle: (stationId: string) => void;
  onClearAll: () => void;
}

export function StationFilter({
  stations,
  selectedStationIds,
  onStationToggle,
  onClearAll,
}: StationFilterProps) {
  if (stations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Filtrer par station</h3>
          {selectedStationIds.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {stations.map((station) => {
            const isSelected = selectedStationIds.includes(station.id);
            return (
              <Badge
                key={station.id}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => onStationToggle(station.id)}
              >
                {station.nom}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
