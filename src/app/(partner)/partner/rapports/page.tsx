"use client";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Droplets,
  Fuel,
  Package,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const rapports = [
  {
    id: "volumes",
    label: "Volumes vendus réseau",
    description: "Litres vendus par station et produit",
    href: "/partner/rapports/volumes",
    icon: Fuel,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "stocks",
    label: "Stocks carburant",
    description: "Niveaux actuels par cuve et station",
    href: "/partner/rapports/stocks",
    icon: Droplets,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    id: "achats",
    label: "Achats carburant",
    description: "Volumes commandés et livrés",
    href: "/partner/rapports/achats",
    icon: Package,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    id: "ecarts-carburant",
    label: "Écarts carburant",
    description: "Récap inventaires en litres",
    href: "/partner/rapports/ecarts-carburant",
    icon: BarChart3,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    id: "realisations",
    label: "Réalisations vs Objectifs",
    description: "Volumes + CA boutique vs cibles",
    href: "/partner/rapports/realisations",
    icon: Target,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: "ca-boutique",
    label: "CA Boutique réseau",
    description: "Chiffre d'affaires boutique sans marges",
    href: "/partner/rapports/ca-boutique",
    icon: ShoppingBag,
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    id: "comparatif-stations",
    label: "Comparatif inter-stations",
    description: "Ranking performance du réseau",
    href: "/partner/rapports/comparatif-stations",
    icon: TrendingUp,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    id: "stats-doleances",
    label: "Statistiques doléances",
    description: "Délais, types incidents, taux résolution",
    href: "/partner/rapports/stats-doleances",
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

export default function PartnerRapportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Rapports"
        description="Données opérationnelles réseau — volumes, stocks, doléances"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {rapports.map((r) => (
          <Link key={r.id} href={r.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-lg ${r.bg} flex items-center justify-center`}>
                    <r.icon className={`w-5 h-5 ${r.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">{r.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
