"use client";

import type { PermissionKey } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

/**
 * APEX 2026-05-15-07 — Conditional render based on session permissions.
 * Source : guide/Guide_Document_SuccessFuel.md §2 + §14 règle 12 (droits granulaires par page/fonctionnalité).
 *
 * - gerant + superadmin → toujours autorisé (`hasPermission` retourne true)
 * - session_gerant → vérifie la clé dans `store.droits`
 * - partenaire → false par défaut (pas de permissions gérant)
 *
 * Usage :
 * ```tsx
 * <PermissionGate permission="traitement_achat_carburant_comptabiliser">
 *   <Button>Comptabiliser</Button>
 * </PermissionGate>
 * ```
 *
 * Avec fallback :
 * ```tsx
 * <PermissionGate permission="..." fallback={<span>Non autorisé</span>}>
 *   <Button>...</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
