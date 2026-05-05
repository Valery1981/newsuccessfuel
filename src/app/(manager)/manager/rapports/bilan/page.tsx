import { BilanReport } from "@/components/reports/financial/BilanReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <BilanReport />
    </GerantOnlyGuard>
  );
}
