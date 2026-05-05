"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

/**
 * Blocks session employees from accessing gérant-only pages
 * (e.g. /manager/users, /manager/initialisation, /manager/parametres).
 * Redirects to /manager/dashboard with an access-denied indicator.
 */
export function GerantOnlyGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const compte = useAuthStore((s) => s.compte);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;
    if (compte?.type === "session_gerant") {
      router.replace("/manager/dashboard?accès=refusé");
    }
  }, [isInitialized, compte, router]);

  if (!isInitialized) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (compte?.type === "session_gerant") {
    return null;
  }

  return <>{children}</>;
}
