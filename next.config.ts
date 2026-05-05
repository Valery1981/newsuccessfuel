import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Serwist (PWA) — APEX-02b.
 * Génère un service worker à partir de `src/app/sw.ts`.
 *
 * NOTE TEMPORAIRE : `@serwist/next` v9.5 n'est pas encore compatible avec
 * Next.js 16 + Turbopack (cf. https://github.com/serwist/serwist/issues/54).
 * → `disable: true` jusqu'à ce que `@serwist/turbopack` soit stable.
 * Pour réactiver : passer `disable: process.env.NODE_ENV === "development"`.
 *
 * Le fichier `src/app/sw.ts` est en place et compilable — ready-to-go.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: true,
});

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

export default withSerwist(withNextIntl(nextConfig));
