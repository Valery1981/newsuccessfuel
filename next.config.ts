import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * PWA — APEX-02b finalisation.
 *
 * Approche manuelle (Next.js 16 + Turbopack incompatibles avec @serwist/next) :
 *  - Service Worker statique servi depuis `public/sw.js`
 *  - Enregistrement côté client via `<ServiceWorkerRegister />` dans le layout
 *
 * Avantages : 0 dépendance build, compatible Turbopack, déterministe.
 * Limitation : pas de précaching auto du build manifest — runtime cache uniquement.
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // Enable server actions
  },
};

export default withNextIntl(nextConfig);
