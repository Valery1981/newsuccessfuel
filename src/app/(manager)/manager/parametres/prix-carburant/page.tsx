import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";
import { PrixCarburantPage } from "@/components/manager/parametres/PrixCarburantPage";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <PrixCarburantPage />
    </GerantOnlyGuard>
  );
}
