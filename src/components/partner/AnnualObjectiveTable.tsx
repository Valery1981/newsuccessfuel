"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { partnerObjectiveService } from "@/services/partnerObjectiveService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AnnualObjectiveTableProps {
  stationIds: string[];
}

export function AnnualObjectiveTable({
  stationIds,
}: AnnualObjectiveTableProps) {
  const anneeCourante = new Date().getFullYear();

  const {
    data: objectifs = [],
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["partner-objectifs-annuel", stationIds, anneeCourante],
    queryFn: () =>
      partnerObjectiveService.getRealisationsObjectifsAnnuel(
        stationIds,
        anneeCourante,
      ),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Réalisations vs Objectifs — Annuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (objectifs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Réalisations vs Objectifs — Annuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucun objectif configuré cette année
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Réalisations vs Objectifs — Annuel ({anneeCourante})</span>
          <span className="text-xs text-muted-foreground font-normal">
            Mis à jour:{" "}
            {format(new Date(dataUpdatedAt), "dd/MM/yyyy HH:mm", {
              locale: fr,
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Station</th>
                <th className="text-left py-2 px-3 font-medium">Type</th>
                <th className="text-right py-2 px-3 font-medium">
                  Objectif (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  Réalisé (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">%</th>
                <th className="text-right py-2 px-3 font-medium">
                  Projection (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">% Proj.</th>
              </tr>
            </thead>
            <tbody>
              {objectifs.map((obj) => (
                <tr
                  key={`${obj.station_id}-${obj.type}-${obj.type_carburant}`}
                  className="border-b hover:bg-muted/50"
                >
                  <td className="py-2 px-3">{obj.station_nom}</td>
                  <td className="py-2 px-3">
                    {obj.type_carburant || obj.type}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {obj.objectif.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {obj.realise.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          obj.taux_realisation >= 100
                            ? "text-green-600"
                            : obj.taux_realisation >= 80
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {obj.taux_realisation.toFixed(1)}%
                      </span>
                      <div className="w-16">
                        <Progress
                          value={Math.min(obj.taux_realisation, 100)}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {obj.projection_fin_annee.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={`text-xs font-semibold ${
                        obj.taux_projection >= 100
                          ? "text-green-600"
                          : obj.taux_projection >= 80
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {obj.taux_projection.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
