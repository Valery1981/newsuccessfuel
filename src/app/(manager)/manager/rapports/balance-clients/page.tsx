import { BalanceAgeesClientsReport } from "@/components/reports/financial/BalanceAgeesClientsReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <BalanceAgeesClientsReport />
    </GerantOnlyGuard>
  );
}
