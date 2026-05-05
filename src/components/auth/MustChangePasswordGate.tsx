"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const FIRST_LOGIN_PREFIX = "/public/first-login";

export function MustChangePasswordGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const compte = useAuthStore((s) => s.compte);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;
    if (compte?.must_change_password !== true) return;
    if (
      pathname === FIRST_LOGIN_PREFIX ||
      pathname.startsWith(`${FIRST_LOGIN_PREFIX}/`)
    ) {
      return;
    }
    router.replace(FIRST_LOGIN_PREFIX);
  }, [isInitialized, compte, pathname, router]);

  return <>{children}</>;
}
