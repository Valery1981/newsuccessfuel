import { SituationCreancesReport } from "@/components/reports/commercial/SituationCreancesReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <SituationCreancesReport />
    </GerantOnlyGuard>
  );
}
