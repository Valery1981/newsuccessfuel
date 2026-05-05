"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Carte KPI avec tendance (§5.5-25 rules.md).
 * Affiche un titre, une valeur principale, et optionnellement une variation (%) avec flèche.
 */

export interface KPICardProps {
  title: string;
  value: string | number;
  /** Variation en % (positif = hausse, négatif = baisse) */
  trend?: number;
  /** Libellé de la période comparée (ex: "vs mois dernier") */
  trendLabel?: string;
  /** Icône lucide optionnelle */
  icon?: LucideIcon;
  className?: string;
}

const formatTrend = (t: number): string =>
  `${t > 0 ? "+" : ""}${t.toFixed(1)}%`;

export function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  className,
}: KPICardProps) {
  const hasTrend = typeof trend === "number" && !Number.isNaN(trend);
  const isPositive = hasTrend && trend! > 0;
  const isNegative = hasTrend && trend! < 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          {Icon && (
            <Icon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hasTrend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive && "text-green-600",
              isNegative && "text-destructive",
              !isPositive && !isNegative && "text-muted-foreground",
            )}
          >
            {isPositive && (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            )}
            {isNegative && (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{formatTrend(trend!)}</span>
            {trendLabel && (
              <span className="text-muted-foreground font-normal">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
