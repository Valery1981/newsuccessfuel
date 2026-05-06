"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Fuel, ShoppingBag } from "lucide-react";
import { partnerKPIService } from "@/services/partnerKPIService";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  danger?: boolean;
}

function KPICard({ title, value, icon, sub, danger }: KPICardProps) {
  return (
    <Card className={danger ? "border-red-500/50 bg-red-500/10" : ""}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              {title}
            </p>
            <p
              className={`text-xl font-bold ${danger ? "text-red-400" : "text-foreground"}`}
            >
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div className="rounded-lg p-2 bg-muted/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PartnerKPICardsProps {
  stationIds: string[];
}

export function PartnerKPICards({ stationIds }: PartnerKPICardsProps) {
  const debutMois = startOfMonth(new Date()).toISOString().split("T")[0];

  // KPI 1: Achats carburant par produit
  const { data: achatsCarburant = [] } = useQuery({
    queryKey: ["partner-achats-carburant", stationIds, debutMois],
    queryFn: () => partnerKPIService.getAchatsCarburantMois(stationIds, debutMois),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // KPI 2: Ventes carburant par produit
  const { data: ventesCarburant = [] } = useQuery({
    queryKey: ["partner-ventes-carburant", stationIds, debutMois],
    queryFn: () => partnerKPIService.getVentesCarburantMois(stationIds, debutMois),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // KPI 3: Achats lubrifiants
  const { data: achatsLubrifiants } = useQuery({
    queryKey: ["partner-achats-lubrifiants", stationIds, debutMois],
    queryFn: () => partnerKPIService.getAchatsLubrifiantsMois(stationIds, debutMois),
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // KPI 4: Doléances ouvertes
  const { data: doleancesOuvertes } = useQuery({
    queryKey: ["partner-doleances-ouvertes", stationIds],
    queryFn: () => partnerKPIService.getDoleancesOuvertes(stationIds),
    enabled: stationIds.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const totalAchatsCarburant = achatsCarburant.reduce(
    (sum, a) => sum + a.volume_litres,
    0,
  );
  const totalVentesCarburant = ventesCarburant.reduce(
    (sum, v) => sum + v.volume_litres,
    0,
  );
  const nbDoleances = doleancesOuvertes?.count ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Total achats carburant */}
      <KPICard
        title="Achat Carburant (mois)"
        value={`${totalAchatsCarburant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`}
        icon={<Fuel className="w-5 h-5 text-blue-500" />}
        sub="Depuis début du mois"
      />

      {/* KPI 2: Total ventes carburant */}
      <KPICard
        title="Vente Carburant (mois)"
        value={`${totalVentesCarburant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`}
        icon={<Fuel className="w-5 h-5 text-green-500" />}
        sub="Depuis début du mois"
      />

      {/* KPI 3: Achats lubrifiants */}
      <KPICard
        title="Achat Lubrifiants (mois)"
        value={`${(achatsLubrifiants?.volume_litres ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`}
        icon={<ShoppingBag className="w-5 h-5 text-amber-500" />}
        sub="Depuis début du mois"
      />

      {/* KPI 4: Doléances ouvertes */}
      <KPICard
        title="Doléances ouvertes"
        value={nbDoleances.toString()}
        icon={nbDoleances > 0 ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
        danger={nbDoleances > 0}
      />
    </div>
  );
}
