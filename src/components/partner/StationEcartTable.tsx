"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { partnerEcartService } from "@/services/partnerEcartService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface StationEcartTableProps {
  stationIds: string[];
}

export function StationEcartTable({ stationIds }: StationEcartTableProps) {
  const {
    data: ecarts = [],
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["partner-ecarts-station", stationIds],
    queryFn: () => partnerEcartService.getEcartsParStation(stationIds),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Écarts par Station — Tendance
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

  if (ecarts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Écarts par Station — Tendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucun écart enregistré
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTendanceIcon = (tendance: string) => {
    switch (tendance) {
      case "amelioration":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "degradation":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTendanceLabel = (tendance: string) => {
    switch (tendance) {
      case "amelioration":
        return "Amélioration";
      case "degradation":
        return "Dégradation";
      default:
        return "Stable";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Écarts par Station — Tendance (30 derniers jours)</span>
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
                <th className="text-right py-2 px-3 font-medium">
                  Écart Total (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  Écart Moyen (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  Nb Inventaires
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  Dernier Écart (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  Date Dernier
                </th>
                <th className="text-center py-2 px-3 font-medium">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {ecarts.map((ecart) => (
                <tr
                  key={ecart.station_id}
                  className="border-b hover:bg-muted/50"
                >
                  <td className="py-2 px-3">{ecart.station_nom}</td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      ecart.ecart_total_litres < 0
                        ? "text-red-600"
                        : ecart.ecart_total_litres > 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {ecart.ecart_total_litres.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {ecart.ecart_moyen_litres.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {ecart.nombre_inventaires}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      ecart.dernier_ecart < 0
                        ? "text-red-600"
                        : ecart.dernier_ecart > 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {ecart.dernier_ecart.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right text-xs">
                    {ecart.dernier_ecart_date
                      ? format(
                          new Date(ecart.dernier_ecart_date),
                          "dd/MM/yyyy",
                          { locale: fr },
                        )
                      : "—"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTendanceIcon(ecart.tendance)}
                      <span className="text-xs">
                        {getTendanceLabel(ecart.tendance)}
                      </span>
                    </div>
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
