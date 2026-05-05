import { CaProduitReport } from "@/components/reports/commercial/CaProduitReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <CaProduitReport />
    </GerantOnlyGuard>
  );
}
