import { BalanceAgeesFournisseursReport } from "@/components/reports/financial/BalanceAgeesFournisseursReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <BalanceAgeesFournisseursReport />
    </GerantOnlyGuard>
  );
}
