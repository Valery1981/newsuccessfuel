"use client";

import {
  AlertTriangle,
  Bell,
  ClockAlert,
  PackageX,
  TrendingDown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Liste des alertes dashboard (§5.5-28 rules.md).
 * Tri auto par urgence : rouge (dépassé) > orange (urgent <7j) > vert (normal).
 * Catégories : stocks sous seuil, échéances, écarts carburant, doléances en attente.
 */

export type AlerteSeverite = "critique" | "urgente" | "normale";
export type AlerteType =
  | "stock_seuil"
  | "echeance"
  | "ecart_carburant"
  | "doleance"
  | "autre";

export interface AlerteItem {
  id: string;
  type: AlerteType;
  severite: AlerteSeverite;
  titre: string;
  detail?: string;
  href?: string;
}

export interface AlertesListProps {
  alertes: AlerteItem[];
  className?: string;
  emptyMessage?: string;
  /** Limite affichage (défaut 10) */
  limit?: number;
}

const SEVERITE_ORDER: Record<AlerteSeverite, number> = {
  critique: 0,
  urgente: 1,
  normale: 2,
};

const SEVERITE_CLASS: Record<AlerteSeverite, string> = {
  critique: "border-l-destructive bg-destructive/5",
  urgente: "border-l-orange-500 bg-orange-500/5",
  normale: "border-l-green-500 bg-green-500/5",
};

const TYPE_ICON: Record<AlerteType, typeof Bell> = {
  stock_seuil: PackageX,
  echeance: ClockAlert,
  ecart_carburant: TrendingDown,
  doleance: AlertTriangle,
  autre: Bell,
};

export function AlertesList({
  alertes,
  className,
  emptyMessage = "Aucune alerte",
  limit = 10,
}: AlertesListProps) {
  const sorted = [...alertes].sort(
    (a, b) => SEVERITE_ORDER[a.severite] - SEVERITE_ORDER[b.severite],
  );
  const visible = sorted.slice(0, limit);
  const hidden = sorted.length - visible.length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" aria-hidden="true" />
          Alertes
          {alertes.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({alertes.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            {emptyMessage}
          </p>
        ) : (
          visible.map((a) => {
            const Icon = TYPE_ICON[a.type];
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 px-3 py-2 border-l-4 rounded-r",
                  SEVERITE_CLASS[a.severite],
                )}
              >
                <Icon
                  className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.titre}</p>
                  {a.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.detail}
                    </p>
                  )}
                </div>
              </div>
            );
            return a.href ? (
              <a
                key={a.id}
                href={a.href}
                className="block hover:opacity-80 transition-opacity"
              >
                {content}
              </a>
            ) : (
              <div key={a.id}>{content}</div>
            );
          })
        )}
        {hidden > 0 && (
          <p className="text-xs text-muted-foreground pt-1 text-center">
            +{hidden} autre{hidden > 1 ? "s" : ""} alerte{hidden > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Tri exporté pour tests unitaires */
export function sortAlertesBySeverite<T extends { severite: AlerteSeverite }>(
  alertes: T[],
): T[] {
  return [...alertes].sort(
    (a, b) => SEVERITE_ORDER[a.severite] - SEVERITE_ORDER[b.severite],
  );
}
