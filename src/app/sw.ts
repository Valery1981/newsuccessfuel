/// <reference lib="webworker" />
/**
 * Service Worker SuccessFuel (APEX-02b — §2 PWA rules.md).
 *
 * Stratégies :
 *  - Précaching : assets statiques (JS, CSS, polices, manifest)
 *  - Runtime : NetworkFirst pour pages, StaleWhileRevalidate pour API GET
 *  - Offline fallback : page `/offline` si demandée
 *
 * Le shell de l'app est mis en cache pour permettre la POS boutique en zone faible.
 */
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
