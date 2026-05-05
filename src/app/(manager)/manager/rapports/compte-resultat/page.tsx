import { CompteResultatReport } from "@/components/reports/financial/CompteResultatReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <CompteResultatReport />
    </GerantOnlyGuard>
  );
}
