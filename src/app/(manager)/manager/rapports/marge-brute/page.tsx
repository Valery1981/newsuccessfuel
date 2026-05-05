import { MargeBruteReport } from "@/components/reports/commercial/MargeBruteReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <MargeBruteReport />
    </GerantOnlyGuard>
  );
}
