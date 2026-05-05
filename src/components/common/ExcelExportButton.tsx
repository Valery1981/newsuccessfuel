"use client";

import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportXls } from "@/lib/exportXls";

/**
 * Bouton d'export Excel (§5.5-37 rules.md).
 *
 * Génère un fichier .xls (HTML Spreadsheet) ouvrable nativement dans Excel,
 * LibreOffice et Numbers. Sans dépendance externe.
 */

export interface ExcelExportButtonProps {
  /** Données à exporter (tableau d'objets) */
  data: Record<string, unknown>[];
  /** Nom du fichier sans extension */
  filename: string;
  /** En-têtes de colonnes (optionnel — déduits de la 1ère ligne sinon) */
  headers?: string[];
  /** Nom de la feuille Excel */
  sheetName?: string;
  /** Texte du bouton */
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function ExcelExportButton({
  data,
  filename,
  headers,
  sheetName,
  label = "Exporter Excel",
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: ExcelExportButtonProps) {
  const handleClick = () => {
    exportXls(data, { filename, headers, sheetName });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || data.length === 0}
      className={className}
    >
      <FileSpreadsheet className="h-4 w-4 mr-1.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
