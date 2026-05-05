import { ArticlesSeuhlAlertReport } from "@/components/reports/stock/ArticlesSeuhlAlertReport";
import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <ArticlesSeuhlAlertReport />
    </GerantOnlyGuard>
  );
}
