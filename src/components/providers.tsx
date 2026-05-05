"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { MustChangePasswordGate } from "@/components/auth/MustChangePasswordGate";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <MustChangePasswordGate>{children}</MustChangePasswordGate>
          <Toaster richColors position="bottom-right" closeButton />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
