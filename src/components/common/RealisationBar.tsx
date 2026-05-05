"use client";

import { cn } from "@/lib/utils";

/**
 * Barre de progression objectif vs réalisation (§5.5-26 rules.md).
 * Codes couleur :
 *  - ≥ 100% : vert (objectif atteint)
 *  - 80-99% : orange
 *  - < 80% : rouge
 */

export interface RealisationBarProps {
  label: string;
  realise: number;
  objectif: number;
  /** Unité (ex: "L", "FCFA") */
  unite?: string;
  className?: string;
}

const formatNum = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export function RealisationBar({
  label,
  realise,
  objectif,
  unite,
  className,
}: RealisationBarProps) {
  const ratio = objectif > 0 ? (realise / objectif) * 100 : 0;
  const clampedRatio = Math.min(Math.max(ratio, 0), 100);

  let barColor = "bg-destructive";
  if (ratio >= 100) barColor = "bg-green-500";
  else if (ratio >= 80) barColor = "bg-orange-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between items-baseline text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground text-xs">
          {formatNum(realise)} / {formatNum(objectif)}
          {unite ? ` ${unite}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${clampedRatio}%` }}
          role="progressbar"
          aria-valuenow={Math.round(ratio)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} — ${Math.round(ratio)} %`}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {ratio.toFixed(1)} %
      </p>
    </div>
  );
}
