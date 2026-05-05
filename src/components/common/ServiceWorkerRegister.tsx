"use client";

import { useEffect } from "react";

/**
 * Enregistre le Service Worker (`/sw.js`) au montage côté client.
 * Active le mode PWA offline (APEX-02b finalisation).
 *
 * Désactivé en développement pour éviter les conflits HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("[SW] Registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
