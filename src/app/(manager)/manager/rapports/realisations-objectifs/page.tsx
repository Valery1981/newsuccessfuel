import { RealisationsObjectifsReport } from "@/components/reports/commercial/RealisationsObjectifsReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <RealisationsObjectifsReport />
    </GerantOnlyGuard>
  );
}
