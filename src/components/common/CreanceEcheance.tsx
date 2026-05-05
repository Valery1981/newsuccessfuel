"use client";

import { cn } from "@/lib/utils";

/**
 * Badge d'échéance de créance/dette (§5.5-38, §4 rules.md).
 * Code couleur :
 * - Rouge : dépassée (date passée)
 * - Orange : urgente (< 7 jours)
 * - Vert : normale (≥ 7 jours)
 */

export interface CreanceEcheanceProps {
  /** Date d'échéance ISO */
  dateEcheance: string | Date;
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher la date (par défaut true) — sinon juste le badge couleur */
  showDate?: boolean;
}

const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

type Severity = "depasse" | "urgent" | "normal";

export function computeEcheanceSeverity(
  dateEcheance: string | Date,
  now: Date = new Date(),
): Severity {
  const due = new Date(dateEcheance);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "depasse";
  if (diffDays < 7) return "urgent";
  return "normal";
}

const CLASSES: Record<Severity, string> = {
  depasse: "bg-destructive/10 text-destructive border-destructive/40",
  urgent: "bg-orange-500/10 text-orange-600 border-orange-500/40",
  normal: "bg-green-500/10 text-green-600 border-green-500/40",
};

const LABELS: Record<Severity, string> = {
  depasse: "Dépassée",
  urgent: "Urgente",
  normal: "OK",
};

export function CreanceEcheance({
  dateEcheance,
  className,
  showDate = true,
}: CreanceEcheanceProps) {
  const severity = computeEcheanceSeverity(dateEcheance);
  const d = new Date(dateEcheance);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        CLASSES[severity],
        className,
      )}
      aria-label={`Échéance ${LABELS[severity]} — ${formatDate(d)}`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          severity === "depasse" && "bg-destructive",
          severity === "urgent" && "bg-orange-500",
          severity === "normal" && "bg-green-500",
        )}
        aria-hidden="true"
      />
      {showDate ? formatDate(d) : LABELS[severity]}
    </span>
  );
}
