import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";
import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuccessFuel ERP",
  description: "Chaque litre compte",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <ServiceWorkerRegister />
        <OfflineBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
