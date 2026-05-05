import { Situation460Report } from "@/components/reports/financial/Situation460Report";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <Situation460Report />
    </GerantOnlyGuard>
  );
}
