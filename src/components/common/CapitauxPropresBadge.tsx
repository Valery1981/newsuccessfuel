"use client";

import { TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Badge Capitaux Propres Nets (§5.5-30 rules.md + §5.7 Module 4).
 * Capitaux propres nets = 101 (Capital) + 120 (Résultat net YTD).
 * Affichage dashboard gérant uniquement (§6.8 — interdit partenaire).
 */

export interface CapitauxPropresBadgeProps {
  /** Capital social (compte 101) */
  capital: number;
  /** Résultat net YTD (compte 120) */
  resultatNet: number;
  currency?: string;
  className?: string;
}

const formatMontant = (n: number): string =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export function CapitauxPropresBadge({
  capital,
  resultatNet,
  currency = "FCFA",
  className,
}: CapitauxPropresBadgeProps) {
  const total = capital + resultatNet;
  const isPositive = total >= 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Capitaux propres nets
          </h3>
          <TrendingUp
            className={cn(
              "h-4 w-4",
              isPositive ? "text-green-600" : "text-destructive",
            )}
            aria-hidden="true"
          />
        </div>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            isPositive ? "text-green-700" : "text-destructive",
          )}
        >
          {formatMontant(total)} {currency}
        </p>
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Capital (101)</span>
            <span className="tabular-nums">{formatMontant(capital)}</span>
          </div>
          <div className="flex justify-between">
            <span>Résultat net YTD (120)</span>
            <span className="tabular-nums">{formatMontant(resultatNet)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
