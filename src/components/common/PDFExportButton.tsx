"use client";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bouton d'export PDF (§5.5-36 rules.md).
 *
 * Approche : déclenche l'impression du document courant via window.print().
 * L'utilisateur choisit "Enregistrer en PDF" dans la boîte de dialogue.
 * Compatible toutes plateformes, 0 dépendance.
 *
 * Pour une approche server-side avec templates dédiés, migrer vers
 * `@react-pdf/renderer` (APEX futur).
 */

export interface PDFExportButtonProps {
  /** Texte du bouton (par défaut "Exporter PDF") */
  label?: string;
  /** Variante shadcn */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Taille shadcn */
  size?: "default" | "sm" | "lg" | "icon";
  /** Callback exécuté avant l'impression (préparer le DOM) */
  onBeforePrint?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PDFExportButton({
  label = "Exporter PDF",
  variant = "outline",
  size = "sm",
  onBeforePrint,
  className,
  disabled,
}: PDFExportButtonProps) {
  const handleClick = () => {
    onBeforePrint?.();
    // Petit délai pour laisser le DOM se mettre à jour si onBeforePrint en a besoin
    setTimeout(() => window.print(), 50);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      <FileText className="h-4 w-4 mr-1.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
