"use client";

import { cn } from "@/lib/utils";

/**
 * Visualisation niveau cuve (§5.5-20 rules.md).
 * Affiche un cylindre vertical avec le niveau rempli proportionnel au volume courant.
 * Code couleur : vert (>30%), orange (10-30%), rouge (<10%).
 */

export interface StockJaugeProps {
  /** Volume courant (litres) */
  volumeCourant: number;
  /** Capacité maximale (litres) */
  capaciteMax: number;
  /** Nom de la cuve (optionnel, pour label) */
  label?: string;
  /** Hauteur en pixels (défaut 120) */
  height?: number;
  className?: string;
}

const formatNum = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export function StockJauge({
  volumeCourant,
  capaciteMax,
  label,
  height = 120,
  className,
}: StockJaugeProps) {
  const ratio =
    capaciteMax > 0
      ? Math.min(Math.max(volumeCourant / capaciteMax, 0), 1)
      : 0;
  const pourcentage = ratio * 100;

  let levelColor = "bg-destructive";
  if (pourcentage > 30) levelColor = "bg-green-500";
  else if (pourcentage > 10) levelColor = "bg-orange-500";

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="meter"
      aria-valuenow={Math.round(pourcentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label ?? "Niveau cuve"} — ${Math.round(pourcentage)} %`}
    >
      <div
        className="relative w-12 rounded-md border bg-muted overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 transition-all",
            levelColor,
          )}
          style={{ height: `${pourcentage}%` }}
        />
      </div>
      <div className="text-center">
        {label && (
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        )}
        <p className="text-sm font-bold tabular-nums">
          {formatNum(volumeCourant)} L
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          / {formatNum(capaciteMax)} L ({pourcentage.toFixed(0)} %)
        </p>
      </div>
    </div>
  );
}
