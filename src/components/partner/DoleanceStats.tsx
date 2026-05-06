"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { partnerDoleanceService } from "@/services/partnerDoleanceService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, Clock } from "lucide-react";

interface DoleanceStatsProps {
  stationIds: string[];
}

export function DoleanceStats({ stationIds }: DoleanceStatsProps) {
  const {
    data: stats,
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["partner-doleance-stats", stationIds],
    queryFn: () => partnerDoleanceService.getDoleancesStats(stationIds),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statsParType, isLoading: typeLoading } = useQuery({
    queryKey: ["partner-doleance-stats-type", stationIds],
    queryFn: () => partnerDoleanceService.getDoleancesStatsParType(stationIds),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || typeLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiques Doléances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Statistiques Doléances</span>
          <span className="text-xs text-muted-foreground font-normal">
            Mis à jour:{" "}
            {format(new Date(dataUpdatedAt), "dd/MM/yyyy HH:mm", {
              locale: fr,
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-red-500/10 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats?.en_cours ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">En cours</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats?.reglees ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Résolues</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.reglees && stats?.total > 0
                ? ((stats.reglees / stats.total) * 100).toFixed(0)
                : 0}
              %
            </div>
            <div className="text-xs text-muted-foreground">Taux résolution</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Prise en charge:</span>
            <span className="font-medium">
              {stats?.delai_moyen_prise_en_charge_heures?.toFixed(1) ?? 0}h
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Résolution:</span>
            <span className="font-medium">
              {stats?.delai_moyen_resolution_heures?.toFixed(1) ?? 0}h
            </span>
          </div>
        </div>

        {statsParType && statsParType.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Par type d&apos;incident
            </h4>
            <div className="space-y-2">
              {statsParType.slice(0, 5).map((stat) => (
                <div
                  key={stat.type_incident}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {stat.type_incident}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{stat.total}</span>
                    <span
                      className={`text-xs font-medium ${
                        stat.taux_resolution >= 80
                          ? "text-green-600"
                          : stat.taux_resolution >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {stat.taux_resolution.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
