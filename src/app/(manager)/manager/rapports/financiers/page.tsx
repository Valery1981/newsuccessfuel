import Link from "next/link";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const RAPPORTS_FINANCIERS = [
  { href: "/manager/rapports/grand-livre", label: "Grand Livre" },
  { href: "/manager/rapports/balance", label: "Balance générale" },
  { href: "/manager/rapports/balance-clients", label: "Balance âgée clients" },
  {
    href: "/manager/rapports/balance-fournisseurs",
    label: "Balance âgée fournisseurs",
  },
  { href: "/manager/rapports/bilan", label: "Bilan" },
  { href: "/manager/rapports/compte-resultat", label: "Compte de résultat" },
  { href: "/manager/rapports/tresorerie", label: "Trésorerie" },
  { href: "/manager/rapports/situation-460", label: "Situation 460-xxx" },
  { href: "/manager/rapports/creances-dettes", label: "Créances & dettes" },
];

export default function Page() {
  return (
    <PageContainer>
      <PageHeader
        title="Rapports financiers"
        description="Grand Livre, Balance, Bilan, Compte de Résultat, Trésorerie (§5.1)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RAPPORTS_FINANCIERS.map((r) => (
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
