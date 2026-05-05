import { SuiviCuvesReport } from "@/components/reports/stock/SuiviCuvesReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <SuiviCuvesReport />
    </GerantOnlyGuard>
  );
}
