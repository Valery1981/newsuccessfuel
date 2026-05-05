"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * Bannière hors-ligne (§5.5-40 rules.md).
 * Détecte la perte de connexion réseau via navigator.onLine et les events
 * 'online' / 'offline'. S'affiche en position fixe haut de page quand hors-ligne.
 */

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const getSnapshot = (): boolean => navigator.onLine;
const getServerSnapshot = (): boolean => true;

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium">
        Mode hors-ligne — vos actions seront enregistrées à la reconnexion
      </span>
    </div>
  );
}
