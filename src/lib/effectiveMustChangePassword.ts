import type { User } from "@supabase/supabase-js";

/**
 * Indique si l’utilisateur doit encore passer par la page « premier mot de passe ».
 *
 * - Source principale : `comptes.must_change_password`.
 * - Filet de sécurité : si la ligne `comptes` est restée à `true` (RLS, requête 0 ligne, etc.)
 *   mais que le flux a bien terminé, `user.user_metadata.must_change_password === false`
 *   débloque l’accès (aligné avec ce que renvoie `/auth/v1/user`).
 */
export function effectiveMustChangePassword(
  dbValue: boolean | null | undefined,
  user: User | null | undefined
): boolean {
  const meta = user?.user_metadata?.must_change_password;
  if (meta === false) return false;
  return dbValue === true;
}
