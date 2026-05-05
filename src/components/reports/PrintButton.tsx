"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
  onClick?: () => void;
}

/**
 * Bouton d'impression réutilisable.
 * Par défaut appelle window.print() pour les rapports tabulaires.
 * Passer `onClick` pour les documents officiels (shift, BL, ticket).
 * Toujours masqué à l'impression (classe `no-print`).
 */
export function PrintButton({ label = "Imprimer PDF", onClick }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="no-print gap-1.5 text-xs"
      onClick={onClick ?? (() => window.print())}
    >
      <Printer className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
