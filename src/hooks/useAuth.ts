"use client";

import type { PermissionKey } from "@/lib/permissions";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    store.setLoading(true);
    try {
      await authService.login(email, password);
      toast.success("Connexion réussie");
      // Router will be handled by auth state change
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur de connexion";
      toast.error(message);
      throw error;
    } finally {
      store.setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      store.reset();
      router.push("/public/login");
      toast.success("Déconnexion réussie");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la déconnexion";
      toast.error(message);
    }
  };

  const redirectAfterLogin = () => {
    const type = store.compte?.type;
    if (type === "superadmin") router.push("/admin/dashboard");
    else if (type === "gerant") router.push("/manager/dashboard");
    else if (type === "session_gerant") router.push("/manager/dashboard");
    else if (type === "partenaire") router.push("/partner/dashboard");
    else router.push("/");
  };

  /**
   * Vérifie si l'utilisateur connecté possède un droit spécifique.
   * - Pour un gérant ou superadmin : toujours true.
   * - Pour une session_gerant : vérifie le champ droits du store.
   */
  const hasPermission = (key: PermissionKey): boolean => {
    const type = store.compte?.type;
    if (type === "gerant" || type === "superadmin") return true;
    if (type === "session_gerant") {
      const d = store.droits as Record<string, boolean | undefined> | null;
      return d?.[key as string] === true;
    }
    return false;
  };

  return {
    user: store.user,
    session: store.session,
    compte: store.compte,
    entreprise: store.entreprise,
    droits: store.droits,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: store.isAuthenticated(),
    isSuperAdmin: store.isSuperAdmin(),
    isGerant: store.isGerant(),
    isPartenaire: store.isPartenaire(),
    isSession: store.isSession(),
    hasPermission,
    login,
    logout,
    redirectAfterLogin,
  };
}
