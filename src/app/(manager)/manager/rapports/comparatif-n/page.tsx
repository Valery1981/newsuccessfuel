import { ComparatifNReport } from "@/components/reports/commercial/ComparatifNReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <ComparatifNReport />
    </GerantOnlyGuard>
  );
}
