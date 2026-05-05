"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Fuel, MapPin, Phone } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { stationService } from "@/services/stationService";

export function ManagerStationsPage() {
  const { entreprise } = useAuthStore();

  const { data: stations, isLoading } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () => stationService.getStationsByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id,
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Mes Stations"
        description="Gérez vos stations-service"
      />

      {!stations || stations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune station"
          description="Vous n'avez pas encore de station configurée."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <Card key={station.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{station.nom}</CardTitle>
                  <Badge
                    variant={station.status === "validee" ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {station.status === "validee" ? "validee" : station.status === "en_attente" ? "En attente" : station.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                {station.adresse && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{station.adresse}</span>
                  </div>
                )}
                {station.telephone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{station.telephone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {[
                      station.has_boutique && "Boutique",
                      station.has_lavage && "Carwash",
                      station.has_lubrifiants && "Lubrifiants",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Station carburant"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
