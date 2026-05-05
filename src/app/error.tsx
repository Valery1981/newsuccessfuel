"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">500</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Erreur serveur
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Réessayer</Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
