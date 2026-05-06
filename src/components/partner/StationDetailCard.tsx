"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { partnerStationDetailService } from "@/services/partnerStationDetailService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  Fuel,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface StationDetailCardProps {
  stationId: string;
  stationNom: string;
}

export function StationDetailCard({
  stationId,
  stationNom,
}: StationDetailCardProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["partner-station-detail", stationId],
    queryFn: () => partnerStationDetailService.getStationDetail(stationId),
    enabled: !!stationId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails - {stationNom}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails - {stationNom}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTendanceIcon = (tendance: string) => {
    switch (tendance) {
      case "amelioration":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "degradation":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Détails - {stationNom}</span>
          <span className="text-xs text-muted-foreground font-normal">
            Mis à jour: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations station */}
        <div>
          <h4 className="text-sm font-medium mb-2">Informations</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Adresse:</span>
              <span className="ml-2">{detail.station.adresse || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Téléphone:</span>
              <span className="ml-2">{detail.station.telephone || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Volumes */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            Volumes
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">
                {detail.volumes.mois_courant.toLocaleString()} L
              </div>
              <div className="text-xs text-muted-foreground">Mois courant</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">
                {detail.volumes.mois_precedent.toLocaleString()} L
              </div>
              <div className="text-xs text-muted-foreground">
                Mois précédent
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">
                {detail.volumes.annee_courante.toLocaleString()} L
              </div>
              <div className="text-xs text-muted-foreground">
                Année courante
              </div>
            </div>
          </div>
        </div>

        {/* Stocks */}
        <div>
          <h4 className="text-sm font-medium mb-2">Stocks</h4>
          <div className="space-y-2">
            {detail.stocks.carburants.map(
              (stock: {
                type: string;
                stock_actuel: number;
                capacite: number;
                pourcentage: number;
                seuil_alerte: number;
              }) => (
                <div
                  key={stock.type}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stock.type}</span>
                    {stock.stock_actuel < stock.seuil_alerte && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{stock.stock_actuel.toLocaleString()} L</span>
                    <span className="text-muted-foreground">
                      {stock.pourcentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Objectifs */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Objectifs
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {detail.objectifs.mensuel && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {detail.objectifs.mensuel.taux.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Mensuel</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {detail.objectifs.mensuel.realise.toLocaleString()} /{" "}
                  {detail.objectifs.mensuel.objectif.toLocaleString()} L
                </div>
              </div>
            )}
            {detail.objectifs.annuel && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {detail.objectifs.annuel.taux.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Annuel</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {detail.objectifs.annuel.realise.toLocaleString()} /{" "}
                  {detail.objectifs.annuel.objectif.toLocaleString()} L
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Écarts */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Écarts (30j)
          </h4>
          <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <span>Total: {detail.ecarts.total_30j.toLocaleString()} L</span>
              <span>Moyen: {detail.ecarts.moyen_30j.toFixed(0)} L</span>
            </div>
            <div className="flex items-center gap-2">
              {getTendanceIcon(detail.ecarts.tendance)}
              <span className="text-xs capitalize">
                {detail.ecarts.tendance}
              </span>
            </div>
          </div>
        </div>

        {/* Doléances */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Doléances
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold">{detail.doleances.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-2 bg-red-500/10 rounded">
              <div className="text-lg font-bold text-red-600">
                {detail.doleances.ouvertes}
              </div>
              <div className="text-xs text-muted-foreground">Ouvertes</div>
            </div>
            <div className="text-center p-2 bg-green-500/10 rounded">
              <div className="text-lg font-bold text-green-600">
                {detail.doleances.resolues}
              </div>
              <div className="text-xs text-muted-foreground">Résolues</div>
            </div>
            <div className="text-center p-2 bg-blue-500/10 rounded">
              <div className="text-lg font-bold text-blue-600">
                {detail.doleances.taux_resolution.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Taux</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
