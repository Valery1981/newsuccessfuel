import { EcartsCarburantReport } from "@/components/reports/stock/EcartsCarburantReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <EcartsCarburantReport />
    </GerantOnlyGuard>
  );
}
