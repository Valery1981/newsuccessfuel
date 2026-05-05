import { EvolutionPrixAchatReport } from "@/components/reports/stock/EvolutionPrixAchatReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <EvolutionPrixAchatReport />
    </GerantOnlyGuard>
  );
}
