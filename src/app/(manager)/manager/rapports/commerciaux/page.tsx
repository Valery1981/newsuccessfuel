import Link from "next/link";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const RAPPORTS_COMMERCIAUX = [
  { href: "/manager/rapports/ca-journalier", label: "CA Journalier" },
  { href: "/manager/rapports/ca-pompiste", label: "CA par pompiste" },
  { href: "/manager/rapports/ca-produit", label: "CA par produit" },
  { href: "/manager/rapports/ventes-carburant", label: "Ventes carburant" },
  { href: "/manager/rapports/ventes-boutique", label: "Ventes boutique" },
  { href: "/manager/rapports/bilan-shifts", label: "Bilan shifts" },
  {
    href: "/manager/rapports/realisations-objectifs",
    label: "Réalisations vs Objectifs",
  },
  { href: "/manager/rapports/marge-brute", label: "Marge brute" },
  { href: "/manager/rapports/comparatif-n", label: "Comparatif N-1" },
  { href: "/manager/rapports/top-articles", label: "Top articles" },
  {
    href: "/manager/rapports/situation-creances",
    label: "Situation créances",
  },
];

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        title="Rapports commerciaux"
        description="CA, ventes, shifts, objectifs, marges (§5.1)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RAPPORTS_COMMERCIAUX.map((r) => (
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
