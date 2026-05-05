import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";
import { ManagerCompanyPage } from "@/components/manager/ManagerCompanyPage";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <ManagerCompanyPage />
    </GerantOnlyGuard>
  );
}
