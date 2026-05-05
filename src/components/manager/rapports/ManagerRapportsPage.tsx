"use client";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  DollarSign,
  FileText,
  Fuel,
  Package,
  Scale,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const rapportCategories = [
  {
    id: "ventes",
    label: "Ventes",
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-50",
    rapports: [
      {
        id: "ventes-carburant",
        label: "Ventes carburant",
        href: "/manager/rapports/ventes-carburant",
      },
      {
        id: "ventes-boutique",
        label: "Ventes boutique",
        href: "/manager/rapports/ventes-boutique",
      },
      {
        id: "ca-journalier",
        label: "CA journalier",
        href: "/manager/rapports/ca-journalier",
      },
      {
        id: "bilan-shifts",
        label: "Bilan des shifts",
        href: "/manager/rapports/bilan-shifts",
      },
    ],
  },
  {
    id: "stocks",
    label: "Stocks",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50",
    rapports: [
      {
        id: "stock-carburant",
        label: "Stock carburant",
        href: "/manager/rapports/stock-carburant",
      },
      {
        id: "stock-boutique",
        label: "Stock boutique",
        href: "/manager/rapports/stock-boutique",
      },
      {
        id: "mouvements-stock",
        label: "Mouvements de stock",
        href: "/manager/rapports/mouvements-stock",
      },
    ],
  },
  {
    id: "comptabilite",
    label: "Comptabilité",
    icon: DollarSign,
    color: "text-purple-600",
    bg: "bg-purple-50",
    rapports: [
      {
        id: "grand-livre",
        label: "Grand livre",
        href: "/manager/rapports/grand-livre",
      },
      {
        id: "balance",
        label: "Balance des comptes",
        href: "/manager/rapports/balance",
      },
      {
        id: "tresorerie",
        label: "Trésorerie",
        href: "/manager/rapports/tresorerie",
      },
      {
        id: "creances-dettes",
        label: "Créances & Dettes",
        href: "/manager/rapports/creances-dettes",
      },
    ],
  },
  {
    id: "carburants",
    label: "Carburants",
    icon: Fuel,
    color: "text-amber-600",
    bg: "bg-amber-50",
    rapports: [
      {
        id: "consommation",
        label: "Consommation par station",
        href: "/manager/rapports/consommation",
      },
      {
        id: "achats-carburant",
        label: "Achats carburant",
        href: "/manager/rapports/achats-carburant",
      },
      { id: "cmup", label: "Évolution CMUP", href: "/manager/rapports/cmup" },
    ],
  },
  {
    id: "financiers",
    label: "Financiers",
    icon: Scale,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    rapports: [
      { id: "bilan", label: "Bilan", href: "/manager/rapports/bilan" },
      {
        id: "compte-resultat",
        label: "Compte de résultat",
        href: "/manager/rapports/compte-resultat",
      },
      {
        id: "balance-fournisseurs",
        label: "Balance âgée fournisseurs",
        href: "/manager/rapports/balance-fournisseurs",
      },
      {
        id: "balance-clients",
        label: "Balance âgée clients",
        href: "/manager/rapports/balance-clients",
      },
      {
        id: "situation-460",
        label: "Situation 460 — Responsabilité employés",
        href: "/manager/rapports/situation-460",
      },
    ],
  },
  {
    id: "commerciaux",
    label: "Commerciaux",
    icon: ShoppingBag,
    color: "text-violet-600",
    bg: "bg-violet-50",
    rapports: [
      {
        id: "ca-produit",
        label: "CA par produit / famille",
        href: "/manager/rapports/ca-produit",
      },
      {
        id: "ca-pompiste",
        label: "CA par pompiste / vendeur",
        href: "/manager/rapports/ca-pompiste",
      },
      {
        id: "comparatif-n",
        label: "Comparatif N vs N-1",
        href: "/manager/rapports/comparatif-n",
      },
      {
        id: "realisations-objectifs",
        label: "Réalisations vs Objectifs",
        href: "/manager/rapports/realisations-objectifs",
      },
      {
        id: "top-articles",
        label: "Top articles vendus",
        href: "/manager/rapports/top-articles",
      },
      {
        id: "marge-brute",
        label: "Marge brute par produit",
        href: "/manager/rapports/marge-brute",
      },
      {
        id: "situation-creances",
        label: "Situation créances clients",
        href: "/manager/rapports/situation-creances",
      },
    ],
  },
  {
    id: "stocks-avances",
    label: "Stocks avancés",
    icon: Boxes,
    color: "text-teal-600",
    bg: "bg-teal-50",
    rapports: [
      {
        id: "articles-alerte",
        label: "Articles sous seuil / en rupture",
        href: "/manager/rapports/articles-alerte",
      },
      {
        id: "ecarts-carburant",
        label: "Écarts carburant par station",
        href: "/manager/rapports/ecarts-carburant",
      },
      {
        id: "historique-inventaires",
        label: "Historique inventaires",
        href: "/manager/rapports/historique-inventaires",
      },
      {
        id: "faible-rotation",
        label: "Articles à faible rotation",
        href: "/manager/rapports/faible-rotation",
      },
      {
        id: "evolution-prix",
        label: "Évolution prix d\u2019achat",
        href: "/manager/rapports/evolution-prix",
      },
      {
        id: "suivi-cuves",
        label: "Suivi cuves — historique niveaux",
        href: "/manager/rapports/suivi-cuves",
      },
    ],
  },
];

export function ManagerRapportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Rapports"
        description="Consultez les rapports et analyses de votre activité"
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {rapportCategories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className={`${category.bg} pb-3`}>
              <CardTitle
                className={`flex items-center gap-2 text-base ${category.color}`}
              >
                <category.icon className="w-5 h-5" />
                {category.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-4">
              <ul className="space-y-1">
                {category.rapports.map((rapport) => (
                  <li key={rapport.id}>
                    <Link href={rapport.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-between text-sm h-8 px-2"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          {rapport.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card className="bg-muted/30">
          <CardContent className="pt-6 pb-6 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Sélectionnez un rapport ci-dessus pour l&apos;afficher
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
