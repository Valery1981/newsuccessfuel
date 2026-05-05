import { TopArticlesReport } from "@/components/reports/commercial/TopArticlesReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <TopArticlesReport />
    </GerantOnlyGuard>
  );
}
