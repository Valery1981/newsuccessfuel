import { GerantOnlyGuard } from "@/components/auth/GerantOnlyGuard";
import { ManagerUsersPage } from "@/components/manager/ManagerUsersPage";

export default function Page() {
  return (
    <GerantOnlyGuard>
      <ManagerUsersPage />
    </GerantOnlyGuard>
  );
}
