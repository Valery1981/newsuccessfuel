import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";
import { CompanyInitialisationPage } from "@/components/manager/initialisation/CompanyInitialisationPage";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <CompanyInitialisationPage />
    </GerantOnlyGuard>
  );
}
