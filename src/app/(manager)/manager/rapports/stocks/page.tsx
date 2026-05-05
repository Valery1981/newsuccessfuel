import Link from "next/link";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const RAPPORTS_STOCKS = [
  { href: "/manager/rapports/stock-carburant", label: "État stock carburant" },
  { href: "/manager/rapports/stock-boutique", label: "État stock boutique" },
  { href: "/manager/rapports/mouvements-stock", label: "Mouvements de stock" },
  {
    href: "/manager/rapports/historique-inventaires",
    label: "Historique inventaires",
  },
  { href: "/manager/rapports/cmup", label: "CMUP" },
  { href: "/manager/rapports/suivi-cuves", label: "Suivi cuves" },
  { href: "/manager/rapports/ecarts-carburant", label: "Écarts carburant" },
  { href: "/manager/rapports/articles-alerte", label: "Articles en alerte" },
  { href: "/manager/rapports/faible-rotation", label: "Articles faible rotation" },
  { href: "/manager/rapports/evolution-prix", label: "Évolution prix d'achat" },
  { href: "/manager/rapports/consommation", label: "Consommation" },
  { href: "/manager/rapports/achats-carburant", label: "Achats carburant" },
];

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        title="Rapports stocks"
        description="États, mouvements, inventaires, écarts, alertes (§5.1)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RAPPORTS_STOCKS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                <p className="font-medium">{r.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
