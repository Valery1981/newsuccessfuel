"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Indicateur ∑ Débits = ∑ Crédits (§6.1 rules.md — règle BLOQUANTE).
 *
 * Composant de garde-fou comptable à utiliser dans TOUTE interface
 * produisant une écriture (achat, vente, opération, initialisation).
 *
 * Expose `isBalanced` via props `onBalanceChange` pour permettre au parent
 * de bloquer le bouton "Comptabiliser" tant que la partie double n'est pas respectée.
 */

export interface PartieDoubleCheckProps {
  /** Montants au débit (tous les débits d'une écriture) */
  debits: number[];
  /** Montants au crédit (tous les crédits d'une écriture) */
  credits: number[];
  /** Callback appelé à chaque recalcul avec l'état d'équilibre */
  onBalanceChange?: (isBalanced: boolean, diff: number) => void;
  /** Tolérance d'arrondi monétaire (par défaut 0.01) */
  tolerance?: number;
  /** Devise à afficher (par défaut vide — format neutre) */
  currency?: string;
  /** Classes CSS additionnelles */
  className?: string;
}

const formatMontant = (n: number, currency?: string): string => {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${formatted} ${currency}` : formatted;
};

/**
 * Calcule l'équilibre de la partie double.
 * Exportée pour permettre la vérification côté logique métier (hors rendu).
 */
export function computeBalance(
  debits: number[],
  credits: number[],
  tolerance = 0.01,
): { sumDebits: number; sumCredits: number; diff: number; isBalanced: boolean } {
  const sumDebits = debits.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const sumCredits = credits.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const diff = sumDebits - sumCredits;
  const isBalanced = Math.abs(diff) <= tolerance;
  return { sumDebits, sumCredits, diff, isBalanced };
}

export function PartieDoubleCheck({
  debits,
  credits,
  onBalanceChange,
  tolerance = 0.01,
  currency,
  className,
}: PartieDoubleCheckProps) {
  const { sumDebits, sumCredits, diff, isBalanced } = computeBalance(
    debits,
    credits,
    tolerance,
  );

  // Notifier le parent de l'état courant (optionnel)
  if (onBalanceChange) {
    // Appel inline — le parent utilise useEffect/useMemo selon besoin
    onBalanceChange(isBalanced, diff);
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-2 text-sm",
        isBalanced
          ? "border-green-500/30 bg-green-500/5"
          : "border-destructive/40 bg-destructive/5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">∑ Débits</span>
        <span className="font-mono font-medium tabular-nums">
          {formatMontant(sumDebits, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">∑ Crédits</span>
        <span className="font-mono font-medium tabular-nums">
          {formatMontant(sumCredits, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-medium">Écart</span>
        <span
          className={cn(
            "font-mono font-semibold tabular-nums",
            isBalanced ? "text-green-600" : "text-destructive",
          )}
        >
          {formatMontant(diff, currency)}
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-2 pt-1 text-xs font-medium",
          isBalanced ? "text-green-700" : "text-destructive",
        )}
      >
        {isBalanced ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Partie double équilibrée — écriture valide</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <span>
              Partie double NON équilibrée — Comptabilisation bloquée
            </span>
          </>
        )}
      </div>
    </div>
  );
}
