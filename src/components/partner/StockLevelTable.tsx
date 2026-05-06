"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { partnerStockService } from "@/services/partnerStockService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface StockLevelTableProps {
  stationIds: string[];
}

export function StockLevelTable({ stationIds }: StockLevelTableProps) {
  const {
    data: stocks = [],
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["partner-stocks", stationIds],
    queryFn: () => partnerStockService.getStocksParStation(stationIds),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Niveau de stock par station
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

  if (stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Niveau de stock par station
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucune donnée de stock disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Niveau de stock par station</span>
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
                <th className="text-left py-2 px-3 font-medium">Carburant</th>
                <th className="text-right py-2 px-3 font-medium">Stock (L)</th>
                <th className="text-right py-2 px-3 font-medium">Seuil (L)</th>
                <th className="text-right py-2 px-3 font-medium">
                  Capacité (L)
                </th>
                <th className="text-right py-2 px-3 font-medium">%</th>
                <th className="text-center py-2 px-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr key={stock.cuve_id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3">{stock.station_nom}</td>
                  <td className="py-2 px-3">{stock.type_carburant}</td>
                  <td className="py-2 px-3 text-right">
                    {stock.stock_actuel_litres.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {stock.seuil_alerte.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {stock.capacite_max.toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {stock.pourcentage_remplissage.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    {stock.en_alerte ? (
                      <div className="flex items-center justify-center gap-1 text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Alerte</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">OK</span>
                      </div>
                    )}
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
