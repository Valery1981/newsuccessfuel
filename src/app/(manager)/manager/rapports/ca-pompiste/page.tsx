import { CaPompisteReport } from "@/components/reports/commercial/CaPompisteReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <CaPompisteReport />
    </GerantOnlyGuard>
  );
}
