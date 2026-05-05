import type { AccountType } from "@/stores/authStore";

export function getDashboardPath(type: AccountType): string {
  if (type === "superadmin") return "/admin/dashboard";
  if (type === "gerant" || type === "session_gerant")
    return "/manager/dashboard";
  if (type === "partenaire") return "/partner/dashboard";
  return "/";
}

/** Après authentification : compte invité ou mot de passe provisoire → première connexion. */
export function getPostLoginPath(
  compte: { type: AccountType; must_change_password?: boolean } | null,
): string {
  if (!compte) return "/auth/no-account";
  // Uniquement si la base a explicitement true (évite undefined / chaînes / états fantômes).
  if (compte.must_change_password === true) return "/public/first-login";
  return getDashboardPath(compte.type);
}
