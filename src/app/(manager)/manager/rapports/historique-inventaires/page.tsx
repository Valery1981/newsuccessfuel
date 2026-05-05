import { HistoriqueInventairesReport } from "@/components/reports/stock/HistoriqueInventairesReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <HistoriqueInventairesReport />
    </GerantOnlyGuard>
  );
}
